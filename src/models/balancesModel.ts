import format from "pg-format";
import { BalanceType, GetBalancesQuery, PatchBalanceRequest } from "../types";

const balanceKeys: (keyof BalanceType)[] = [
  "balance",
  "balanceId",
  "company",
  "eventId",
  "isFidelityCard",
  "memberId",
  "scanId",
  "ticketId",
  "createdAt",
  "createdBy",
  "initialAmount",
  "isBonus",
  "activationCost",
  "eventCreated",
  "activationCurrency",
  "createdById",
  "eventCurrency",
];

export function getBalanceModel(
  params: GetBalancesQuery & { company: string }
) {
  //#region GET BALANCE
  const {
    balanceId,
    eventId,
    memberId,
    scanId,
    ticketId,
    company,
    isFidelityCard,
    lastId,
    pageSize,
    createdBy,
    page,
  } = params;

  const query = "SELECT * FROM balances WHERE ";
  let pagination = "";

  const filters = [];

  if (balanceId) {
    filters.push(format("%I=%L", "balanceId", balanceId));
  }

  if (createdBy) {
    filters.push(format("%I=%L", "createdBy", createdBy));
  }

  if (eventId) {
    filters.push(format("%I=%L", "eventCreated", eventId));
  }

  if (memberId) {
    filters.push(format("%I=%L", "memberId", memberId));
  }

  if (scanId) {
    filters.push(format("%I=%L", "scanId", scanId));
  }

  if (ticketId) {
    filters.push(format("%I=%L", "ticketId", ticketId));
  }

  if (company) {
    filters.push(format("%I=%L", "company", company));
  }

  if (isFidelityCard !== undefined) {
    filters.push(format("%I=%L", "isFidelityCard", isFidelityCard));
  }

  if (!isNaN(+pageSize) && !isNaN(+page)) {
    const offset = Number(pageSize) * Number(page);
    if (offset) {
      pagination = format(
        " ORDER BY %I OFFSET %L LIMIT %L",
        "createdAt",
        offset,
        pageSize
      );
    } else {
      pagination = format(" ORDER BY %I LIMIT %L", "createdAt", pageSize);
    }
  }

  return query + filters.join(" AND ") + pagination;
}

export function createBalanceModel(balance: BalanceType) {
  //#region CREATE BALANCE
  return format("INSERT INTO balances(%I) VALUES(%L)", balanceKeys, [
    balance.balance,
    balance.balanceId,
    balance.company,
    balance.eventId,
    balance.isFidelityCard,
    balance.memberId,
    balance.scanId,
    balance.ticketId,
    balance.createdAt,
    balance.createdBy,
    balance.initialAmount,
    balance.isBonus,
    balance.activationCost,
    balance.eventCreated,
    balance.activationCurrency,
    balance.createdById,
    balance.eventCurrency,
  ]);
}

export function patchBalanceModel(
  balance: PatchBalanceRequest & { balanceId: string },
  company: string
) {
  //#region PATCH BALANCE
  const query = "UPDATE balances SET ";
  const updates = [];

  if (!isNaN(+balance.balance)) {
    updates.push(format("%I=%L", "balance", balance.balance));
  }

  if (balance.memberId) {
    updates.push(format("%I=%L", "memberId", balance.memberId));
  }

  if (balance.activationCurrency) {
    updates.push(
      format("%I=%L", "activationCurrency", balance.activationCurrency)
    );
  }

  return (
    query +
    updates.join(", ") +
    format(
      " WHERE %I=%L AND %I=%L",
      "balanceId",
      balance.balanceId,
      "company",
      company
    )
  );
}

export function deleteSingleBalanceModel(id: string, company: string) {
  //#region DELETE SINGLE
  return format(
    "DELETE FROM balances WHERE %I=%L AND %I=%L AND %I=%L::boolean",
    "balanceId",
    id,
    "company",
    company,
    "isFidelityCard",
    "false"
  );
}

export function deleteEventBalances(id: string, company: string) {
  //#region DELETE FOR EVENT
  return format(
    "DELETE FROM balances WHERE %I=%L AND %I=%L AND %I=%L::boolean",
    "eventId",
    id,
    "company",
    company,
    "isFidelityCard",
    "false"
  );
}

export function getScanBalanceModel(scanId: string, company: string) {
  //#region GET SCAN BALANCE
  return format(
    "SELECT %I from balances WHERE (%I=%L OR %I=%L) AND %I=%L",
    [
      "balance",
      "eventId",
      "isFidelityCard",
      "memberId",
      "balanceId",
      "scanId",
      "isBonus",
      "activationCurrency",
      "eventCreated",
      "eventCurrency",
    ],
    "scanId",
    scanId,
    "ticketId",
    scanId,
    "company",
    company
  );
}

export function getCompanyAdmin(company: string) {
  //#region COMPANY ADMIN
  return format(
    "SELECT * FROM staff_members WHERE %I=%L AND %I=%L",
    "company",
    company,
    "userClass",
    process.env.ADMIN_CLASS
  );
}

export function deleteTopUp(scanId: string, company: string) {
  //#region DELETE TOP UP
  return format(
    "DELETE FROM top_ups WHERE %I=%L AND %I=%L",
    "scanId",
    scanId,
    "company",
    company
  );
}

export function deleteEventTopUps(eventId: string, company: string) {
  //#region DELETE EVENT TOP UPS
  return format(
    `delete from top_ups where company=%L and "eventId"=%L and "scanId" not in (select "scanId" from balances where "company"=%L and "isFidelityCard"=true)`,
    company,
    eventId,
    company
  );
}
