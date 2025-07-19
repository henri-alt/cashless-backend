import format from "pg-format";
import { GetTopUpsQuery, TopUp, TopUpRequest } from "../types";

type GetBalanceForTopUpParam = {
  scanId?: string;
  ticketId?: string;
  company: string;
};

export function topUpModel(
  topUp: Omit<TopUpRequest, "topUpCurrency">,
  company: string
) {
  //#region TOP UP
  const query = format(
    "UPDATE balances SET %I=%I+%L::numeric WHERE ",
    "balance",
    "balance",
    topUp.amount
  );

  const filters = [];
  if ((topUp.scanId && !topUp.ticketId) || (topUp.ticketId && !topUp.scanId)) {
    const id = topUp.scanId || topUp.ticketId;
    filters.push(format("(%I=%L OR %I=%L)", "ticketId", id, "scanId", id));
  } else {
    filters.push(format("%I=%L", "scanId", topUp.scanId));
    filters.push(format("%I=%L", "ticketId", topUp.ticketId));
  }

  filters.push(format("%I=%L", "company", company));
  return query + filters.join(" AND ");
}

export function getBalanceForTopUpModel(param: GetBalanceForTopUpParam) {
  //#region GET BALANCE FOR TOP UP
  let query = format(
    "SELECT %I FROM balances WHERE %I=%L AND ",
    ["scanId", "isBonus", "balance", "eventCurrency"],
    "company",
    param.company
  );

  if ((param.scanId && !param.ticketId) || (param.ticketId && !param.scanId)) {
    const id = param.scanId || param.ticketId;
    query = query + format("(%I=%L OR %I=%L)", "ticketId", id, "scanId", id);
  } else {
    query =
      query +
      format(
        "%I=%L AND %I=%L",
        "scanId",
        param.scanId,
        "ticketId",
        param.ticketId
      );
  }

  return query;
}

export function createTopUp(topUp: TopUp) {
  //#region CREATE TOP UP
  return format(
    "INSERT INTO top_ups(%I) VALUES(%L)",
    [
      "topUpDate",
      "topUpAmount",
      "memberId",
      "scanId",
      "eventId",
      "company",
      "memberName",
      "topUpId",
      "topUpCurrency",
    ],
    [
      topUp.topUpDate,
      topUp.topUpAmount,
      topUp.memberId,
      topUp.scanId,
      topUp.eventId,
      topUp.company,
      topUp.memberName,
      topUp.topUpId,
      topUp.topUpCurrency,
    ]
  );
}

export function getTopUpsModel(param: GetTopUpsQuery & { company: string }) {
  //#region GET TOP UPS
  const {
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
  } = param;

  const filters: string[] = [];
  let query = `SELECT * FROM top_ups WHERE `;
  let pagination = "";

  filters.push(format("%I=%L", "company", company));
  filters.push(format("%I=%L", "eventId", eventId));

  if (fromDate) {
    filters.push(
      format("%I>=%L::timestamp with time zone", "topUpDate", fromDate)
    );
  }

  if (toDate) {
    filters.push(
      format("%I<=%L::timestamp with time zone", "topUpDate", toDate)
    );
  }

  if (gtAmount) {
    filters.push(format("%I>=%L::numeric", "topUpAmount", gtAmount));
  }

  if (ltAmount) {
    filters.push(format("%I<=%L", "topUpAmount::numeric", ltAmount));
  }

  if (memberId) {
    filters.push(format("%I=%L", "memberId", memberId));
  }

  if (topUpCurrency) {
    filters.push(format("%I=%L", "topUpCurrency", topUpCurrency));
  }

  if (scanId) {
    filters.push(format("%I=%L", "scanId", scanId));
  }

  if (lastId) {
    filters.push(format("%I>%L", "topUpId", lastId));
  }

  if (!isNaN(+pageSize) && !isNaN(+page)) {
    const offset = Number(pageSize) * Number(page);

    if (offset) {
      pagination = format(
        " ORDER BY %I OFFSET %L LIMIT %L",
        "topUpDate",
        offset,
        pageSize
      );
    } else {
      pagination = format(" ORDER BY %I LIMIT %L", "topUpDate", pageSize);
    }
  }

  return query + filters.join(" AND ") + pagination;
}
