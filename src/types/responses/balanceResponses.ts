import { BalanceType } from "../tableTypes";
import { PaginationInfo } from "../tableTypes";

export interface GetBalancesResponse extends PaginationInfo {
  balances: BalanceType[];
}

export type CreateBalanceResponse = { balanceId: string };

export type GetBalanceByScanResponse = Pick<
  BalanceType,
  "balance" | "eventId" | "isFidelityCard" | "memberId"
>;

export type PatchBalanceResponse = void;

export type DeleteBalanceResponse = void;

export type CreateStaffBalanceResponse = { balanceId: string };
