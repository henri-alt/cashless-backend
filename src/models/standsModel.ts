import format from "pg-format";
import {
  StandConfigType,
  CreateStandRequest,
  PatchStandRequest,
} from "../types";

const standKeys: (keyof StandConfigType)[] = [
  "eventId",
  "standName",
  "menuItems",
  "staffMembers",
  "company",
];

export function getEventStandsModel(id: string, company: string) {
  //#region EVENT STANDS
  return format(
    "SELECT * FROM stand_configs WHERE %I=%L AND %I=%L",
    "eventId",
    id,
    "company",
    company
  );
}

export function createStandModel(
  stand: CreateStandRequest,
  eventId: string,
  company: string
) {
  //#region CREATE STAND
  return format(
    "INSERT INTO stand_configs(%I) VALUES(%L, %L, ARRAY[%L]::text[], ARRAY[%L]::uuid[], %L)",
    standKeys,
    eventId,
    stand.standName,
    stand.menuItems,
    stand.staffMembers,
    company
  );
}

export function patchStandController(
  stand: PatchStandRequest,
  standName: string,
  eventId: string,
  company: string
) {
  //#region PATCH STAND
  const { menuItems, staffMembers, standName: newName } = stand;

  const query = format("UPDATE stand_configs SET ");
  const updates = [];

  if (staffMembers) {
    updates.push(format("%I=ARRAY[%L]::uuid[]", "staffMembers", staffMembers));
  }

  if (menuItems) {
    updates.push(format("%I=ARRAY[%L]::text[]", "menuItems", menuItems));
  }

  if (newName) {
    updates.push(format("%I=%L", "standName", newName));
  }

  return (
    query +
    updates.join(", ") +
    format(
      " WHERE %I=%L AND %I=%L AND %I=%L",
      "eventId",
      eventId,
      "standName",
      standName,
      "company",
      company
    )
  );
}

export function deleteStandModel(
  standName: string,
  eventId: string,
  company: string
) {
  //#region DELETE STAND
  return format(
    "DELETE FROM stand_configs WHERE %I=%L AND %I=%L AND %I=%L",
    "standName",
    standName,
    "eventId",
    eventId,
    "company",
    company
  );
}
