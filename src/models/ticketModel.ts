import format from "pg-format";
import { TicketType } from "../types";

const TICKET_KEYS = ["ticket", "eventId", "memberId", "memberName", "company"];

interface CheckTicketParam {
  ticket: string;
  company: string;
}

export function checkTicketModel({ company, ticket }: CheckTicketParam) {
  return format(
    "select * from tickets where %I=%L and %I=%L",
    "ticket",
    ticket,
    "company",
    company
  );
}

type CreateTicketParam = Omit<TicketType, "checkTime">;

export function createTicketModel({
  ticket,
  eventId,
  memberId,
  memberName,
  company,
}: CreateTicketParam) {
  return format("insert into tickets(%I) values(%L)", TICKET_KEYS, [
    ticket,
    eventId,
    memberId,
    memberName,
    company,
  ]);
}
