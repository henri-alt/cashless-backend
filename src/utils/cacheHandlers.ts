import format from "pg-format";
import { CurrencyType, EventType, ItemConfig } from "../types";
import { cache, query } from "../providers";

/**
 * Function to be called on server start, populates the cache
 * of the thread with the running event's data
 */
export async function populateRunningEvents(): Promise<void> {
  //#region POPULATE RUNNING EVENTS
  const [itemsRes, eventsRes, currenciesRes] = await Promise.all([
    query<ItemConfig>(
      `SELECT i.* FROM item_configs i INNER JOIN events e ON i."eventId"=e."eventId" AND e."eventStatus"='active'`
    ),
    query<EventType>(`SELECT * FROM events WHERE "eventStatus"='active'`),
    query<CurrencyType>(
      `SELECT c.* FROM currencies c INNER JOIN events e ON c."eventId"=e."eventId" AND e."eventStatus"='active'`
    ),
  ]);

  const groupedConfigs = itemsRes.rows.reduce((acc, val) => {
    return {
      ...acc,
      [val.eventId]: {
        ...(acc[val.eventId] || {}),
        [val.itemName]: val,
      },
    };
  }, {} as Record<string, Record<string, ItemConfig>>);

  const groupedCurrencies = currenciesRes.rows.reduce(
    (acc, val) => ({
      ...acc,
      [val.eventId]: {
        ...(acc[val.eventId] || {}),
        [val.currency]: val,
      },
    }),
    {} as Record<string, Record<string, CurrencyType>>
  );

  cache.flush();

  for (const eventId in groupedConfigs) {
    cache.set(eventId, groupedConfigs[eventId]);
  }

  for (const event of eventsRes.rows) {
    cache.set(`/config/${event.eventId}`, event);
  }

  for (const eventId in groupedCurrencies) {
    cache.set(`/currencies/${eventId}`, groupedCurrencies[eventId]);
  }
}

/**
 * Emit function for event start
 */
export async function startEvent(eventId: string): Promise<void> {
  //#region START EVENT
  const [itemsRes, eventsRes, currenciesRes] = await Promise.all([
    query<ItemConfig>(
      format("SELECT * FROM item_configs WHERE %I=%L", "eventId", eventId)
    ),
    query<EventType>(
      format("SELECT * FROM events WHERE %I=%L", "eventId", eventId)
    ),
    query<CurrencyType>(
      format("SELECT * FROM currencies WHERE %I=%L", "eventId", eventId)
    ),
  ]);

  cache.set(
    eventId,
    itemsRes.rows.reduce(
      (acc, val) => ({
        ...acc,
        [val.itemName]: val,
      }),
      {} as Record<string, ItemConfig>
    )
  );

  cache.set(
    `/currencies/${eventId}`,
    currenciesRes.rows.reduce(
      (acc, val) => ({
        ...acc,
        [val.currency]: val,
      }),
      {} as Record<string, CurrencyType>
    )
  );

  for (const event of eventsRes.rows) {
    cache.set(`/config/${event.eventId}`, event);
  }
}

/**
 * Emit function for event end
 */
export function endEvent(eventId: string): void {
  //#region END EVENT
  cache.del(eventId);
  cache.del(`/config/${eventId}`);
  cache.del(`/currencies/${eventId}`);
}

/**
 * Event change listener
 */
export async function changeEvent(eventId: string): Promise<void> {
  //#region ON CONFIG CHANGED
  if (!checkEvent(eventId)) {
    return;
  }

  const eventRes = await query<EventType>(
    format("SELECT * FROM events WHERE %I=%L", "eventId", eventId)
  );

  cache.set(`/config/${eventId}`, eventRes.rows.at(0));
}

/**
 * Items change listener
 */
export async function changeItems(eventId: string): Promise<void> {
  //#region CHANGE ITEMS
  if (!checkEvent(eventId)) {
    return;
  }

  const itemsRes = await query<ItemConfig>(
    format("SELECT * FROM item_configs WHERE %I=%L", "eventId", eventId)
  );

  cache.set(
    eventId,
    itemsRes.rows.reduce(
      (acc, val) => ({
        ...acc,
        [val.itemName]: val,
      }),
      {} as Record<string, ItemConfig>
    )
  );
}

/**
 * Change currencies listener
 */
export async function changeCurrencies(eventId: string): Promise<void> {
  //#region CHANGE CURRENCIES
  if (!checkEvent(eventId)) {
    return;
  }

  const currenciesRes = await query<CurrencyType>(
    format("SELECT * FROM currencies WHERE %I=%L", "eventId", eventId)
  );

  cache.set(
    `/currencies/${eventId}`,
    currenciesRes.rows.reduce(
      (acc, val) => ({
        ...acc,
        [val.currency]: val,
      }),
      {} as Record<string, CurrencyType>
    )
  );
}

/**
 * Event validator
 */
export function checkEvent(eventId: string): boolean {
  //#region CHECK EVENT
  return cache.has(`/config/${eventId}`);
}

/**
 * Gets the event
 */
export function getEvent(eventId: string) {
  //#region GET EVENT
  return cache.get<EventType>(`/config/${eventId}`);
}

/**
 * Gets the event configuration
 */
export function getItems(eventId: string) {
  //#region GET CONFIG
  return cache.get<Record<string, ItemConfig>>(eventId);
}

/**
 * Gets the currencies for the event
 */
export function getCurrencies(eventId: string) {
  //#region GET CURRENCIES
  return cache.get<Record<string, CurrencyType>>(`/currencies/${eventId}`);
}
