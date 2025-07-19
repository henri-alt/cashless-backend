import { TopUp, PaginationInfo } from "../tableTypes";

export interface GetTopUpsResponse extends PaginationInfo {
  topUps: TopUp[];
}

export type CreateTopUpResponse = void;
