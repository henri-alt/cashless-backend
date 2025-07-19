export type GetTransactionsQuery = {
  lastId?: string;
  pageSize?: number;
  eventId: string;
  fromDate?: string;
  toDate?: string;
  itemName?: string;
  itemCategory?: string;
  memberId?: string;
  page?: number;
  scanId?: string;
};

export type CreateTransactionRequest = {
  scanId: string;
  transactionItems: { itemName: string; quantity: number }[];
};
