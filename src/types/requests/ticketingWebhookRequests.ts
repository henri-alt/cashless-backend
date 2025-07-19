import { EventType } from "../tableTypes";

export type WHCreateEventRequest = Pick<
  EventType,
  "eventName" | "eventDescription" | "startDate" | "ticketingEventId"
> & { tenantId: string };
