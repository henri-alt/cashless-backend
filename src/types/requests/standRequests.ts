import { StandConfigType } from "../tableTypes";

export type CreateStandRequest = Omit<StandConfigType, "eventId" | "company">;

export type PatchStandRequest = Partial<
  Omit<StandConfigType, "eventId" | "company">
>;

export type PatchStandQuery = { standName: string };

export type DeleteStandQuery = { standName?: string };
