import { Request, Response } from "express";
import tokens from "jsonwebtoken";
import { CheckTicketRequest } from "../types/requests/ticketRequests";
import { CurrencyType, TicketingToken } from "../types";
import { initClient, query } from "../providers";
import { cacheHandlers } from "../utils";
import { balancesModel, currenciesModel, ticketModel } from "../models";

export async function checkTicketController(req: Request, res: Response) {
  //#region CHECK TICKET
  let client;

  try {
    const company: string = res.locals?.company;
    const eventId: string = res.locals?.eventId;
    const memberId: string = res.locals?.memberId;
    const userClass: number = res.locals?.userClass;
    const memberName: string = res.locals?.memberName;

    const { ticket } = req.body as CheckTicketRequest;

    if (!ticket || typeof ticket !== "string") {
      res.status(403).json("Invalid or missing ticket");
      return;
    }

    const decoded = tokens.decode(ticket) as TicketingToken;

    const ticketEventId = decoded.data.eventId;

    const runningEvent = cacheHandlers.getEvent(eventId);

    if (ticketEventId !== runningEvent.ticketingEventId) {
      res.status(403).json("Ticket is not of this event");
      return;
    }

    if (!isNaN(+decoded?.data?.amount)) {
      const isBonus = userClass === +process.env.ADMIN_CLASS;

      client = await initClient();

      await client.query("BEGIN");

      const currencies = await client.query<CurrencyType>(
        currenciesModel.getCurrenciesModel(eventId, company)
      );
      const defaultCurrency = currencies.rows.find((e) => e.isDefault);

      await client.query(
        ticketModel.createTicketModel({
          eventId,
          memberId,
          memberName,
          ticket,
          company,
        })
      );

      await client.query(
        balancesModel.createBalanceModel({
          balance: decoded.data.amount - (runningEvent?.ticketPrice || 0),
          balanceId: crypto.randomUUID(),
          company,
          isFidelityCard: false,
          scanId: decoded.data.ticketId,
          eventId,
          memberId: null,
          ticketId: decoded.data.ticketId,
          createdAt: new Date().toISOString(),
          createdBy: memberName,
          initialAmount: decoded.data.amount,
          isBonus,
          activationCost: runningEvent?.ticketPrice || 0,
          eventCreated: eventId,
          activationCurrency: defaultCurrency.currency,
          createdById: memberId,
          eventCurrency: defaultCurrency.currency,
        })
      );

      await client.query("COMMIT");
    } else {
      await query(
        ticketModel.createTicketModel({
          eventId,
          memberId,
          memberName,
          ticket,
          company,
        })
      );
    }

    res.status(200).send();
  } catch (err) {
    console.log("Error checking ticket: ", err);

    if (err instanceof Error) {
      if (err.message.includes("duplicate") && err.message.includes("ticket")) {
        res.status(403).json("Ticket has already been checked");
        return;
      }
    }

    res.status(500).send(err);
  }
}
