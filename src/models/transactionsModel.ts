import format from "pg-format";
import { v4 } from "uuid";
import { GetTransactionsQuery } from "../types";

interface PaginatedTransactionParam extends GetTransactionsQuery {
  company: string;
}

type TransactionItem = {
  itemName: string;
  quantity: number;
  amount: number;
};

type CreateTransactionParam = {
  scanId: string;
  memberId: string;
  company: string;
  memberName: string;
  eventId: string;
  transactionDate: string;
  transactionItems: TransactionItem[];
};

const transactionCols = [
  "amount",
  "memberId",
  "itemName",
  "transactionDate",
  "quantity",
  "eventId",
  "company",
  "scanId",
  "transactionId",
  "memberName",
];

export function getPaginatedTransactionsController(
  param: PaginatedTransactionParam
) {
  //#region GET TRANSACTIONS
  const {
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
  } = param;
  let query = "SELECT * FROM transactions WHERE ";
  // const pagination = format(" ORDER BY %I LIMIT %L", "transactionId", pageSize);
  let pagination = "";
  const filters = [];

  if (itemCategory) {
    query = format(
      "SELECT t.* FROM transactions t INNER JOIN item_configs i ON t.%I=i.%I AND i.%I=%L WHERE ",
      "itemName",
      "itemName",
      "itemCategory",
      itemCategory
    );
  }

  const colPrefix = itemCategory ? "t." : "";

  filters.push(format(`${colPrefix}%I=%L`, "company", company));

  if (eventId) {
    filters.push(format(`${colPrefix}%I=%L`, "eventId", eventId));
  }

  if (fromDate) {
    filters.push(
      format(
        `${colPrefix}%I>=%L::timestamp with time zone`,
        "transactionDate",
        fromDate
      )
    );
  }

  if (toDate) {
    filters.push(
      format(
        `${colPrefix}%I<=%L::timestamp with time zone`,
        "transactionDate",
        toDate
      )
    );
  }

  if (scanId) {
    filters.push(format(`${colPrefix}%I=%L`, "scanId", scanId));
  }

  if (lastId) {
    filters.push(format(`${colPrefix}%I>%L`, "transactionId", lastId));
  }

  if (itemName) {
    filters.push(format(`${colPrefix}%I=%L`, "itemName", itemName));
  }

  if (memberId) {
    filters.push(format(`${colPrefix}%I=%L`, "memberId", memberId));
  }

  if (!isNaN(+pageSize) && !isNaN(+page)) {
    const offset = Number(pageSize) * Number(page);

    if (offset) {
      pagination = format(
        " ORDER BY %I OFFSET %L LIMIT %L",
        "transactionDate",
        offset,
        pageSize
      );
    } else {
      pagination = format(" ORDER BY %I LIMIT %L", "transactionDate", pageSize);
    }
  }

  return (
    query +
    filters.join(" AND ") +
    (colPrefix ? format(` GROUP BY ${colPrefix}%I`, "transactionId") : "") +
    pagination
  );
}

export function createTransactionModel(body: CreateTransactionParam) {
  //#region CREATE TRANSACTION
  const {
    eventId,
    scanId,
    transactionDate,
    transactionItems,
    company,
    memberId,
    memberName,
  } = body;

  const query = format("INSERT INTO transactions(%I) VALUES", transactionCols);
  let items = [];
  for (const item of transactionItems) {
    const { amount, itemName, quantity } = item;
    items.push(
      format("(%L)", [
        amount,
        memberId,
        itemName,
        transactionDate,
        quantity,
        eventId,
        company,
        scanId,
        v4(),
        memberName,
      ])
    );
  }

  return query + items.join(", ");
}

export function transactionBalanceModel(
  scanId: string,
  amount: number,
  company: string
) {
  //#region TRANSACTION BALANCE
  return format(
    "UPDATE balances SET %I=%I-%L::numeric WHERE %I=%L AND %I>=%L AND %I=%L",
    "balance",
    "balance",
    amount,
    "scanId",
    scanId,
    "balance",
    amount,
    "company",
    company
  );
}

export function deleteTransactionsModel(eventId: string, company: string) {
  //#region DELETE TRANSACTION
  return format(
    "DELETE FROM transactions WHERE %I=%L AND %I=%L",
    "eventId",
    eventId,
    "company",
    company
  );
}

export function addTotalAmountToClientModel(
  balanceId: string,
  amount: number,
  company: string
) {
  //#region ADD TOTAL AMOUNT
  return format(
    "UPDATE clients SET %I=%I+%L WHERE %I=%L AND %I=%L",
    "amountSpent",
    "amountSpent",
    amount,
    "balanceId",
    balanceId,
    "company",
    company
  );
}
