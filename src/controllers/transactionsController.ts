import { cacheHandlers } from "../utils";
import { Request, Response } from "express";
import { initClient, query } from "../providers";
import { balancesModel, transactionsModel, paginationModel } from "../models";
import {
  BalanceType,
  CreateTransactionRequest,
  GetTransactionsQuery,
  GetTransactionsResponse,
  ItemConfig,
  TransactionType,
} from "../types";
import { type ExplanationType } from "../models/paginationModel";

type TransactionItem = {
  itemName: string;
  quantity: number;
  amount: number;
};

export async function getTransactionsController(req: Request, res: Response) {
  //#region GET TRANSACTIONS
  const company = res.locals?.company;

  const {
    eventId,
    fromDate,
    itemCategory,
    itemName,
    lastId,
    memberId,
    pageSize = 30,
    toDate,
    page,
    scanId,
  } = req.query as unknown as GetTransactionsQuery;

  try {
    const getQuery = transactionsModel.getPaginatedTransactionsController({
      company,
      eventId,
      fromDate,
      lastId,
      pageSize,
      toDate,
      itemCategory,
      itemName,
      memberId,
      page,
      scanId,
    });

    const [explanation, queryRes] = await Promise.all([
      query<ExplanationType>(paginationModel.explain(getQuery)),
      query<TransactionType>(getQuery),
    ]);

    const rowNum = paginationModel.count(explanation.rows);

    const response: GetTransactionsResponse = {
      pagination: {
        page: Number(page) || 0,
        pages: Math.ceil(rowNum / Number(pageSize)),
        pageSize: Number(pageSize),
        totalRows: rowNum,
        nextPageParam: queryRes.rows.at(-1)?.transactionId,
        prevPageParam: queryRes.rows.at(0)?.transactionId,
      },
      transactions: queryRes.rows,
    };

    res.status(200).send(response);
  } catch (err) {
    console.log("Get transactions error:\n\n", err);
    res.status(500).send(err);
  }
}

export async function createTransactionController(req: Request, res: Response) {
  //#region CREATE TRANSACTION
  let client;
  const eventId: string = res?.locals?.eventId;
  const memberId: string = res.locals?.memberId;
  const company: string = res.locals?.company;
  const memberName: string = res.locals?.memberName;

  const { scanId, transactionItems }: CreateTransactionRequest = req.body;
  const eventItems = cacheHandlers.getItems(eventId);
  const eventCurrencies = cacheHandlers.getCurrencies(eventId);

  if (
    transactionItems.some(
      ({ quantity, itemName }) => isNaN(+quantity) || !itemName
    )
  ) {
    res.status(400).json("Invalid transaction items!");
    return;
  }

  if (transactionItems.some(({ quantity }) => !+quantity || +quantity < 0)) {
    res.status(400).json("Invalid transaction! Invalid quantity");
    return;
  }

  if (!eventCurrencies) {
    res.status(403).json("Event currencies not found");
    return;
  }

  const defaultCurrency = Object.values(eventCurrencies).find(
    (e) => e.isDefault
  );
  if (!defaultCurrency) {
    res.status(403).json("Event default currency not found");
    return;
  }

  try {
    client = await initClient();

    await client.query("BEGIN");

    const balanceRes = await client.query<
      Pick<
        BalanceType,
        | "balance"
        | "eventId"
        | "isFidelityCard"
        | "memberId"
        | "balanceId"
        | "scanId"
        | "isBonus"
        | "activationCurrency"
        | "eventCreated"
        | "eventCurrency"
      >
    >(balancesModel.getScanBalanceModel(scanId, company));

    if (!balanceRes.rowCount) {
      res.status(403).json("Balance not found!");
      await client.query("ROLLBACK");
      return;
    }

    const [balance] = balanceRes.rows;

    if (balance.isBonus) {
      for (const item of transactionItems) {
        if (!eventItems[item.itemName]["bonusAvailable"]) {
          res
            .status(403)
            .json(`${item.itemName} can't be purchased by bonus balances`);
          await client.query("ROLLBACK");
          return;
        }
      }
    }

    if (balance.eventCreated !== eventId && !balance.isFidelityCard) {
      res.status(403).json("This tag is not registered in this event");
      await client.query("ROLLBACK");
      return;
    }

    let amountKey: keyof ItemConfig = balance?.memberId
      ? "staffPrice"
      : "itemPrice";

    /**
     * we need to compare the balance initial currency to the current event's currency
     * if the balance was created in an event where the default is EUR, this means that the number
     * representing the balance in the object is also in EUR. In order to check whether
     * the balance has the sufficient amount for the purchase or what amount we should remove
     * from the balance after the purchase, we need to use the conversion rates and force the admin
     * to add the specific conversion rate for the balance. This is a problem in fidelity cards
     * since those have the ability to go to multiple events (even internationally as long as it's the same company)
     */

    let transactionTotal = 0,
      items: TransactionItem[] = [];

    for (const item of transactionItems) {
      if (!eventItems[item.itemName]) {
        continue;
      }

      const amount =
        Number(eventItems?.[item.itemName]?.[amountKey] || 0) *
        Number(item.quantity);

      transactionTotal += amount;
      items.push({
        ...item,
        amount,
      });
    }

    if (balance.eventCurrency !== defaultCurrency.currency) {
      if (!(balance.eventCurrency in eventCurrencies)) {
        res
          .status(403)
          .json(
            `Missing conversion rate for currency: ${balance.eventCurrency}! Please add currency rate and try again`
          );

        return;
      }

      // we need to convert the amount (expressed in default currency)
      // into the target currency, we need to divide to get teh result
      transactionTotal =
        transactionTotal /
        (Number(eventCurrencies?.[balance.eventCurrency]?.rate) || Infinity);
    }

    if (balance.balance < transactionTotal) {
      res.status(403).json("Insufficient amount!");
      await client.query("ROLLBACK");
      return;
    }

    await client.query(
      transactionsModel.transactionBalanceModel(
        balance.scanId,
        transactionTotal,
        company
      )
    );
    await client.query(
      transactionsModel.createTransactionModel({
        scanId: balance.scanId,
        transactionItems: items,
        eventId,
        transactionDate: new Date().toISOString(),
        company,
        memberId,
        memberName,
      })
    );

    if (balance.isFidelityCard) {
      client.query(
        transactionsModel.addTotalAmountToClientModel(
          balance.balanceId,
          transactionTotal,
          company
        )
      );
    }
    await client.query("COMMIT");

    res.status(200).send();
  } catch (err) {
    console.log("Create transaction error:\n\n", err);
    if (client) {
      await client.query("ROLLBACK");
    }

    res.status(500).send(err);
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function deleteTransactionsController(
  req: Request,
  res: Response
) {
  //#region DELETE TRANSACTION
  const company: string = res.locals?.company;
  const { id } = req.params;

  try {
    await query(transactionsModel.deleteTransactionsModel(id, company));

    res.status(200).send();
  } catch (err) {
    console.log("Delete transactions error:\n\n", err);
    res.status(500).send(err);
  }
}
