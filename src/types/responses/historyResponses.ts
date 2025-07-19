import { TransactionType, TopUp, BalanceType } from "../tableTypes";

export type GetTransactionHistoryResponse = {
  transactions: TransactionType[];
  topUps: TopUp[];
  balance: BalanceType;
};
