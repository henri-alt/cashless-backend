import { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { initClient, query } from "../providers";
import {
  GetTopUpsQuery,
  GetTopUpsResponse,
  TopUp,
  TopUpRequest,
} from "../types";
import { topUpsModel, paginationModel } from "../models";
import { getCurrencies } from "../utils/cacheHandlers";
import { type ExplanationType } from "../models/paginationModel";

export async function topUpController(req: Request, res: Response) {
  //#region TOP UP
  let client;
  const company: string = res.locals?.company;
  const memberName: string = res.locals?.memberName;
  const memberId: string = res.locals.memberId;
  const eventId: string = res.locals.eventId;
  const userClass: number = res.locals?.userClass;

  const {
    amount,
    scanId,
    ticketId,
    topUpDate,
    memberName: proppedName,
    memberId: proppedMember,
    eventId: proppedEventId,
    topUpCurrency,
  }: TopUpRequest = req.body;

  if (!eventId && !proppedEventId) {
    res
      .status(400)
      .json("Bad request! This transaction is not linked to any event");
    return;
  }

  if (!amount && !scanId && !ticketId && !topUpDate) {
    res.status(400).json("Bad request! Empty body");
    return;
  }

  if (userClass !== +process.env.ADMIN_CLASS) {
    if (Number(amount) <= 0 || isNaN(+amount)) {
      res.status(403).json("Bad request! Amount should be greater than 0");
      return;
    }
  } else {
    /**
     * admin is allowed to make a top up with whatever amount
     * in order to correct a balance
     */
    if (!amount || isNaN(+amount)) {
      res.status(403).json("Bad request! Invalid amount");
      return;
    }
  }

  if (!scanId && !ticketId) {
    res.status(403).json("Bad request! scanId or ticketId are required!");
    return;
  }

  if (!topUpDate) {
    res.status(403).json("Bad request! Missing required topUpDate");
    return;
  }

  if (!topUpCurrency) {
    res.status(403).json("Bad request! Missing currency");
    return;
  }

  const eventCurrencies = getCurrencies(
    userClass === +process.env.ADMIN_CLASS ? proppedEventId : eventId
  );

  if (!eventCurrencies) {
    res.status(403).json("Event currencies not found!");
    return;
  }

  const rate = Number(eventCurrencies?.[topUpCurrency]?.["rate"]);
  if (!rate || Math.abs(rate) === Infinity) {
    res.status(403).json("Bad request! Currency not found!");
    return;
  }

  const eventDefaultCurrency = Object.values(eventCurrencies).find(
    (e) => e.isDefault
  );
  if (!eventDefaultCurrency) {
    res.status(403).json("Event default currency not found!");
    return;
  }

  try {
    client = await initClient();

    await client.query("BEGIN");
    const balanceRes = await client.query<{
      scanId: string;
      isBonus: boolean;
      balance: number;
      eventCurrency: string;
    }>(
      topUpsModel.getBalanceForTopUpModel({
        company,
        scanId,
        ticketId,
      })
    );

    if (!balanceRes.rowCount) {
      res.status(404).json("Balance was not found");
      await client.query("ROLLBACK");
      return;
    }

    const [balance] = balanceRes.rows;
    let isCorrectBalance = false;

    if (userClass === +process.env.ADMIN_CLASS && !balance.isBonus) {
      /**
       * If the admin intends correct a balance that is not bonus,
       * they must always send a memberId
       */
      if (!proppedMember || !proppedName) {
        res
          .status(403)
          .json("Admin can not top up balance that are not bonus!");
        await client.query("ROLLBACK");
        return;
      }
      isCorrectBalance = true;
    }

    if (Number(balance.balance) + Number(amount || 0) * Number(rate || 1) < 0) {
      res
        .status(403)
        .json("Invalid operation, subtraction is greater than current balance");
      await client.query("ROLLBACK");
      return;
    }

    if (userClass !== +process.env.ADMIN_CLASS && balance.isBonus) {
      res.status(403).json("Cannot top up bonus balance!");
      await client.query("ROLLBACK");
      return;
    }

    let topUpTotalAmount = Number(amount || 0);

    if (balance.eventCurrency !== eventDefaultCurrency.currency) {
      if (!(balance.eventCurrency in eventCurrencies)) {
        res
          .status(403)
          .json(
            `Missing conversion rate for currency: ${balance.eventCurrency}! Please add currency rate and try again`
          );

        return;
      }
    }

    /**
     * we need to see whether the top up currency is the same as the
     * balance currency, in that case we don't need to make any modifications
     * in other cases, we need to firstly convert the amount to the default
     * currency (my multiplication) and then divide by the balance currency rate
     */
    if (balance.eventCurrency !== topUpCurrency) {
      topUpTotalAmount = topUpTotalAmount * Number(rate || 1); // this is in default
      topUpTotalAmount =
        topUpTotalAmount /
        Number(eventCurrencies?.[balance.eventCurrency]?.rate || Infinity); // this is in balance currency
    }

    await client.query(
      topUpsModel.topUpModel(
        {
          amount: topUpTotalAmount,
          scanId: balance.scanId,
          ticketId,
          topUpDate,
        },
        company
      )
    );
    await client.query(
      topUpsModel.createTopUp({
        company,
        eventId:
          userClass === +process.env.ADMIN_CLASS ? proppedEventId : eventId,
        memberId: isCorrectBalance ? proppedMember : memberId,
        memberName: isCorrectBalance ? proppedName : memberName,
        scanId: balance.scanId,
        topUpAmount: Number(amount),
        topUpId: uuid(),
        topUpDate,
        topUpCurrency,
      })
    );
    await client.query("COMMIT");

    res.status(200).send();
  } catch (err) {
    console.log("Top up error:\n\n", err);

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

export async function getTopUpsController(req: Request, res: Response) {
  //#region GET TOP UPS
  const company: string = res.locals?.company;

  const {
    fromDate,
    gtAmount,
    lastId,
    ltAmount,
    memberId,
    pageSize = 30,
    scanId,
    toDate,
    eventId,
    topUpCurrency,
    page,
  } = req.query as unknown as GetTopUpsQuery;

  if (!eventId) {
    res.status(400).json("Bad request! Missing required query 'eventId'");
    return;
  }

  try {
    const getQuery = topUpsModel.getTopUpsModel({
      company,
      fromDate,
      gtAmount,
      lastId,
      ltAmount,
      memberId,
      pageSize,
      scanId,
      toDate,
      eventId,
      topUpCurrency,
      page,
    });

    const [explanation, queryRes] = await Promise.all([
      query<ExplanationType>(paginationModel.explain(getQuery)),
      query<TopUp>(getQuery),
    ]);

    const rowNum = paginationModel.count(explanation.rows);

    const response: GetTopUpsResponse = {
      pagination: {
        page: Number(page) || 0,
        pages: Math.ceil(rowNum / Number(pageSize)),
        pageSize: Number(pageSize),
        totalRows: rowNum,
        nextPageParam: queryRes.rows.at(-1)?.topUpId,
        prevPageParam: queryRes.rows.at(0)?.topUpId,
      },
      topUps: queryRes.rows,
    };

    res.status(200).send(response);
  } catch (err) {
    res.status(500).send(err);
  }
}
