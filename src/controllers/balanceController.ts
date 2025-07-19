import { Request, Response } from "express";
import { v4 } from "uuid";
import crypto from "bcryptjs";
import {
  AdminType,
  BalanceType,
  GetBalancesQuery,
  PatchBalanceRequest,
  CreateBalanceRequest,
  CreateStaffBalanceRequest,
  GetBalancesResponse,
} from "../types";
import { cacheHandlers } from "../utils";
import { balancesModel, paginationModel } from "../models";
import { initClient, query } from "../providers";
import { ExplanationType } from "../models/paginationModel";

export async function getBalancesController(req: Request, res: Response) {
  //#region GET BALANCES
  const company: string = res.locals?.company;

  let {
    balanceId,
    eventId,
    isFidelityCard,
    lastId,
    memberId,
    pageSize,
    scanId,
    ticketId,
    createdBy,
    page = 0,
  }: GetBalancesQuery = req.query;

  pageSize = Number(pageSize) || 30;
  isFidelityCard =
    isFidelityCard === "true"
      ? true
      : isFidelityCard === "false"
      ? false
      : undefined;

  try {
    const getQuery = balancesModel.getBalanceModel({
      company,
      balanceId,
      eventId,
      isFidelityCard,
      lastId,
      memberId,
      pageSize,
      scanId,
      ticketId,
      createdBy,
      page,
    });

    const [explanation, queryRes] = await Promise.all([
      query<ExplanationType>(paginationModel.explain(getQuery)),
      query<BalanceType>(getQuery),
    ]);

    const rowNum = paginationModel.count(explanation.rows);

    const response: GetBalancesResponse = {
      balances: queryRes.rows,
      pagination: {
        page: Number(page),
        pages: Math.ceil(rowNum / pageSize),
        pageSize: Number(pageSize),
        totalRows: rowNum,
        nextPageParam: queryRes.rows.at(-1)?.balanceId,
        prevPageParam: queryRes.rows.at(0)?.balanceId,
      },
    };

    res.status(200).send(response);
  } catch (err) {
    console.log("Get balances error:\n\n", err);
    res.status(500).send(err);
  }
}

export async function createBalanceController(req: Request, res: Response) {
  //#region CREATE BALANCE
  const company: string = res.locals?.company;
  const memberId: string = res.locals?.memberId;
  const userClass: number = res.locals?.userClass;
  const memberName: string = res.locals?.memberName;
  const tokenEventId: string = res.locals?.eventId || "";

  const {
    balance,
    isFidelityCard = false,
    scanId,
    eventId = null,
    ticketId = null,
    activationCurrency,
  }: CreateBalanceRequest = req.body;

  if (!scanId) {
    res.status(403).json("Bad request! Missing required scanId");
    return;
  }

  if (!activationCurrency) {
    res.status(403).json("Bad request! Missing currency");
    return;
  }

  const currencies = cacheHandlers.getCurrencies(eventId);

  const eventDefaultCurrency = Object.values(currencies).find(
    (e) => e.isDefault
  );
  if (!eventDefaultCurrency) {
    res.status(403).json("Event currency not found");
    return;
  }

  const rate = Number(currencies?.[activationCurrency]?.["rate"]);

  if (!rate || Math.abs(rate) === Infinity) {
    res.status(403).json("Bad request! Currency not found!");
    return;
  }

  try {
    const balanceId = v4();
    let activationCost = 0;
    const isBonus = userClass === +process.env.ADMIN_CLASS;

    // if (!isBonus) {
    const event = cacheHandlers.getEvent(eventId);

    if (isFidelityCard) {
      activationCost = Number(event.cardPrice) || 0;
    } else {
      if (scanId !== ticketId) {
        if (scanId && ticketId) {
          activationCost =
            (Number(event.ticketPrice) || 0) + (Number(event.tagPrice) || 0);
        } else if (ticketId) {
          activationCost = Number(event.ticketPrice) || 0;
        } else if (scanId) {
          activationCost =
            (Number(event.ticketPrice) || 0) + (Number(event.tagPrice) || 0);
        }
      } else {
        if (scanId && !ticketId) {
          activationCost = Number(event.tagPrice) || 0;
        } else if (!scanId && !!ticketId) {
          activationCost = Number(event.ticketPrice) || 0;
        } else {
          activationCost = Number(event.ticketPrice) || 0;
        }
      }
    }
    // }

    const finalBalance: number =
      Number(balance) * Number(rate) - Number(activationCost);
    if (finalBalance < 0) {
      res.status(403).json("Cannot create balance, insufficient amount!");
      return;
    }

    if (isNaN(Number(event.activationMinimum))) {
      res
        .status(403)
        .json(
          "Activation minimum was not found. Please add activation minimum and try again"
        );
      return;
    }

    if (Number(balance) * Number(rate) < Number(event.activationMinimum)) {
      res
        .status(403)
        .json(
          `Amount needs to be greater than ${event.activationMinimum} ${eventDefaultCurrency.currency}!`
        );
      return;
    }

    await query(
      balancesModel.createBalanceModel({
        balance: balance * rate - activationCost,
        balanceId,
        company,
        isFidelityCard,
        scanId,
        eventId: isFidelityCard ? null : tokenEventId || eventId,
        memberId: null,
        ticketId,
        createdAt: new Date().toISOString(),
        createdBy: memberName,
        initialAmount: balance,
        isBonus,
        activationCost,
        eventCreated: tokenEventId || eventId,
        activationCurrency,
        createdById: memberId,
        eventCurrency: eventDefaultCurrency.currency,
      })
    );

    res.status(200).send({ balanceId });
  } catch (err) {
    console.log("Create balance error:\n\n", err);

    if (err instanceof Error) {
      if (err.message.includes("duplicate")) {
        if (err.message.includes("scanId")) {
          res.status(406).json("Tag is already registered");
        } else if (err.message.includes("balance")) {
          res.status(406).json("Balance already exists");
        }

        return;
      }
    }

    res.status(500).send(err);
  }
}

