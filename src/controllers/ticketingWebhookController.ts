import { Request, Response } from "express";
import { WHCreateEventRequest } from "../types/requests/ticketingWebhookRequests";
import { query } from "../providers";
import { ticketingWebhookModel, companyModel } from "../models";
import { Company } from "../types";

export async function createTicketingEventController(
  req: Request,
  res: Response
) {
  //#region CREATE EVENT
  try {
    const {
      eventDescription = "",
      eventName,
      startDate,
      tenantId,
      ticketingEventId,
    } = req.body as WHCreateEventRequest;

    if (!eventName && !startDate && !tenantId && !ticketingEventId) {
      res.status(403).json("Bad request! Missing required data");
      return;
    }

    const companyRes = await query<Company>(
      companyModel.getCompanyByTenant({ tenantId })
    );

    if (!companyRes.rowCount) {
      res.status(404).json("Tenant was not found");
      return;
    }

    await query(
      ticketingWebhookModel.createTicketingEventModel({
        company: companyRes.rows.at(0).company,
        eventDescription,
        eventName,
        startDate,
        ticketingEventId,
      })
    );

    res.sendStatus(200);
  } catch (err) {
    console.log("Error creating webhook event: ", err);

    res.status(500).send({
      message: "Internal server error",
    });
  }
}
