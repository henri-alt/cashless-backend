import { Request, Response } from "express";
import { v4 } from "uuid";
import { query, initClient } from "../providers";
import {
  ClientRow,
  ClientType,
  BalanceType,
  GetClientQuery,
  PatchClientRequest,
  CreateClientRequest,
  GetClientResponse,
} from "../types";
import { balancesModel, clientModel, paginationModel } from "../models";
import { cacheHandlers } from "../utils";
import { type ExplanationType } from "../models/paginationModel";

export async function getClientsController(req: Request, res: Response) {
  //#region GET CLIENTS
  const company: string = res.locals?.company;
  let {
    lastId,
    clientId,
    pageSize,
    balanceId,
    clientName,
    clientEmail,
    page,
  }: GetClientQuery = req.query;
  pageSize = Number(pageSize) || 30;

  try {
    const getQuery = clientModel.getClientModel({
      company,
      lastId,
      pageSize,
      balanceId,
      clientEmail,
      clientId,
      clientName,
      page,
    });

    const [explanation, queryRes] = await Promise.all([
      query<ExplanationType>(paginationModel.explain(getQuery)),
      query<ClientRow>(getQuery),
    ]);

    const rowNum = paginationModel.count(explanation.rows);

    const response: GetClientResponse = {
      pagination: {
        page: Number(page) || 0,
        pages: Math.ceil(rowNum / Number(pageSize)),
        pageSize: Number(pageSize),
        totalRows: rowNum,
        nextPageParam: queryRes.rows.at(-1)?.clientId,
        prevPageParam: queryRes.rows.at(0)?.clientId,
      },
      clients: queryRes.rows,
    };

    res.status(200).send(response);
  } catch (err) {
    console.log("Get clients error:\n\n", err);
    res.status(500).send(err);
  }
}

export async function createClientController(req: Request, res: Response) {
  //#region CREATE CLIENT
  let client;
  try {
    const company: string = res.locals?.company;
    const memberName: string = res.locals?.memberName;
    const eventId: string = res.locals?.eventId;

    const {
      clientEmail,
      clientName,
      balance,
      scanId,
      ticketId,
      activationCurrency,
    } = req.body as CreateClientRequest;

    if (!clientEmail || !clientName) {
      res
        .status(403)
        .json("Bad request! Missing required client email or client name");
      return;
    }

    if (!balance || isNaN(+balance) || +balance <= 0) {
      res.status(403).json("Cannot create client, invalid balance");
      return;
    }

    if (!activationCurrency) {
      res.status(403).json("Cannot create client, invalid activation balance");
      return;
    }

    if (!ticketId || !scanId) {
      res.status(403).json("Cannot create client, ticket/scan id");
      return;
    }

    const existingClientResponse = await query<ClientType>(
      clientModel.checkClientEmailModel(clientEmail)
    );

    if (existingClientResponse.rowCount) {
      res.status(403).json("Cannot register client, email already in use");
      return;
    }

    const event = cacheHandlers.getEvent(eventId);
    const rates = cacheHandlers.getCurrencies(eventId);
    const memberId: string = res.locals?.memberId;
    const moneyRate = Number(rates[activationCurrency]["rate"]) || 0;
    const activationCost = Number(event.cardPrice) || 0;

    client = await initClient();
    await client.query("BEGIN");
    const clientId = v4();
    const balanceId = v4();

    const eventDefaultCurrency = Object.values(rates).find((e) => e.isDefault);
    if (!eventDefaultCurrency) {
      res.status(403).json("Event currency not found");
      return;
    }

    await client.query(
      balancesModel.createBalanceModel({
        activationCost,
        activationCurrency,
        balance: Number(balance) * moneyRate - activationCost,
        balanceId,
        company,
        createdAt: new Date().toISOString(),
        createdBy: memberName,
        eventCreated: eventId,
        initialAmount: +balance,
        isBonus: false,
        isFidelityCard: true,
        scanId,
        eventId: null,
        memberId: null,
        ticketId,
        createdById: memberId,
        eventCurrency: eventDefaultCurrency.currency,
      })
    );
    await client.query(
      clientModel.createClientModel({
        amountSpent: 0,
        balanceId,
        clientEmail,
        clientId,
        clientName,
        company,
        createdAt: new Date().toISOString(),
      })
    );
    await client.query("COMMIT");
    res.status(200).send({ clientId });
  } catch (err) {
    console.log("Create client error:\n\n", err);
    if (client) {
      await client.query("ROLLBACK");
    }

    if (err instanceof Error) {
      const message = err.message;
      if (message.includes("duplicate")) {
        if (message.includes("clientEmail")) {
          res.status(406).json("Email is already in use");
          return;
        } else if (message.includes("scanId")) {
          res.status(406).json("Card is already in use");
          return;
        } else if (message.includes("ticketId")) {
          res.status(406).json("Ticket has already been used");
          return;
        }
      }
    }

    res.status(500).send(err);
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function patchClientController(req: Request, res: Response) {
  //#region UPDATE CLIENT
  const company: string = res.locals?.company;
  const clientId: string = req.params?.id;
  const { balanceId, clientEmail, clientName }: PatchClientRequest = req.body;

  if (!balanceId && !clientEmail && !clientName) {
    res.status(400).json("Bad request! Empty body");
    return;
  }

  try {
    await query(
      clientModel.patchClientModel({
        balanceId,
        clientEmail,
        clientId,
        clientName,
        company,
      })
    );

    res.status(200).send();
  } catch (err) {
    console.log("Update client error:\n\n", err);
    res.status(500).send(err);
  }
}

export async function deleteClientController(req: Request, res: Response) {
  //#region DELETE CLIENT
  let client;
  const company: string = res.locals?.company;
  const clientId: string = req.params?.id;

  try {
    client = await initClient();
    const deleteModels = clientModel.deleteClientModel(clientId, company);

    await client.query("BEGIN");

    const getClient = await client.query<ClientType>(
      clientModel.getClientModel({
        company,
        clientId,
        pageSize: 1,
      })
    );

    if (!getClient.rowCount) {
      throw new Error("Client was not found");
    }

    const getBalance = await client.query<BalanceType>(
      balancesModel.getBalanceModel({
        company,
        balanceId: getClient.rows[0]["balanceId"],
        pageSize: 1,
      })
    );

    if (!getBalance.rowCount) {
      throw new Error("Client balance was not found");
    }

    await client.query(deleteModels.client);
    await client.query(deleteModels.topUps(getBalance.rows[0]["scanId"]));
    await client.query(deleteModels.balance(getClient.rows[0]["balanceId"]));
    await client.query("COMMIT");

    res.status(200).send();
  } catch (err) {
    console.log("Delete client error:\n\n", err);
    if (client) {
      await client.query("ROLLBACK");
    }

    const message: string = "toString" in err ? err.toString() : "";
    if (message) {
      res.status(404).json(message);
    } else {
      res.status(500).send(err);
    }
  } finally {
    if (client) {
      client.release();
    }
  }
}
