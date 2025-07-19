export type GetTopUpsQuery = {
  fromDate?: string;
  toDate?: string;
  gtAmount?: number;
  ltAmount?: number;
  memberId?: string;
  scanId?: string;
  lastId?: string;
  pageSize?: number;
  eventId: string;
  topUpCurrency?: string;
  page?: number;
};

export interface TopUpRequest {
  scanId: string;
  ticketId?: string;
  amount: number;
  topUpDate: string;
  eventId?: string;
  memberId?: string;
  memberName?: string;
  topUpCurrency: string;
}
