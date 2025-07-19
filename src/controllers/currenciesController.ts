import { v4 as uuid } from "uuid";
import { Request, Response } from "express";
import { query, initClient } from "../providers";
import { currenciesModel } from "../models";
import { CurrencyType, CreateCurrencyRequest } from "../types";
import cluster from "cluster";
import { cacheHandlers } from "../utils";

export async function getCurrenciesController(req: Request, res: Response) {
  //#region GET CURRENCIES
  const eventId: string = req.params?.eventId;
  const company: string = res.locals?.company;
  const userClass: number = res.locals?.userClass;
  const tokenEventId: string = res.locals?.eventId;

  if (userClass !== +process.env.ADMIN_CLASS && eventId !== tokenEventId) {
    res.status(400).json("Cannot get currencies of other events");
    return;
  }

  try {
    const results = await query<CurrencyType>(
      currenciesModel.getCurrenciesModel(eventId, company)
    );

    res.status(200).send(
      results.rows.sort((a, b) => {
        if (a.isDefault) {
          return -1;
        }

        return 0;
      })
    );
  } catch (err) {
    console.log("Get Currencies error:\n\n", err);
    res.status(500).send(err);
  }
}

export async function createCurrenciesController(req: Request, res: Response) {
  //#region CREATE CURRENCIES
  const eventId: string = req.params?.eventId;
  const company: string = res.locals?.company;
  let client;

  try {
    client = await initClient();

    const body: Extract<CreateCurrencyRequest, { length: number }> =
      Array.isArray(req.body) ? req.body : [req.body].filter(Boolean);

    if (!body.length) {
      res.status(400).json("Bad request! Empty body");
      return;
    }

    const nameSet: Set<string> = new Set(
      body.map((e) => e.currency).filter(Boolean)
    );

    if (nameSet.size !== body.length) {
      res.status(400).json("Bad request! Found duplicated or invalid names");
      return;
    }

    let error: boolean = false;
    let defaultFound: boolean = false;

    for (const item of body) {
      if (!item.currency) {
        res
          .status(400)
          .json("Bad request! Currencies without names are not permitted");
        error = true;
        break;
      }

      if (!item.rate || isNaN(+item.rate) || +item.rate <= 0) {
        res
          .status(400)
          .json("Bad request! Found currencies with invalid rates");
        error = true;
        break;
      }

      if (
        !Array.isArray(item.quickPrices) ||
        item.quickPrices.some((e) => isNaN(+e) || +e < 0)
      ) {
        res.status(400).json("Bad request! Invalid quick prices body");
        error = true;
        break;
      }

      if (item.marketRate) {
        if (isNaN(+item.marketRate) || +item.marketRate < 0) {
          res.status(400).json("Bad request! Invalid market price");
          error = true;
          break;
        }
      }

      if (item.isDefault) {
        if (defaultFound) {
          res
            .status(400)
            .json("Bad request! Cannot set multiple currencies as default");
          error = true;
          break;
        } else {
          defaultFound = true;
        }
      }
    }

    if (error) {
      return;
    }

    const newItems: CurrencyType[] = body.flatMap((e) => {
      if (e.currencyId) {
        return [];
      }

      return {
        ...e,
        company,
        eventId,
        currencyId: uuid(),
      };
    });

    const existingItems: CurrencyType[] = body.flatMap((e) => {
      if (!e.currencyId) {
        return [];
      }

      return {
        ...e,
        company,
        eventId,
      };
    });

    await client.query("BEGIN");
    const dbItems = await client.query<
      Pick<CurrencyType, "currencyId" | "isDefault" | "currency">
    >(currenciesModel.getCurrenciesByList(eventId, company));

    const deletedItems = dbItems.rows.filter(
      (e) => !body.find((i) => i.currencyId === e.currencyId)
    );

    if (deletedItems.length) {
      await client.query(
        currenciesModel.deleteCurrenciesModel(
          deletedItems.map((e) => e.currencyId),
          eventId,
          company
        )
      );
    }

    if (existingItems.length) {
      await client.query(
        currenciesModel.bulkUpdateCurrenciesModel(existingItems)
      );
    }

    if (newItems.length) {
      await client.query(currenciesModel.createCurrencyModel(newItems));
    }

    await client.query("COMMIT");

    if (cacheHandlers.checkEvent(eventId)) {
      cluster.worker.send(
        JSON.stringify({ request: "CURRENCIES_CHANGE", data: eventId })
      );
    }

    res.status(200).send(
      newItems.map((e) => ({
        currency: e.currency,
        currencyId: e.currencyId,
      }))
    );
  } catch (err) {
    console.log("Error creating currencies: ", err);

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
