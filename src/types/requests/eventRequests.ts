import { EventType } from "../tableTypes";

export type CreateEventRequest = Omit<
  EventType,
  "eventStatus" | "eventDescription" | "eventId" | "company"
> & { eventDescription?: string };

export type PatchEventRequest = Partial<Omit<EventType, "eventId" | "company">>;
