import format from "pg-format";
import {
  PatchItemRequest,
  SinglePostItemRequest,
  PostItemsRequest,
} from "../types";

const itemKeys: (keyof SinglePostItemRequest)[] = [
  "itemName",
  "itemPrice",
  "itemTax",
  "staffPrice",
  "itemCategory",
  "bonusAvailable",
];

export function getEventItemsModel(id: string, company: string) {
  //#region EVENT ITEMS
  return format(
    "SELECT * FROM item_configs WHERE %I=%L AND %I=%L",
    "eventId",
    id,
    "company",
    company
  );
}

export function getItemsByNameModel(names: string[], eventId: string) {
  //#region ITEMS BY NAME
  return format(
    "SELECT %I FROM item_configs WHERE %I=%L AND %I IN (%L)",
    "itemName",
    "eventId",
    eventId,
    "itemName",
    names
  );
}

export function createItemsModel(
  items: SinglePostItemRequest[],
  eventId: string,
  company: string
) {
  //#region CREATE ITEMs
  const tableValues = items.map((item) =>
    format("(%L)", [
      item.itemName,
      item.itemPrice,
      item.itemTax,
      item.staffPrice,
      item.itemCategory,
      item.bonusAvailable,
      eventId,
      company,
    ])
  );

  return format(
    `INSERT INTO item_configs(%I) VALUES${tableValues.join(", ")}`,
    [...itemKeys, "eventId", "company"]
  );
}

export function bulkUpdateItemsModel(items: PostItemsRequest, eventId: string) {
  const tableValues = items.map((item) =>
    format("(%L)", [
      item.itemName,
      item.itemPrice,
      item.itemTax,
      item.staffPrice,
      item.itemCategory,
      typeof item.bonusAvailable === "boolean" ? item.bonusAvailable : true,
    ])
  );

  return format(
    `UPDATE item_configs AS i SET "itemPrice"=v."itemPrice"::numeric, "itemTax"=v."itemTax"::numeric, "staffPrice"=v."staffPrice"::numeric, "itemCategory"=v."itemCategory", "bonusAvailable"=v."bonusAvailable"::boolean FROM(VALUES ${tableValues.join(
      ", "
    )}) AS v(%I) WHERE i.%I=v.%I AND i.%I=%L`,
    itemKeys,
    "itemName",
    "itemName",
    "eventId",
    eventId
  );
}

export function patchItemModel(
  item: PatchItemRequest,
  eventId: string,
  itemName: string,
  company: string
) {
  //#region PATCH ITEM
  const {
    itemCategory,
    itemName: newName,
    itemPrice,
    itemTax,
    staffPrice,
    bonusAvailable,
  } = item;

  const query = format("UPDATE item_configs SET ");
  const updates = [];

  if (itemCategory) {
    updates.push(format("%I=%L", "itemCategory", itemCategory));
  }

  if (newName) {
    updates.push(format("%I=%L", "itemName", newName));
  }

  if (itemPrice) {
    updates.push(format("%I=%L", "itemPrice", itemPrice));
  }

  if (itemTax) {
    updates.push(format("%I=%L", "itemTax", itemTax));
  }

  if (staffPrice) {
    updates.push(format("%I=%L", "staffPrice", staffPrice));
  }

  if (typeof bonusAvailable === "boolean") {
    updates.push(format("%I=%L", "bonusAvailable", bonusAvailable));
  }

  return (
    query +
    updates.join(", ") +
    format(
      " WHERE %I=%L AND %I=%L AND %I=%L",
      "itemName",
      itemName,
      "eventId",
      eventId,
      "company",
      company
    )
  );
}

export function changeStandItems(param: {
  eventId: string;
  oldName: string;
  newName: string;
  company: string;
}) {
  const { eventId, newName, oldName, company } = param;

  return format(
    `UPDATE stand_configs SET "menuItems"=array_replace("menuItems", %L, %L) WHERE "eventId"=%L AND company=%L;`,
    oldName,
    newName,
    eventId,
    company
  );
}

export function deleteItemsByEventModel(eventId: string, company: string) {
  //#region DELETE BY EVENT
  return format(
    "DELETE FROM item_configs WHERE %I=%L AND %I=%L",
    "eventId",
    eventId,
    "company",
    company
  );
}

export function deleteItemModel(
  itemName: string,
  eventId: string,
  company: string
) {
  //#region DELETE ITEM
  return format(
    "DELETE FROM item_configs WHERE %I=%L AND %I=%L AND %I=%L",
    "itemName",
    itemName,
    "eventId",
    eventId,
    "company",
    company
  );
}

export function removeItemFromStandModel(name: string, company: string) {
  //#region REMOVE FROM STAND
  return format(
    "UPDATE stand_configs SET %I=array_remove(%I, %L) WHERE %I=%L AND %L = ANY(%I)",
    "menuItems",
    "menuItems",
    name,
    "company",
    company,
    name,
    "menuItems"
  );
}
