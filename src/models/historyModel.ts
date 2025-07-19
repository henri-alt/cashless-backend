import format from "pg-format";
import { v4 } from "uuid";
import { GetTransactionsHistoryRequest } from "../types";

type GetTransactionHistoryControllerParam = {
  eventId: string;
  company: string;
} & GetTransactionsHistoryRequest;

export function getTransactionHistoryModel({
  company,
  eventId,
  scanId,
}: GetTransactionHistoryControllerParam) {
  if (!eventId) {
    return format(
      "select * from transactions where %I=%L and %I=%L",
      "company",
      company,
      "scanId",
      scanId
    );
  }

  return format(
    "select * from transactions where %I=%L and %I=%L and %I=%L",
    "company",
    company,
    "eventId",
    eventId,
    "scanId",
    scanId
  );
}

export function getTopUpHistoryModel({
  company,
  eventId,
  scanId,
}: GetTransactionHistoryControllerParam) {
  if (!eventId) {
    return format(
      "select * from top_ups where %I=%L and %I=%L",
      "company",
      company,
      "scanId",
      scanId
    );
  }

  return format(
    "select * from top_ups where %I=%L and %I=%L and %I=%L",
    "company",
    company,
    "eventId",
    eventId,
    "scanId",
    scanId
  );
}

export function getBalanceHistoryModel({
  company,
  scanId,
}: GetTransactionHistoryControllerParam) {
  return format(
    "select * from balances where (%I=%L or %I=%L) and %I=%L",
    "scanId",
    scanId,
    "ticketId",
    scanId,
    "company",
    company
  );
}
