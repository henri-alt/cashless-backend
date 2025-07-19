import format from "pg-format";
import { EventAnalytic } from "../types";

export function getEventAnalyticsModel(eventId: string, company: string) {
  //#region GET EVENT ANALYTICS
  return format(
    "SELECT * FROM event_analytics WHERE %I=%L AND %I=%L",
    "eventId",
    eventId,
    "company",
    company
  );
}

export function calculateAnalyticsModel(eventId: string, company: string) {
  //#region CALCULATE ANALYTICS
  return {
    // general analytic for clients
    clientsAnalytics: format(
      `SELECT SUM(t.%I) AS %I, COUNT(t.%I) AS %I, SUM(t.%I) AS %I, AVG(t.%I) AS %I FROM transactions t INNER JOIN balances b ON t.%I=b.%I AND b.%I IS NULL WHERE t.%I=%L AND t.%I=%L`,
      "amount",
      "totalRevenue",
      "transactionId",
      "totalTransactions",
      "quantity",
      "totalItemsSold",
      "amount",
      "averageExpense",
      "scanId",
      "scanId",
      "memberId",
      "eventId",
      eventId,
      "company",
      company
    ),
    // general analytics for staff members
    staffAnalytics: format(
      `SELECT SUM(t.%I) AS %I, COUNT(t.%I) AS %I, SUM(t.%I) AS %I FROM transactions t INNER JOIN balances b ON t.%I=b.%I AND b.%I IS NOT NULL WHERE t.%I=%L AND t.%I=%L`,
      "amount",
      "staffTransactionsTotal",
      "transactionId",
      "staffTransactions",
      "quantity",
      "itemsTakenFromStaff",
      "scanId",
      "scanId",
      "memberId",
      "eventId",
      eventId,
      "company",
      company
    ),
    // group transactions into purchases
    groupedPurchases: format(
      `SELECT t.%I, t.%I, SUM(t.%I) AS %I, ARRAY(SELECT DISTINCT(t1.%I) FROM transactions t1 INNER JOIN transactions t2 ON t.%I=t1.%I AND t1.%I=t.%I) AS %I, SUM(t.%I) AS %I, t.%I, t.%I FROM transactions t INNER JOIN balances b ON t.%I=b.%I AND b.%I IS NULL WHERE t.%I=%L AND t.%I=%L GROUP BY t.%I, %I, t.%I, %I ORDER BY %I DESC`,
      "scanId",
      "transactionDate",
      "amount",
      "amount",
      "itemName",
      "transactionDate",
      "transactionDate",
      "scanId",
      "scanId",
      "items",
      "quantity",
      "quantity",
      "memberId",
      "memberName",
      "scanId",
      "scanId",
      "memberId",
      "eventId",
      eventId,
      "company",
      company,
      "scanId",
      "transactionDate",
      "memberId",
      "memberName",
      "amount"
    ),
    // collects data based on item
    itemTotals: format(
      `SELECT SUM(t.%I) AS %I, SUM(t.%I) AS %I, t.%I FROM transactions t INNER JOIN balances b ON t.%I=b.%I AND b.%I IS NULL WHERE t.%I=%L AND t.%I=%L GROUP BY t.%I`,
      "quantity",
      "quantity",
      "amount",
      "amount",
      "itemName",
      "scanId",
      "scanId",
      "memberId",
      "eventId",
      eventId,
      "company",
      company,
      "itemName"
    ),
    // get totals based on client
    clientTotals: format(
      `SELECT SUM(t.%I) AS %I, SUM(t.%I) AS %I, t.%I, b.%I FROM transactions t INNER JOIN balances b ON t.%I=b.%I AND b.%I=true WHERE t.%I=%L AND t.%I=%L GROUP BY t.%I, b.%I ORDER BY %I DESC`,
      "amount",
      "amount",
      "quantity",
      "quantity",
      "scanId",
      "balanceId",
      "scanId",
      "scanId",
      "isFidelityCard",
      "eventId",
      eventId,
      "company",
      company,
      "scanId",
      "balanceId",
      "amount"
    ),
    // get the total based on member
    memberTotals: format(
      `SELECT SUM(t.%I) AS %I, SUM(t.%I) AS %I, COUNT(t.%I) AS %I, t.%I FROM transactions t INNER JOIN balances b ON t.%I=b.%I AND b.%I IS NULL WHERE t.%I=%L AND t.%I=%L GROUP BY t.%I ORDER BY %I DESC`,
      "amount",
      "amount",
      "quantity",
      "quantity",
      "transactionId",
      "transactions",
      "memberId",
      "scanId",
      "scanId",
      "memberId",
      "eventId",
      eventId,
      "company",
      company,
      "memberId",
      "amount"
    ),
    // top up totals
    topUpTotals: format(
      `SELECT COUNT(%I)::numeric AS %I, SUM(%I)::numeric AS %I FROM top_ups WHERE %I=%L AND %I=%L`,
      "topUpId",
      "topUps",
      "topUpAmount",
      "amount",
      "eventId",
      eventId,
      "company",
      company
    ),
    // get the top ups totals for staff members
    topUpsByMember: format(
      `select sum(%I) as %I, count(%I) as %I, %I, %I from top_ups where %I=%L and %I=%L group by %I, %I`,
      "topUpAmount",
      "amount",
      "topUpId",
      "topUps",
      "memberId",
      "memberName",
      "company",
      company,
      "eventId",
      eventId,
      "memberId",
      "memberName"
    ),
  };
}

