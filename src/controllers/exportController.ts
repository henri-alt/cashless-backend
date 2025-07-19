import { Request, Response } from "express";
import { utils, write } from "xlsx";
import { query } from "../providers";
import { exportModel } from "../models";
import { exportHeaders } from "../data";
import { toCamel } from "../utils";
import { EventReport } from "../types";

//#region TYPES
// grouped list
type ListedItem = {
  "Member Name": string;
  "Item Name": string;
  "Amount Sold": number;
  Total: number;
};

// grouped list
interface InitialAmount {
  "Balances Created": number;
  "Initial Amount": number;
  "Top Up": string;
}

// grouped list
interface TopUpType {
  "Number Of Top Ups": number;
  "Average Top Up": number;
  "Top Up Amount": number;
  "Top Up": string;
}

// singe item
interface BalanceAnalytic {
  "Left In Balances": number;
  "Average Initial Amount": number;
  "New Clients": number;
  "Average Activation": number;
}

// grouped list
interface BartenderAnalytic {
  "Member Name": string;
  Total: number;
  "Number Of Transactions": number;
  "Items Sold": number;
}

interface BonusAnalytic {
  "Bonus Total": number;
  "Bonus Items": number;
  "Scan Id": string;
  Staff: string | null;
}

interface ClientAnalytic {
  Name: string;
  Email: string;
  "Client Total": number;
  "Client Items": number;
  "Client Type": "New Client" | "Existing Client";
}

type TopUpsOverview = InitialAmount &
  TopUpType & {
    "Total Cash": number;
  };

interface EventOverview extends BalanceAnalytic {
  "Total Cash": number;
  "Total Top Ups": number;
  "Total Balances Created": number;
  "Total Items Sold": number;
  "Transactions Total": number;
  "Most Sold Item": string;
  "Most Active Bartender": string;
  "Most Active Cashier": string;
  "Bonus Items": number;
  "Bonus Total": number;
  "Client Total": number;
  "Client Items": number;
}

function getWidths(rows: any[]) {
  //#region GET WIDTHS
  let objectMaxLength: { width: number }[] = [];

  for (let i = 0; i < rows.length; i++) {
    let value: any[] = Object.values(rows[i]);
    for (let j = 0; j < value.length; j++) {
      const len =
        objectMaxLength[j]?.["width"] >= String(value[j] || "")?.length
          ? objectMaxLength[j]?.["width"]
          : (value[j] || "").length;

      objectMaxLength[j] = { width: len };
    }
  }

  return objectMaxLength.map((e) => ({ width: e.width + 2 }));
}

function normalizeRows(rows: any[], headers: any[]) {
  //#region NORMALIZE ROWS
  let arr = rows.map((e) => {
    let t: Record<string, any> = {};
    for (const key of headers) {
      let el = e[key as keyof typeof e];
      t[key] =
        el === null
          ? ""
          : !isNaN(+el) && Math.abs(+el) < Infinity
          ? +Number(el).toFixed(2)
          : el || "";
    }

    return t;
  });

  let hd = headers.reduce((acc, val) => ({ ...acc, [val]: val }), {});
  return [hd].concat(arr);
}

