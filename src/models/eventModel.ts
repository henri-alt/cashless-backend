import format from "pg-format";
import { EventType, PatchEventRequest } from "../types";

const allowedKeys: (keyof Omit<EventType, "eventId">)[] = [
  "company",
  "eventDescription",
  "eventName",
  "eventStatus",
  "startDate",
  "tagPrice",
  "cardPrice",
  "ticketPrice",
  "activationMinimum",
];

const allKeys: (keyof EventType)[] = ["eventId", ...allowedKeys];

export function getAllEventsModel(company: string) {
  //#region GET ALL
  return format("SELECT * FROM events WHERE %I=%L", "company", company);
}

export function getActiveEventsModel(company: string) {
  //#region GET ACTIVE
  return format(
    `SELECT * FROM events WHERE %I=%L AND %I=%L`,
    "company",
    company,
    "eventStatus",
    "active"
  );
}

export function createEventModel(body: EventType) {
  //#region CREATE EVENT
  return format("INSERT INTO events(%I) VALUES(%L)", allKeys, [
    body.eventId,
    body.company,
    body.eventDescription,
    body.eventName,
    body.eventStatus,
    body.startDate,
    body.tagPrice,
    body.cardPrice,
    body.ticketPrice,
    body.activationMinimum,
  ]);
}

export function getSingleEventModel(eventId: string) {
  //#region GET EVENT
  return format("SELECT * FROM events WHERE %I=%L", "eventId", eventId);
}

export function patchEventModel(
  body: PatchEventRequest,
  id: string,
  company: string
) {
  //#region PATCH EVENT
  const {
    eventDescription,
    eventName,
    startDate,
    eventStatus,
    cardPrice,
    tagPrice,
    ticketPrice,
    activationMinimum,
  } = body;

  let updateQuery = `UPDATE events SET `;
  const updates = [];

  if (eventDescription) {
    updates.push(format("%I=%L", "eventDescription", eventDescription));
  }

  if (eventName) {
    updates.push(format("%I=%L", "eventName", eventName));
  }

  if (startDate) {
    updates.push(format("%I=%L", "startDate", startDate));
  }

  if (eventStatus) {
    updates.push(format("%I=%L", "eventStatus", eventStatus));
  }

  if (!isNaN(+ticketPrice)) {
    updates.push(format("%I=%L", "ticketPrice", ticketPrice));
  }

  if (!isNaN(+cardPrice)) {
    updates.push(format("%I=%L", "cardPrice", cardPrice));
  }

  if (!isNaN(+tagPrice)) {
    updates.push(format("%I=%L", "tagPrice", tagPrice));
  }

  if (!isNaN(+activationMinimum)) {
    updates.push(format("%I=%L", "activationMinimum", activationMinimum));
  }

  return (
    updateQuery +
    updates.join(", ") +
    format(" WHERE %I=%L AND %I=%L", "eventId", id, "company", company)
  );
}

export function deleteEventModel(id: string, company: string) {
  //#region DELETE EVENT
  return {
    event: format(
      "DELETE FROM events WHERE %I=%L AND %I=%L",
      "eventId",
      id,
      "company",
      company
    ),
    items: format(
      "DELETE FROM item_configs WHERE %I=%L AND %I=%L",
      "eventId",
      id,
      "company",
      company
    ),
    stands: format(
      "DELETE FROM stand_configs WHERE %I=%L AND %I=%L",
      "eventId",
      id,
      "company",
      company
    ),
    members: format(
      "DELETE FROM staff_members WHERE %I=%L AND %I=%L",
      "eventId",
      id,
      "company",
      company
    ),
    transactions: format(
      "DELETE FROM transactions WHERE %I=%L AND %I=%L",
      "eventId",
      id,
      "company",
      company
    ),
    balances: format(
      "DELETE FROM balances WHERE %I=%L AND %I=%L AND %I=%L::boolean",
      "eventId",
      id,
      "company",
      company,
      "isFidelityCard",
      "false"
    ),
    topUps: format(
      "DELETE FROM top_ups WHERE %I=%L AND %I=%L",
      "eventId",
      id,
      "company",
      company
    ),
    analytics: format(
      "DELETE FROM event_analytics WHERE %I=%L AND %I=%L",
      "eventId",
      id,
      "company",
      company
    ),
    currencies: format(
      "DELETE FROM currencies WHERE %I=%L AND %I=%L",
      "eventId",
      id,
      "company",
      company
    ),
    tickets: format(
      "DELETE FROM tickets WHERE %I=%L AND %I=%L",
      "eventId",
      id,
      "company",
      company
    ),
  };
}
