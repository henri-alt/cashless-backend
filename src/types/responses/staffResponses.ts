import { ItemConfig, StaffMember, CurrencyType } from "../tableTypes";

type ReducedMember = Omit<StaffMember, "memberPassword">;

export type GetStaffResponse = ReducedMember[];

export type GetMemberResponse = ReducedMember;

export type CreateMemberResponse = { memberId: string };

export type PatchMemberResponse = void;

export type DeleteMemberResponse = void;

export type LoginMemberResponse = {
  token: string;
  member: ReducedMember;
  eventId?: string;
  menuItems?: Record<string, ItemConfig[]>;
  currencies: CurrencyType[];
};

export type RefreshDataResponse = LoginMemberResponse;
