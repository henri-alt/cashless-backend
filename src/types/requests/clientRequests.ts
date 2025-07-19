import { ClientType } from "../tableTypes";

export type GetClientQuery = {
  pageSize?: number | string;
  lastId?: string;
  balanceId?: string;
  clientId?: string;
  clientEmail?: string;
  clientName?: string;
  page?: number;
};

export type CreateClientRequest = {
  balance: number;
  clientName: string;
  clientEmail: string;
  scanId: string;
  ticketId: string;
  activationCurrency: string;
};

export type PatchClientRequest = Partial<
  Omit<ClientType, "clientId" | "company" | "createdAt" | "amountSpent">
>;
