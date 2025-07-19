import { TransactionType, PaginationInfo } from "../tableTypes";

export interface GetTransactionsResponse extends PaginationInfo {
  transactions: TransactionType[];
}

export type CreateTransactionResponse = void;

export type DeleteTransactionsResponse = void;