export async function exportController(req: Request, res: Response) {
  //#region GET TOTALS
  const eventId: string = req.params?.eventId;
  const company: string = res.locals?.company;

  const models = exportModel.exportAnalyticsModel(eventId, company);

  const [
    listedItemsRes,
    initialAmountsRes,
    eventTopTupsRes,
    balanceAnalyticsRes,
    bartenderAnalyticsRes,
    bonusAnalyticRes,
    clientAnalyticsRes,
    adminCreatedRes,
  ] = await Promise.all([
    query<ListedItem>(models.listedItems),
    query<InitialAmount>(models.eventInitialAmounts),
    query<TopUpType>(models.eventTopUps),
    query<BalanceAnalytic>(models.balanceAnalytics),
    query<BartenderAnalytic>(models.bartenderAnalytics),
    query<BonusAnalytic>(models.bonusAnalytics),
    query<ClientAnalytic>(models.clientsAnalytics),
    query<Pick<InitialAmount, "Balances Created" | "Initial Amount">>(
      models.adminCreatedAnalytics
    ),
  ]);

  const tmpListedItems = [...listedItemsRes.rows];
  tmpListedItems.sort((a, b) => b["Amount Sold"] - a["Amount Sold"]);

  let eventOverview: EventOverview = {
    ...balanceAnalyticsRes.rows[0],
    "Total Cash": 0,
    "Total Top Ups": 0,
    "Total Balances Created": 0,
    "Total Items Sold": 0,
    "Transactions Total": 0,
    "Most Sold Item": tmpListedItems.at(0)?.["Item Name"] || "",
    "Most Active Bartender":
      bartenderAnalyticsRes.rows?.[0]?.["Member Name"] || "",
    "Most Active Cashier": eventTopTupsRes?.rows?.[0]?.["Top Up"] || "",
    "Bonus Items": 0,
    "Bonus Total": 0,
    "Client Items": 0,
    "Client Total": 0,
  };

  let topUpAnalytics: TopUpsOverview[] = [];

  let totalBalancesCreated = 0,
    topUpCount = 0,
    totalCash = 0,
    totalItemsSold = 0,
    transactionsTotal = 0,
    bonusItems = 0,
    bonusTotal = 0,
    clientItems = 0,
    clientTotal = 0;

  for (const row of clientAnalyticsRes.rows) {
    clientItems += Number(row["Client Items"]) || 0;
    clientTotal += Number(row["Client Total"]) || 0;
  }

  for (const row of bonusAnalyticRes.rows) {
    bonusTotal += Number(row["Bonus Total"]) || 0;
    bonusItems += Number(row["Bonus Items"]) || 0;
  }

  for (const row of listedItemsRes.rows) {
    totalItemsSold += Number(row["Amount Sold"]) || 0;
    transactionsTotal += Number(row["Total"]) || 0;
  }

  for (const row of initialAmountsRes.rows) {
    totalBalancesCreated =
      totalBalancesCreated + Number(row["Balances Created"]) || 0;
    totalCash += Number(row["Initial Amount"]) || 0;
  }

  const adminCreated = adminCreatedRes.rows.at(0);

  for (const row of eventTopTupsRes.rows) {
    // top ups from the admins are not counted as cash
    const isAdminTopUp = row["Top Up"] === process.env.ADMIN_NAME_DESCRIPTOR;

    if (!isAdminTopUp) {
      topUpCount = topUpCount + (Number(row["Number Of Top Ups"]) || 0);
      totalCash = totalCash + (Number(row["Top Up Amount"]) || 0);
    }

    const tp = initialAmountsRes.rows.find(
      (e) => e["Top Up"] === row["Top Up"]
    );

    if (!tp) {
      topUpAnalytics.push({
        "Average Top Up": Number(row["Average Top Up"]),
        "Number Of Top Ups": Number(row["Number Of Top Ups"]),
        "Top Up Amount": Number(row["Top Up Amount"]),
        "Top Up": row["Top Up"],
        "Balances Created": isAdminTopUp
          ? Number(adminCreated["Balances Created"])
            ? Number(adminCreated["Balances Created"])
            : 0
          : 0,
        "Initial Amount": isAdminTopUp
          ? Number(adminCreated["Initial Amount"])
            ? Number(adminCreated["Initial Amount"])
            : 0
          : 0,
        "Total Cash": isAdminTopUp ? 0 : Number(row["Top Up Amount"]) || 0,
      });
    } else {
      topUpAnalytics.push({
        ...{
          "Average Top Up": Number(row["Average Top Up"]),
          "Number Of Top Ups": Number(row["Number Of Top Ups"]),
          "Top Up Amount": Number(row["Top Up Amount"]),
          "Top Up": row["Top Up"],
        },
        ...{
          "Balances Created": Number(tp["Balances Created"]),
          "Initial Amount": Number(tp["Initial Amount"]),
          "Top Up": tp["Top Up"],
        },
        "Total Cash": isAdminTopUp
          ? 0
          : (Number(tp["Initial Amount"]) || 0) +
            (Number(row["Top Up Amount"]) || 0),
      });
    }
  }

  for (const row of initialAmountsRes.rows) {
    if (!topUpAnalytics.find((e) => e["Top Up"] === row["Top Up"])) {
      topUpAnalytics.push({
        "Average Top Up": 0,
        "Balances Created": Number(row["Balances Created"]),
        "Initial Amount": Number(row["Initial Amount"]),
        "Number Of Top Ups": 0,
        "Top Up Amount": 0,
        "Top Up": row["Top Up"],
        "Total Cash": Number(row["Initial Amount"]),
      });
    }
  }

  topUpAnalytics.sort((a, b) => {
    if (a["Top Up"] === process.env.ADMIN_NAME_DESCRIPTOR) {
      return 1;
    } else if (b["Top Up"] === process.env.ADMIN_NAME_DESCRIPTOR) {
      return -1;
    }

    return a["Total Cash"] - b["Total Cash"];
  });

  eventOverview["Left In Balances"] =
    Number(eventOverview["Left In Balances"]) || 0;
  eventOverview["Average Initial Amount"] =
    Number(eventOverview["Average Initial Amount"]) || 0;
  eventOverview["Average Activation"] =
    Number(eventOverview["Average Activation"]) || 0;
  eventOverview["New Clients"] = Number(eventOverview["New Clients"]) || 0;
  eventOverview["Total Cash"] = totalCash;
  eventOverview["Total Top Ups"] = topUpCount;
  eventOverview["Total Balances Created"] = totalBalancesCreated;
  eventOverview["Total Items Sold"] = totalItemsSold;
  eventOverview["Transactions Total"] = transactionsTotal;
  eventOverview["Bonus Items"] = bonusItems;
  eventOverview["Bonus Total"] = bonusTotal;
  eventOverview["Client Items"] = clientItems;
  eventOverview["Client Total"] = clientTotal;

  const itemsSet = new Set<string>();

  const groupedItems = listedItemsRes.rows.reduce((acc, val) => {
    const item = val["Item Name"];
    const cashier = val["Member Name"];
    const sold = Number(val["Amount Sold"] || 0) || 0;
    const total = Number(val.Total || 0) || 0;

    const tmp = { ...acc };

    if (!(cashier in tmp)) {
      tmp[cashier] = {
        [item]: {
          sold: 0,
          total: 0,
        },
      };
    }

    if (!(item in tmp?.[cashier])) {
      tmp[cashier][item] = { sold: 0, total: 0 };
    }

    tmp[cashier][item]["sold"] =
      Number(tmp[cashier][item]["sold"] || 0) + Number(sold);
    tmp[cashier][item]["total"] =
      Number(tmp[cashier][item]["total"]) + Number(total);

    itemsSet.add(item);
    return tmp;
  }, {} as Record<string, Record<string, { sold: number; total: number }>>);

  const uniqueItems = Array.from(itemsSet);
  const itemsHeaders: string[] = ["Bartender", ...uniqueItems].concat([
    "Total Sold",
    "Total",
  ]);

  const itemsRows: any[] = [];

  for (const cashier in groupedItems) {
    const tmp: any = {};
    tmp["Bartender"] = cashier;
    let total = 0;
    let sold = 0;

    for (const item of uniqueItems) {
      if (!(item in groupedItems[cashier])) {
        tmp[item] = 0;
      } else {
        const { sold: s, total: t } = groupedItems[cashier][item];
        sold = Number(sold) + Number(s);
        total = Number(total) + Number(t);
        tmp[item] = Number(s);
      }
    }

    tmp["Total Sold"] = sold;
    tmp["Total"] = total;

    itemsRows.push(tmp);
  }

  return {
    eventOverview: normalizeRows([eventOverview], exportHeaders.overview)
      .slice(1)
      .at(0),
    itemsAnalytics: normalizeRows(itemsRows, itemsHeaders).slice(1),
    topUpAnalytics: normalizeRows(topUpAnalytics, exportHeaders.topUps).slice(
      1
    ),
    bartenderAnalytics: normalizeRows(
      bartenderAnalyticsRes.rows,
      exportHeaders.bartenders
    ).slice(1),
    bonusAnalytics: normalizeRows(
      bonusAnalyticRes.rows,
      exportHeaders.bonus
    ).slice(1),
    clientAnalytics: normalizeRows(
      clientAnalyticsRes.rows,
      exportHeaders.clients
    ).slice(1),
  };
}