export async function patchBalanceController(req: Request, res: Response) {
  //#region PATCH BALANCE
  const { id } = req.params;
  const company: string = res.locals?.company;

  const { balance, memberId, scanId, activationCurrency }: PatchBalanceRequest =
    req.body;
  if (!balance && !memberId && !scanId && !activationCurrency) {
    res.status(400).json("Bad request! Empty body");
    return;
  }

  if (balance) {
    if (isNaN(+balance) || +balance < 0) {
      res.status(400).json("Bad request! Invalid balance");
      return;
    }
  }

  try {
    await query(
      balancesModel.patchBalanceModel(
        {
          balanceId: id,
          balance,
          memberId,
          scanId,
        },
        company
      )
    );

    res.status(200).send();
  } catch (err) {
    console.log("Patch balance error:\n\n", err);
    res.status(500).send(err);
  }
}

export async function deleteSingleBalanceController(
  req: Request,
  res: Response
) {
  //#region DELETE BALANCE
  const { id } = req.params;
  const company: string = res.locals?.company;
  let client;

  try {
    client = await initClient();

    await client.query("BEGIN");

    const balanceRes = await client.query<BalanceType>(
      balancesModel.getBalanceModel({
        balanceId: id,
        company,
        pageSize: 1,
      })
    );

    if (!balanceRes.rowCount) {
      res.status(404).json("Balance was not found");
      await client.query("ROLLBACK");
      return;
    }

    const [balance] = balanceRes.rows;

    await client.query(balancesModel.deleteTopUp(balance.scanId, company));

    const result = await client.query(
      balancesModel.deleteSingleBalanceModel(id, company)
    );

    if (!result.rowCount) {
      res
        .status(403)
        .json("Could not delete balance! This is a client's balance");
      await client.query("ROLLBACK");
      return;
    }

    await client.query("COMMIT");

    res.status(200).send();
  } catch (err) {
    console.log("Delete balance error:\n\n", err);

    if (client) {
      await client.query("ROLLBACK");
    }

    res.status(500).send(err);
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function deleteEventBalances(req: Request, res: Response) {
  //#region EVENT BALANCES
  const { id } = req.params;
  const company: string = res.locals?.company;
  let client;

  try {
    client = await initClient();

    await client.query("BEGIN");
    await client.query(balancesModel.deleteEventTopUps(id, company));
    await client.query(balancesModel.deleteEventBalances(id, company));
    await client.query("COMMIT");

    res.status(200).send();
  } catch (err) {
    console.log("Delete balances error:\n\n", err);
    if (client) {
      await client.query("ROLLBACK");
    }

    res.status(500).send(err);
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function getBalanceByScanController(req: Request, res: Response) {
  //#region GET SCAN BALANCE
  const { scanId } = req.params;
  const eventId: string = res.locals?.eventId || "";
  const company: string = res.locals?.company || "";

  try {
    const balanceRes = await query<
      Pick<
        BalanceType,
        | "balance"
        | "eventId"
        | "isFidelityCard"
        | "memberId"
        | "balanceId"
        | "scanId"
        | "isBonus"
        | "activationCurrency"
        | "eventCreated"
        | "eventCurrency"
      >
    >(balancesModel.getScanBalanceModel(scanId, company));

    if (!balanceRes.rowCount) {
      res.status(404).json("Balance was not found");
      return;
    }

    const [balance] = balanceRes.rows;
    if (!balance.isFidelityCard) {
      if (eventId && balance.eventId !== eventId) {
        res.status(404).json("Balance was not registered in this event");
        return;
      }
    }

    res.status(200).send(balance);
  } catch (err) {
    console.log("Get balance error:\n\n", err);
    res.status(500).send(err);
  }
}

export async function createStaffBalanceController(
  req: Request,
  res: Response
) {
  //#region CREATE STAFF BALANCE
  const company: string = res.locals.company || "";
  const memberId: string = res.locals.memberId || "";
  const memberName: string = res.locals.memberName || "";

  const {
    adminPassword,
    balance,
    isFidelityCard,
    scanId,
    eventId,
    ticketId,
    activationCurrency,
  } = req.body as CreateStaffBalanceRequest;

  if (!scanId) {
    res.status(403).json("Bad request! Missing required scanId");
    return;
  }

  if (!adminPassword) {
    res.status(403).json("Bad request! Missing required admin password");
    return;
  }

  if (!activationCurrency) {
    res.status(403).json("Bad request! Missing required activation currency");
    return;
  }

  const currencies = cacheHandlers.getCurrencies(eventId);

  const eventDefaultCurrency = Object.values(currencies).find(
    (e) => e.isDefault
  );
  if (!eventDefaultCurrency) {
    res.status(403).json("Event currency not found");
    return;
  }

  const rate = Number(currencies?.[activationCurrency]?.["rate"]);
  if (!rate || Math.abs(rate) === Infinity) {
    res.status(403).json("Bad request! Currency not found!");
    return;
  }

  try {
    const companyAdmins = await query<AdminType>(
      balancesModel.getCompanyAdmin(company)
    );

    if (!companyAdmins.rowCount) {
      res.status(404).json("Admin was not found");
      return;
    }

    let createdByAdmin: string = "";

    let verified: boolean = false;
    for (const admin of companyAdmins.rows) {
      verified = await crypto.compare(adminPassword, admin.memberPassword);
      if (verified) {
        createdByAdmin = admin.memberId;
        break;
      }
    }

    if (!verified) {
      res.status(401).json("Could not authenticate admin");
      return;
    }

    const balanceId = v4();

    await query(
      balancesModel.createBalanceModel({
        balance: balance * rate,
        balanceId,
        company,
        isFidelityCard,
        scanId,
        eventId,
        memberId,
        ticketId: ticketId || scanId,
        createdAt: new Date().toISOString(),
        createdBy: memberName,
        initialAmount: balance,
        isBonus: true,
        activationCost: 0,
        eventCreated: eventId,
        activationCurrency,
        createdById: createdByAdmin,
        eventCurrency: eventDefaultCurrency.currency,
      })
    );

    res.status(200).send({ balanceId });
  } catch (err) {
    console.log("Create staff balance error:\n\n", err);
    res.status(500).send(err);
  }
}
