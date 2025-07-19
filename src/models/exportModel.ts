import { v4 as uuid } from "uuid";
import format from "pg-format";
import { type EventReport } from "../types";

const exportKeys: Array<keyof Omit<EventReport, "fileData">> = [
  "company",
  "eventId",
  "eventName",
  "exportId",
  "fileName",
  "lastUpdate",
  "startDate",
];

/**
 * What we are interested in are how much money are in the cash stands.
 * The idea is that a client comes to the event, creates a balance and top ups on that.
 * This essentially is all the money of the event. Some of that is "used" on the bars and some remains on the cards.
 * The total of the money needs a couple of queries to get right since there a couple of different cases:
 *
 *    1. A normal client that creates a one time balance in the event
 * In that case the process is simple we get how much they left as an initial amount and we add the top ups on top
 *
 *    2. Bonus balances and staff balances
 * Bonus balances are not actual money in the event, when counting the money they need to be removed
 *
 *    3. Fidelity cards
 * The fidelity cards can move freely through different events, so this case is a little different. I need to
 * count the card's initial amount only if it is created in the related event. Otherwise I just need to get the top ups
 *
 * Another thing that we are interested in is how much each stand sold, not in terms of money, but
 * in terms of quantity. We need to be able to see who sold how much in order to regulate the inventory
 */

export function exportAnalyticsModel(eventId: string, company: string) {
  //#region EXPORT ANALYTICS
  return {
    listedItems: format(
      `SELECT t."memberName" AS "Member Name", t."itemName" AS "Item Name", SUM(t.quantity) AS "Amount Sold", SUM(t.amount) AS "Total" FROM transactions t INNER JOIN balances b ON t."scanId"=b."scanId" WHERE t."eventId"=%L AND t.company=%L GROUP BY t."memberName", "itemName" ORDER BY t."memberName", t."itemName"`,
      eventId,
      company
    ),
    eventInitialAmounts: format(
      `SELECT COUNT(b."createdBy") AS "Balances Created", SUM(b."initialAmount"*c."marketRate") AS "Initial Amount", b."createdBy" AS "Top Up" FROM balances b LEFT OUTER JOIN currencies c ON b."activationCurrency"=c."currency" WHERE b."eventCreated"=%L AND c."eventId"=%L AND b.company=%L AND b."isBonus"=false GROUP BY b."createdBy"`,
      eventId,
      eventId,
      company
    ),
    eventTopUps: format(
      `SELECT COUNT(t."topUpId") AS "Number Of Top Ups", AVG(t."topUpAmount"*c."marketRate") AS "Average Top Up", SUM(t."topUpAmount"*c."marketRate") AS "Top Up Amount", (CASE WHEN m."userClass"=%L THEN %L ELSE t."memberName" END) AS "Top Up" FROM top_ups t LEFT OUTER JOIN currencies c ON t."topUpCurrency"=c."currency" AND t."eventId"=c."eventId" INNER JOIN balances b ON t."scanId"=b."scanId" full outer join staff_members m on t."memberId"=m."memberId" WHERE t."eventId"=%L AND t.company=%L GROUP BY t."memberName", m."userClass" ORDER BY "Number Of Top Ups" DESC`,
      +process.env.ADMIN_CLASS,
      process.env.ADMIN_NAME_DESCRIPTOR,
      eventId,
      company
    ),
    balanceAnalytics: format(
      `SELECT SUM(CASE WHEN b."isFidelityCard"=false THEN b.balance END) AS "Left In Balances", AVG(b."initialAmount"*c."marketRate") AS "Average Initial Amount", COUNT(CASE WHEN b."isFidelityCard"=true THEN b."balanceId" END) AS "New Clients", AVG(b."activationCost") AS "Average Activation" FROM balances b LEFT OUTER JOIN currencies c ON b."activationCurrency"=c."currency" AND b."eventCreated"=c."eventId" WHERE b."eventCreated"=%L AND b.company=%L AND b."isBonus"=false`,
      eventId,
      company
    ),
    bartenderAnalytics: format(
      `SELECT t."memberName" AS "Member Name", SUM(t.amount) AS "Total", COUNT(t."memberName") AS "Number Of Transactions", SUM(t.quantity) AS "Items Sold" FROM transactions t INNER JOIN balances b ON t."scanId"=b."scanId" WHERE t."eventId"=%L AND t.company=%L GROUP BY t."memberName" ORDER BY "Items Sold" DESC`,
      eventId,
      company
    ),
    bonusAnalytics: format(
      `SELECT SUM(t."amount") AS "Bonus Total", SUM(t."quantity") AS "Bonus Items", t."scanId" AS "Scan Id", s."memberName" AS "Staff" FROM transactions t INNER JOIN balances b ON t."scanId"=b."scanId" FULL OUTER JOIN staff_members s ON b."memberId"=s."memberId" WHERE t."eventId"=%L AND t."company"=%L AND b."isBonus"=true GROUP BY "Scan Id", "Staff" ORDER BY "Staff" ASC, "Bonus Total" DESC, "Bonus Items" DESC`,
      eventId,
      company
    ),
    clientsAnalytics: format(
      `SELECT c."clientName" as "Name", c."clientEmail" as "Email", SUM(t."amount") AS "Client Total", SUM(t."quantity") AS "Client Items", (CASE WHEN b."eventCreated"=%L THEN 'New Client' ELSE 'Existing Client' END) AS "Client Type" FROM transactions t INNER JOIN balances b ON t."scanId"=b."scanId" AND t."eventId"=b."eventId" FULL OUTER JOIN clients c ON b."balanceId"=c."balanceId" WHERE t."eventId"=%L AND t."company"=%L AND b."isFidelityCard"=true GROUP BY "Name", "Email", "Client Type" ORDER BY "Client Total" DESC, "Client Items" DESC, "Name" ASC`,
      eventId,
      eventId,
      company
    ),
    adminCreatedAnalytics: format(
      `SELECT COUNT(b."balanceId") AS "Balances Created", SUM(b."initialAmount"*c."marketRate") AS "Initial Amount" FROM balances b INNER JOIN currencies c ON b."eventId"=c."eventId" WHERE b."eventId"=%L AND b.company=%L AND b."activationCurrency"=c."currency" AND b."isBonus"=true`,
      eventId,
      company
    ),
  };
}