export async function excelExportController(req: Request, res: Response) {
  try {
    //#region CREATED BOOK
    const {
      bartenderAnalytics,
      bonusAnalytics,
      clientAnalytics,
      eventOverview,
      itemsAnalytics,
      topUpAnalytics,
    } = await exportController(req, res);

    const workbook = utils.book_new();
    const eventId: string = req.params?.eventId;
    const company: string = res.locals?.company;

    // overview
    const overviewData = normalizeRows([eventOverview], exportHeaders.overview);
    const overviewSheet = utils.json_to_sheet(overviewData.slice(1), {
      header: exportHeaders.overview,
    });
    overviewSheet["!cols"] = getWidths(overviewData);

    // items
    const defaultItemsCols = ["Bartender", "Total Sold", "Total"];
    const itemsCols: string[] = [];
    if (itemsAnalytics.length) {
      const [analytic] = itemsAnalytics;
      for (const key in analytic) {
        itemsCols.push(key);
      }
    }

    const header = itemsCols.length ? itemsCols : defaultItemsCols;

    const totalsSheet = utils.json_to_sheet(itemsAnalytics, {
      header,
    });
    totalsSheet["!cols"] = getWidths(
      [header.reduce((acc, val) => ({ ...acc, [val]: val }), {})].concat(
        itemsAnalytics
      )
    );

    // top ups
    const topUpsData = normalizeRows(topUpAnalytics, exportHeaders.topUps);
    const topUpsSheet = utils.json_to_sheet(topUpsData.slice(1), {
      header: exportHeaders.topUps,
    });
    topUpsSheet["!cols"] = getWidths(topUpsData);

    // bartenders
    const barData = normalizeRows(bartenderAnalytics, exportHeaders.bartenders);
    const barSheet = utils.json_to_sheet(barData.slice(1), {
      header: exportHeaders.bartenders,
    });
    barSheet["!cols"] = getWidths(barData);

    // bonus
    const bonusData = normalizeRows(bonusAnalytics, exportHeaders.bonus);
    const bonusSheet = utils.json_to_sheet(bonusData.slice(1), {
      header: exportHeaders.bonus,
    });
    bonusSheet["!cols"] = getWidths(bonusData);

    // clients
    const clientsData = normalizeRows(clientAnalytics, exportHeaders.clients);
    const clientSheet = utils.json_to_sheet(clientsData.slice(1), {
      header: exportHeaders.clients,
    });
    clientSheet["!cols"] = getWidths(clientsData);

    utils.book_append_sheet(workbook, overviewSheet, "Event Overview");
    utils.book_append_sheet(workbook, topUpsSheet, "Top Ups");
    utils.book_append_sheet(workbook, barSheet, "Bartenders");
    utils.book_append_sheet(workbook, clientSheet, "Clients");
    utils.book_append_sheet(workbook, totalsSheet, "Menu Totals");
    utils.book_append_sheet(workbook, bonusSheet, "Bonus");

    const bookData: Buffer = write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const existingReport = await query(
      exportModel.checkLastSaveForEvent({
        company,
        eventId,
      })
    );

    if (!existingReport.rowCount) {
      await query(
        exportModel.saveFileData({
          company,
          eventId,
          fileData: bookData,
        })
      );
    } else {
      await query(
        exportModel.updateFileData({
          company,
          eventId,
          fileData: bookData,
        })
      );
    }

    //#region EXPORT
    res
      .status(200)
      .set(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
      .send(bookData);
  } catch (err) {
    console.log("Export error error:\n\n", err);
    res.status(500).send(err);
  }
}

function transformAnalytics<T = any>(data: any[]): T[] {
  //#region TRANSFORM ANALYTICS
  if (!data.length) {
    return [];
  }

  const rows: T[] = [];
  const schema: Record<string, string> = {};

  const [row] = data;
  for (const key in row) {
    schema[key] = toCamel(key);
  }

  for (const analytic of data) {
    let tmpRow: Record<string, any> = {};
    for (const key in schema) {
      tmpRow[schema[key]] = analytic[key];
    }

    rows.push(tmpRow as T);
  }

  return rows;
}

export async function analyticsExportController(req: Request, res: Response) {
  try {
    //#region EXPORT ANALYTICS
    const {
      bartenderAnalytics: bar,
      bonusAnalytics: bonus,
      clientAnalytics: client,
      eventOverview: event,
      itemsAnalytics: items,
      topUpAnalytics: topUps,
    } = await exportController(req, res);

    const bartenderAnalytics = transformAnalytics(bar);
    const bonusAnalytics = transformAnalytics(bonus);
    const clientAnalytics = transformAnalytics(client);
    const [eventOverview] = transformAnalytics([event]);
    const itemsAnalytics = transformAnalytics(items);
    const topUpAnalytics = transformAnalytics(topUps);

    res.status(200).send({
      bartenderAnalytics,
      bonusAnalytics,
      clientAnalytics,
      eventOverview,
      itemsAnalytics,
      topUpAnalytics,
    });
  } catch (err) {
    console.log("Export analytics error: ", err);

    res.status(500).send(err);
  }
}

export async function getExportReportController(req: Request, res: Response) {
  //#region EXPORT REPORT
  const eventId: string = req.params?.eventId;
  const company: string = res.locals?.company;

  try {
    const report = await query<EventReport>(
      exportModel.getLastSaveForEvent({
        company,
        eventId,
      })
    );

    if (!report.rowCount) {
      res.status(404).json("Report was not found");
      return;
    }

    res.status(200).send(report.rows.at(0));
  } catch (err) {
    console.log("Error getting report: ", err);

    res.status(500).send(err);
  }
}

export async function getAllReportsController(req: Request, res: Response) {
  //#region GET ALL REPORTS
  const company: string = res.locals?.company;

  try {
    const reportsRes = await query<EventReport>(
      exportModel.getAllReportsModel({ company })
    );

    res.status(200).send(reportsRes.rows);
  } catch (err) {
    console.log("Error getting report: ", err);

    res.status(500).send(err);
  }
}
