import { EventAnalytic } from "../tableTypes";

type ItemAnalytic = {
  quantity: number;
  amount: number;
  itemName: string;
};

type ClientTotal = {
  amount: number;
  quantity: number;
  scanId: string;
  balanceId: string;
};

type StaffTotal = {
  amount: number;
  quantity: number;
  transactions: number;
  memberId: string;
};

type TopUpByMember = {
  amount: number;
  topUps: number;
  memberId: string;
  memberName: string;
};

export type GetEventAnalyticsResponse = EventAnalytic;

export type GetAnalyticsDataResponse = {
  itemTotals: ItemAnalytic[];
  clientTotals: ClientTotal[];
  memberTotals: StaffTotal[];
  topUpsByMember: TopUpByMember[];
};
