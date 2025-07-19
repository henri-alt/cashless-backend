import format from "pg-format";
import { CurrencyType } from "../types";

const currencyKeys: (keyof CurrencyType)[] = [
  "company",
  "currency",
  "currencyId",
  "eventId",
  "isDefault",
  "rate",
  "marketRate",
  "quickPrices",
];

export function getCurrenciesModel(eventId: string, company: string) {
  //#region GET CURRENCIES
  return format(
    "SELECT * FROM currencies WHERE %I=%L AND %I=%L",
    "eventId",
    eventId,
    "company",
    company
  );
}

export function getCurrenciesByList(eventId: string, company: string) {
  //#region CURR BY LIST
  return format(
    `SELECT %I FROM currencies WHERE %I=%L AND %I=%L`,
    ["currency", "isDefault", "currencyId"],
    "eventId",
    eventId,
    "company",
    company
  );
}

export function createCurrencyModel(items: CurrencyType[]) {
  //#region CREATE CURRENCY
  const tableValues = items.map(
    (item) =>
      format("(%L", [
        item.company,
        item.currency,
        item.currencyId,
        item.eventId,
        item.isDefault,
        item.rate,
        item.marketRate || item.rate,
      ]) + `, ARRAY[${item.quickPrices.join(", ")}])`
  );

  return format(
    `INSERT INTO currencies(%I) VALUES${tableValues.join(", ")}`,
    currencyKeys
  );
}

export function bulkUpdateCurrenciesModel(items: CurrencyType[]) {
  //#region BULK UPDATE
  const tableValues = items.map((e) => {
    return (
      format("(%L", [e.company, e.currency, e.currencyId]) +
      "::uuid, " +
      format("%L", e.eventId) +
      "::uuid, " +
      format("%L", [e.isDefault, e.rate, e.marketRate]) +
      `, ARRAY[${e.quickPrices.join(", ")}])`
    );
  });

  return format(
    `UPDATE currencies AS c SET %I=v.%I::boolean, %I=v.%I, %I=v.%I::numeric, %I=v.%I::numeric, %I=v.%I::numeric[] FROM(VALUES ${tableValues.join(
      ", "
    )}) as v(%I) WHERE c.%I=v.%I AND c.%I=v.%I AND c.%I=v.%I`,
    "isDefault",
    "isDefault",
    "currency",
    "currency",
    "marketRate",
    "marketRate",
    "rate",
    "rate",
    "quickPrices",
    "quickPrices",
    currencyKeys,
    "currencyId",
    "currencyId",
    "eventId",
    "eventId",
    "company",
    "company"
  );
}

export function deleteCurrenciesModel(
  ids: string[],
  eventId: string,
  company: string
) {
  return format(
    "DELETE FROM currencies WHERE %I=%L AND %I=%L AND %I IN (%L)",
    "eventId",
    eventId,
    "company",
    company,
    "currencyId",
    ids
  );
}