interface GetLastSaveForProject {
  eventId: string;
  company: string;
}

export function checkLastSaveForEvent(param: GetLastSaveForProject) {
  //#region CHECK SAVE
  return format(
    "select %I from event_exports where %I=%L and %I=%L limit 1",
    "exportId",
    "eventId",
    param.eventId,
    "company",
    param.company
  );
}

export function getLastSaveForEvent(param: GetLastSaveForProject) {
  //#region GET LAST SAVE
  return format(
    "select * from event_exports where %I=%L and %I=%L limit 1",
    "eventId",
    param.eventId,
    "company",
    param.company
  );
}

export function saveFileData(
  param: Pick<EventReport, "company" | "eventId" | "fileData">
) {
  const { company, eventId, fileData } = param;

  return format(
    `insert into event_exports("eventId", "company", "fileData", "lastUpdate", "fileName", "exportId", "eventName", "startDate") select "eventId", %L, %L, now(), concat_ws('_', replace(lower("eventName"), ' ', '_'), extract(year from "startDate"), extract(month from "startDate"), extract(day from "startDate")), %L, "eventName", "startDate" from events where "eventId"=%L and "company"=%L`,
    company,
    fileData,
    uuid(),
    eventId,
    company
  );
}

interface UpdateExport
  extends Partial<Omit<EventReport, "lastUpdate" | "exportId" | "fileName">> {
  eventId: string;
  company: string;
}

export function updateFileData(data: UpdateExport) {
  const { company, eventId, fileData } = data;

  const updateQuery = format("update event_exports set ");
  const updateFilter = format(
    " where %I=%L and %I=%L",
    "eventId",
    eventId,
    "company",
    company
  );
  const updates: string[] = [];

  if (fileData) {
    updates.push(format("%I=%L", "fileData", fileData));
  }

  updates.push(format("%I=%L", "lastUpdate", new Date().toISOString()));

  return updateQuery + updates.join(", ") + updateFilter;
}

interface GetAllReportsParam {
  company: string;
}

export function getAllReportsModel(param: GetAllReportsParam) {
  const { company } = param;

  return format(
    "select %I from event_exports where %I=%L",
    exportKeys,
    "company",
    company
  );
}
