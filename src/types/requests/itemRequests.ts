import { ItemConfig } from "../tableTypes";

export type SinglePostItemRequest = Omit<
  ItemConfig,
  "staffSold" | "clientSold" | "eventId"
>;

export type PostItemsRequest = SinglePostItemRequest[];

export type PatchItemRequest = Partial<
  Omit<ItemConfig, "staffSold" | "clientsSold" | "eventId">
>;

export type PatchItemQuery = { itemName: string };

export type DeleteItemQuery = { itemName?: string };
