import { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { query } from "../providers";
import { analyticsModel, standsModel } from "../models";
import { EventAnalytic, StandConfigType } from "../types";

type ClientAnalytic = {
  totalRevenue: number;
  totalTransactions: number;
  totalItemsSold: number;
  averageExpense: number;
};

type StaffAnalytic = {
  staffTransactionsTotal: number;
  staffTransactions: number;
  itemsTakenFromStaff: number;
};

type TopUpTotal = {
  topUps: number;
  amount: number;
};

type Purchase = {
  scanId: string;
  transactionDate: string;
  amount: number;
  items: string[];
  quantity: number;
  memberId: string;
  memberName: string;
};

type ItemAnalytic = {
  quantity: number;
  amount: number;
  itemName: string;
};

type ClientTotal = {
  amount: number;
  quantity: number;
  scanId: string;
  balanceId: string;
};

type StaffTotal = {
  amount: number;
  quantity: number;
  transactions: number;
  memberId: string;
};

type TopUpByMember = {
  amount: number;
  topUps: number;
  memberId: string;
  memberName: string;
};

export async function getEventAnalyticsController(req: Request, res: Response) {
  //#region GET ANALYTICS
  const company: string = res.locals.company;
  const eventId: string = req.params.eventId;

  try {
    const queryRes = await query<EventAnalytic>(
      analyticsModel.getEventAnalyticsModel(eventId, company)
    );

    if (!queryRes.rowCount) {
      res.status(404).json("Event analytics were not found");
      return;
    }

    res.status(200).send(
      queryRes.rows.map((e) => ({
        ...e,
        averageExpense: Number(e.averageExpense),
        highestAmountSpent: Number(e.highestAmountSpent),
        itemsTakenFromStaff: Number(e.itemsTakenFromStaff),
        staffTransactions: Number(e.staffTransactions),
        staffTransactionsTotal: Number(e.staffTransactionsTotal),
        totalItemsSold: Number(e.totalItemsSold),
        totalRevenue: Number(e.totalRevenue),
        totalTransactions: Number(e.totalTransactions),
        topUps: Number(e.topUps),
        topUpsTotalAmount: Number(e.topUpsTotalAmount),
      }))[0]
    );
  } catch (err) {
    console.log("Get event analytics error:\n\n", err);
    res.status(500).send(err);
  }
}

export async function calculateEventAnalytics(req: Request, res: Response) {
  //#region CALCULATE ANALYTICS
  const company: string = res.locals?.company;
  const eventId: string = req.params.eventId;

  try {
    const models = analyticsModel.calculateAnalyticsModel(eventId, company);

    const [
      clientAnalyticsRes,
      staffAnalyticsRes,
      purchasesRes,
      itemTotalsRes,
      clientTotalsRes,
      memberTotalsRes,
      eventStandsRes,
      topUpsTotalsRes,
    ] = await Promise.all([
      query<ClientAnalytic>(models.clientsAnalytics),
      query<StaffAnalytic>(models.staffAnalytics),
      query<Purchase>(models.groupedPurchases),
      query<ItemAnalytic>(models.itemTotals),
      query<ClientTotal>(models.clientTotals),
      query<StaffTotal>(models.memberTotals),
      query<StandConfigType>(standsModel.getEventStandsModel(eventId, company)),
      query<TopUpTotal>(models.topUpTotals),
    ]);

    const [clientAnalytic] = clientAnalyticsRes.rows;
    const [staffAnalytic] = staffAnalyticsRes.rows;
    const [greatestPurchase] = purchasesRes.rows;
    const [bestItem] = itemTotalsRes.rows;
    const [bestClient] = clientTotalsRes.rows;
    const [topUpTotals] = topUpsTotalsRes.rows;

    const { averageExpense, totalItemsSold, totalRevenue, totalTransactions } =
      clientAnalytic;

    const { itemsTakenFromStaff, staffTransactions, staffTransactionsTotal } =
      staffAnalytic;

    const memberTotals = memberTotalsRes.rows.reduce(
      (acc, val) => ({
        ...acc,
        [val.memberId]: val,
      }),
      {} as Record<string, StaffTotal>
    );
    const eventStands = eventStandsRes.rows;

    const standTotals: { standName: string; transactions: number }[] = [];
    for (const stand of eventStands) {
      let transactions = 0;
      for (const memberId of stand.staffMembers) {
        if (!(memberId in memberTotals)) {
          continue;
        }

        transactions = transactions + memberTotals[memberId]["transactions"];
      }

      standTotals.push({
        standName: stand.standName,
        transactions,
      });
    }

    standTotals.sort((a, b) => b.transactions - a.transactions);

    const eventAnalytic: EventAnalytic = {
      analyticId: uuid(),
      company,
      eventId,
      bestCustomer: bestClient?.balanceId,
      averageExpense: Number(averageExpense),
      itemsTakenFromStaff: Number(itemsTakenFromStaff),
      staffTransactions: Number(staffTransactions),
      totalItemsSold: Number(totalItemsSold),
      totalRevenue: Number(totalRevenue),
      totalTransactions: Number(totalTransactions),
      staffTransactionsTotal: Number(staffTransactionsTotal),
      highestAmountSpent: Number(greatestPurchase?.amount),
      mostSoldItem: bestItem?.itemName,
      mostUsedStand: standTotals?.[0]?.["standName"] || "",
      topUps: Number(topUpTotals.topUps),
      topUpsTotalAmount: Number(topUpTotals.amount),
    };

    const existingAnalyticRes = await query<EventAnalytic>(
      analyticsModel.getEventAnalyticsModel(eventId, company)
    );

    if (!existingAnalyticRes.rowCount) {
      await query(analyticsModel.createAnalytic(eventAnalytic));
    } else {
      eventAnalytic.analyticId = existingAnalyticRes.rows[0]["analyticId"];
      await query(analyticsModel.updateAnalyticModel(eventAnalytic));
    }

    res.status(200).send(eventAnalytic);
  } catch (err) {
    console.log("Calculate analytics error:\n\n", err);
    res.status(500).send(err);
  }
}

export async function getAnalyticsDataController(req: Request, res: Response) {
  //#region ANALYTICS DATA
  const company: string = res.locals?.company;
  const eventId: string = req.params.eventId;

  try {
    const models = analyticsModel.calculateAnalyticsModel(eventId, company);

    const [itemTotalsRes, clientTotalsRes, memberTotalsRes, topUpsRes] =
      await Promise.all([
        query<ItemAnalytic>(models.itemTotals),
        query<ClientTotal>(models.clientTotals),
        query<StaffTotal>(models.memberTotals),
        query<TopUpByMember>(models.topUpsByMember),
      ]);

    res.status(200).send({
      itemTotals: itemTotalsRes.rows.map((e) => ({
        ...e,
        amount: Number(e.amount),
        quantity: Number(e.quantity),
      })),
      clientTotals: clientTotalsRes.rows.map((e) => ({
        ...e,
        amount: Number(e.amount),
        quantity: Number(e.quantity),
      })),
      memberTotals: memberTotalsRes.rows.map((e) => ({
        ...e,
        amount: Number(e.amount),
        quantity: Number(e.quantity),
        transactions: Number(e.transactions),
      })),
      topUpsByMember: topUpsRes.rows.map((e) => ({
        ...e,
        amount: Number(e.amount),
        topUps: Number(e.topUps),
      })),
    });
  } catch (err) {
    console.log("Error getting grouped analytics: ", err);
    res.status(500).send(err);
  }
}
