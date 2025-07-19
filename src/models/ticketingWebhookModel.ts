import format from "pg-format";
import { EventType } from "../types";

type CrateTicketingEventParam = Pick<
  EventType,
  | "eventName"
  | "eventDescription"
  | "startDate"
  | "company"
  | "ticketingEventId"
>;

export function createTicketingEventModel({
  company,
  eventName,
  startDate,
  ticketingEventId,
  eventDescription,
}: CrateTicketingEventParam) {
  //#region CREATE EVENT
  return format(
    "insert into events(%I) values(%L)",
    [
      "eventId",
      "company",
      "eventName",
      "startDate",
      "ticketingEventId",
      "eventDescription",
    ],
    [
      crypto.randomUUID(),
      company,
      eventName,
      startDate,
      ticketingEventId,
      eventDescription,
    ]
  );
}