export function createAnalytic(analytic: EventAnalytic) {
  //#region CREATE ANALYTIC
  return format(
    "INSERT INTO event_analytics(%I) VALUES(%L)",
    [
      "averageExpense",
      "itemsTakenFromStaff",
      "staffTransactions",
      "totalItemsSold",
      "totalRevenue",
      "totalTransactions",
      "staffTransactionsTotal",
      "bestCustomer",
      "highestAmountSpent",
      "mostSoldItem",
      "mostUsedStand",
      "eventId",
      "company",
      "analyticId",
      "topUps",
      "topUpsTotalAmount",
    ],
    [
      analytic.averageExpense || 0,
      analytic.itemsTakenFromStaff || 0,
      analytic.staffTransactions || 0,
      analytic.totalItemsSold || 0,
      analytic.totalRevenue || 0,
      analytic.totalTransactions || 0,
      analytic.staffTransactionsTotal || 0,
      analytic.bestCustomer,
      analytic.highestAmountSpent || 0,
      analytic.mostSoldItem,
      analytic.mostUsedStand,
      analytic.eventId,
      analytic.company,
      analytic.analyticId,
      analytic.topUps || 0,
      analytic.topUpsTotalAmount || 0,
    ]
  );
}

export function updateAnalyticModel(analytic: EventAnalytic) {
  //#region UPDATE ANALYTIC
  return format(
    "UPDATE event_analytics SET %I=%L, %I=%L, %I=%L, %I=%L, %I=%L, %I=%L, %I=%L, %I=%L, %I=%L, %I=%L, %I=%L, %I=%L, %I=%L WHERE %I=%L AND %I=%L",
    "topUps",
    analytic.topUps || 0,
    "topUpsTotalAmount",
    analytic.topUpsTotalAmount || 0,
    "averageExpense",
    analytic.averageExpense || 0,
    "itemsTakenFromStaff",
    analytic.itemsTakenFromStaff || 0,
    "staffTransactions",
    analytic.staffTransactions || 0,
    "totalItemsSold",
    analytic.totalItemsSold || 0,
    "totalRevenue",
    analytic.totalRevenue || 0,
    "totalTransactions",
    analytic.totalTransactions || 0,
    "staffTransactionsTotal",
    analytic.staffTransactionsTotal || 0,
    "bestCustomer",
    analytic.bestCustomer,
    "highestAmountSpent",
    analytic.highestAmountSpent || 0,
    "mostSoldItem",
    analytic.mostSoldItem,
    "mostUsedStand",
    analytic.mostUsedStand,
    "eventId",
    analytic.eventId,
    "company",
    analytic.company
  );
}
