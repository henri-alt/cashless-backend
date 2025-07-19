import format from "pg-format";
import { ClientType, GetClientQuery } from "../types";

const clientKeys: Array<keyof ClientType> = [
  "balanceId",
  "clientEmail",
  "clientId",
  "clientName",
  "company",
  "createdAt",
  "amountSpent",
];

export function getClientModel(query: GetClientQuery & { company: string }) {
  //#region GET CLIENT
  const {
    page,
    lastId,
    pageSize,
    company,
    balanceId,
    clientEmail,
    clientId,
    clientName,
  } = query;

  const conditions = [format("c.%I=%L", "company", company)];

  if (balanceId) {
    conditions.push(format("c.%I=%L", "balanceId", balanceId));
  }
  if (clientEmail) {
    conditions.push(format("c.%I=%L", "clientEmail", clientEmail));
  }
  if (clientId) {
    conditions.push(format("c.%I=%L", "clientId", clientId));
  }
  if (clientName) {
    conditions.push(format("c.%I=%L", "clientName", clientName));
  }

  let pagination = "";
  if (!isNaN(+pageSize) && !isNaN(+page)) {
    const offset = Number(pageSize) * Number(page);

    if (offset) {
      pagination = format(
        " ORDER BY %I OFFSET %L LIMIT %L",
        "clientName",
        offset,
        pageSize
      );
    } else {
      pagination = format(" ORDER BY %I LIMIT %L", "clientName", pageSize);
    }
  }
  return (
    `SELECT c."clientId", c."clientEmail", c."clientName", c."createdAt", c."amountSpent", b."balanceId", b.balance, b."eventCurrency" FROM clients c JOIN balances b ON c."balanceId" = b."balanceId" WHERE ` +
    conditions.join(" AND ") +
    pagination
  );
}

export function checkClientEmailModel(clientEmail: string) {
  //#region CHECK BY EMAIL
  return format(
    "SELECT %I FROM clients WHERE %I=%L",
    "clientEmail",
    "clientEmail",
    clientEmail
  );
}

export function createClientModel(client: ClientType) {
  //#region CREATE CLIENT
  return format("INSERT INTO clients(%I) VALUES(%L)", clientKeys, [
    client.balanceId,
    client.clientEmail,
    client.clientId,
    client.clientName,
    client.company,
    client.createdAt,
    client.amountSpent,
  ]);
}

export function changeBalanceModel(balanceId: string, company: string) {
  //#region CHANGE BALANCE
  return format(
    "UPDATE balances SET %I=%L::boolean WHERE %I=%L AND %I=%L",
    "isFidelityCard",
    "true",
    "balanceId",
    balanceId,
    "company",
    company
  );
}

export function patchClientModel(
  request: Omit<ClientType, "createdAt" | "amountSpent">
) {
  //#region PATCH CLIENT
  const query = "UPDATE clients SET ";
  const updates = [];

  if (request.balanceId) {
    updates.push(format("%I=%L", "balanceId", request.balanceId));
  }

  if (request.clientEmail) {
    updates.push(format("%I=%L", "clientEmail", request.clientEmail));
  }

  if (request.clientName) {
    updates.push(format("%I=%L", "clientName", request.clientName));
  }

  return (
    query +
    updates.join(", ") +
    format(
      " WHERE %I=%L AND %I=%L",
      "company",
      request.company,
      "clientId",
      request.clientId
    )
  );
}

export function deleteClientModel(clientId: string, company: string) {
  //#region DELETE CLIENT
  return {
    balance: (balanceId: string) => {
      return format(
        "DELETE FROM balances WHERE %I=%L AND %I=%L::boolean AND %I=%L",
        "balanceId",
        balanceId,
        "isFidelityCard",
        "true",
        "company",
        company
      );
    },
    getClient: format(
      "SELECT %I FROM clients WHERE %I=%L AND %I=%L",
      "balanceId",
      "company",
      company,
      "clientId",
      clientId
    ),
    client: format(
      "DELETE FROM clients WHERE %I=%L AND %I=%L",
      "clientId",
      clientId,
      "company",
      company
    ),
    topUps: (scanId: string) => {
      return format(
        "DELETE FROM top_ups WHERE %I=%L AND %I=%L",
        "scanId",
        scanId,
        "company",
        company
      );
    },
  };
}
