import { Request, Response } from "express";
import { v4 } from "uuid";
import cluster from "cluster";
import { Response as FetchResponse } from "node-fetch";

import { eventModel } from "../models";
import { initClient, query } from "../providers";
import { EventType, CreateEventRequest, PatchEventRequest } from "../types";
import { cacheHandlers } from "../utils";

export async function getAllEventsController(req: Request, res: Response) {
  //#region GET ALL EVENTS
  const company: string = res.locals?.company;

  try {
    const queryRes = await query<EventType>(
      eventModel.getAllEventsModel(company)
    );

    res.status(200).send(queryRes.rows);
  } catch (err) {
    console.log("Events get error:\n\n", err);
    res.status(500).send(err);
  }
}

export async function getActiveEvents(req: Request, res: Response) {
  //#region GET ACTIVE EVENTS
  const company: string = res.locals?.company;

  try {
    const eventsRes = await query<EventType>(
      eventModel.getActiveEventsModel(company)
    );

    res.status(200).send(eventsRes.rows);
  } catch (err) {
    console.log("Error getting active events: ", err);

    res.status(500).send(err);
  }
}

export async function createEventController(req: Request, res: Response) {
  //#region CREATE EVENT
  const company: string = res.locals?.company;

  const {
    eventDescription = null,
    eventName,
    startDate,
    cardPrice = 0,
    tagPrice = 0,
    ticketPrice = 0,
    activationMinimum = 0,
  }: CreateEventRequest = req.body;

  const eventStatus = "inactive";

  if (!company || !eventName || !startDate) {
    res.status(400).json("Bad request! Missing required parameters");
    return;
  }

  if (!isNaN(+cardPrice)) {
    if (+cardPrice < 0) {
      res.status(400).json("Card price cannot be smaller than 0");
      return;
    }
  }

  if (!isNaN(+tagPrice)) {
    if (+tagPrice < 0) {
      res.status(400).json("Tag price cannot be smaller than 0");
      return;
    }
  }

  if (!isNaN(+ticketPrice)) {
    if (+ticketPrice < 0) {
      res.status(400).json("Ticket price cannot be smaller than 0");
      return;
    }
  }

  try {
    const eventId = v4();
    await query(
      eventModel.createEventModel({
        company,
        eventDescription,
        eventId,
        eventName,
        eventStatus,
        startDate,
        cardPrice,
        tagPrice,
        ticketPrice,
        activationMinimum,
        ticketingEventId: null,
      })
    );

    res.status(200).send({ eventId });
  } catch (err) {
    console.log("Create event error:\n\n", err);
    res.status(500).send(err);
  }
}

export async function getEventController(req: Request, res: Response) {
  //#region GET EVENT
  const { id } = req.params;

  try {
    const queryRes = await query(eventModel.getSingleEventModel(id));
    const [event] = queryRes.rows;

    if (!event) {
      res.status(404).json("Event was not found");
      return;
    }

    res.status(200).send(event);
  } catch (err) {
    console.log("Get event error:\n\n", err);
    res.status(500).send(err);
  }
}

export async function patchEventController(req: Request, res: Response) {
  //#region PATCH EVENT
  const company: string = res.locals?.company;

  const { id } = req.params;

  const {
    eventDescription,
    eventName,
    startDate,
    eventStatus,
    cardPrice,
    tagPrice,
    ticketPrice,
    activationMinimum,
  }: PatchEventRequest = req.body;

  if (
    !eventDescription &&
    !eventName &&
    !startDate &&
    !eventStatus &&
    !activationMinimum
  ) {
    res.status(400).json("Bad request! Missing body keys");
    return;
  }

  if (!isNaN(+cardPrice)) {
    if (+cardPrice < 0) {
      res.status(400).json("Card price cannot be smaller than 0");
      return;
    }
  }

  if (!isNaN(+tagPrice)) {
    if (+tagPrice < 0) {
      res.status(400).json("Tag price cannot be smaller than 0");
      return;
    }
  }

  if (!isNaN(+ticketPrice)) {
    if (+ticketPrice < 0) {
      res.status(400).json("Ticket price cannot be smaller than 0");
      return;
    }
  }

  if (!isNaN(+activationMinimum)) {
    if (+activationMinimum < 0) {
      res.status(400).json("Activation minimum cannot be smaller than 0");
      return;
    }
  }

  try {
    await query(
      eventModel.patchEventModel(
        {
          eventDescription,
          eventName,
          startDate,
          eventStatus,
          cardPrice,
          tagPrice,
          ticketPrice,
          activationMinimum,
        },
        id,
        company
      )
    );

    let cacheResponse: FetchResponse;

    if (eventStatus === "active") {
      cluster.worker.send(JSON.stringify({ request: "EVENT_START", data: id }));
    } else if (eventStatus === "inactive") {
      cluster.worker.send(JSON.stringify({ request: "EVENT_END", data: id }));
    } else {
      if (cacheHandlers.checkEvent(id)) {
        cluster.worker.send(
          JSON.stringify({ request: "EVENT_CHANGE", data: id })
        );
      }
    }

    if (cacheResponse) {
      if (!cacheResponse.ok) {
        res.status(cacheResponse.status).json("Event cache error");
        return;
      }
    }

    res.status(200).send();
  } catch (err) {
    console.log("Patch event error:\n\n", err);
    res.status(500).send(err);
  }
}

export async function deleteEventController(req: Request, res: Response) {
  //#region DELETE EVENT
  let client;
  const { id } = req.params;

  const company: string = res.locals?.company;

  try {
    client = await initClient();
    const deleteModels = eventModel.deleteEventModel(id, company);

    await client.query("BEGIN");
    await client.query(deleteModels.tickets);
    await client.query(deleteModels.currencies);
    await client.query(deleteModels.analytics);
    await client.query(deleteModels.topUps);
    await client.query(deleteModels.transactions);
    await client.query(deleteModels.balances);
    await client.query(deleteModels.members);
    await client.query(deleteModels.items);
    await client.query(deleteModels.stands);
    await client.query(deleteModels.event);
    await client.query("COMMIT");

    cluster.worker.send(JSON.stringify({ request: "EVENT_END", data: id }));

    res.status(200).send();
  } catch (err) {
    console.log("Delete event error:\n\n", err);
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
