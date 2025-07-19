import { BalanceType } from "../tableTypes";

export type GetBalancesQuery = {
  scanId?: string;
  eventId?: string;
  balanceId?: string;
  isFidelityCard?: "true" | "false" | boolean;
  memberId?: string;
  lastId?: string;
  pageSize?: string | number;
  ticketId?: string;
  createdBy?: string;
  page?: number;
};

export type CreateBalanceRequest = Omit<
  BalanceType,
  | "balanceId"
  | "company"
  | "memberId"
  | "createdBy"
  | "createdAt"
  | "isBonus"
  | "initialAmount"
  | "activationCost"
  | "eventCreated"
  | "createdById"
  | "eventCurrency"
>;

export type PatchBalanceRequest = Partial<
  Pick<
    BalanceType,
    | "balance"
    | "scanId"
    | "memberId"
    | "balanceId"
    | "createdAt"
    | "createdBy"
    | "activationCost"
    | "initialAmount"
    | "eventCreated"
    | "activationCurrency"
  >
>;

export interface CreateStaffBalanceRequest extends CreateBalanceRequest {
  adminPassword: string;
}
