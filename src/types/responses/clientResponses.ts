import { ClientType, PaginationInfo } from "../tableTypes";

export interface ClientRow extends ClientType {
  balance: number;
  eventCurrency: string;
}

export interface GetClientResponse extends PaginationInfo {
  clients: ClientRow[];
}

export type CreateClientResponse = { clientId: string };

export type PatchClientResponse = void;

export type DeleteClientResponse = void;
