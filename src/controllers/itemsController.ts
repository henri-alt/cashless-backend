import { Request, Response } from "express";
import { initClient, query } from "../providers";
import { itemsModel } from "../models";
import { PostItemsRequest, PatchItemRequest } from "../types";
import cluster from "cluster";
import { cacheHandlers } from "../utils";

export async function getItemsController(req: Request, res: Response) {
  //#region GET EVENT ITEMS
  const company: string = res.locals?.company;
  const { id } = req.params;

  try {
    const queryRes = await query(itemsModel.getEventItemsModel(id, company));
    res.status(200).send(queryRes.rows);
  } catch (err) {
    console.log("Items query error:\n\n", err);
    res.status(500).send(err);
  }
}

export async function postItemsController(req: Request, res: Response) {
  //#region CREATE OR UPDATE
  let client;
  const company: string = res.locals?.company;
  const { id } = req.params;

  const items: PostItemsRequest = req.body;
  if (!items.length || !Array.isArray(items)) {
    res.status(400).json("Bad request! Empty body");
    return;
  }

  try {
    client = await initClient();
    const { rows: existingItemNames } = await client.query<{
      itemName: string;
    }>(
      itemsModel.getItemsByNameModel(
        items.map(({ itemName }) => itemName),
        id
      )
    );

    const namesSet = new Set(existingItemNames.map(({ itemName }) => itemName));
    await client.query("BEGIN");

    const newItems = items.filter(({ itemName }) => !namesSet.has(itemName));

    if (newItems.length) {
      await client.query(itemsModel.createItemsModel(newItems, id, company));
    }

    const updateItems = items.filter(({ itemName }) => namesSet.has(itemName));
    if (updateItems.length) {
      await client.query(itemsModel.bulkUpdateItemsModel(updateItems, id));
    }
    await client.query("COMMIT");

    if (cacheHandlers.checkEvent(id)) {
      cluster.worker.send(
        JSON.stringify({ request: "ITEMS_CHANGE", data: id })
      );
    }

    res.status(200).send();
  } catch (err) {
    console.log("Post items error:\n\n", err);
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

export async function patchItemController(req: Request, res: Response) {
  //#region PATCH ITEM
  const company: string = res.locals?.company;
  const { id } = req.params;

  const name = req.query?.itemName as string;

  if (!name) {
    res.status(400).json("Bad request! Missing item name query");
    return;
  }

  const {
    itemCategory,
    itemPrice,
    itemTax,
    staffPrice,
    itemName,
    bonusAvailable,
  }: PatchItemRequest = req.body;

  if (
    !isNaN(itemPrice) &&
    !isNaN(itemTax) &&
    !isNaN(staffPrice) &&
    !itemCategory &&
    !itemName &&
    typeof bonusAvailable !== "boolean"
  ) {
    res.status(400).json("Bad request! Empty body");
    return;
  }

  try {
    await query(
      itemsModel.patchItemModel(
        {
          itemCategory,
          itemPrice,
          itemTax,
          staffPrice,
          itemName,
          bonusAvailable,
        },
        id,
        name,
        company
      )
    );

    if (itemName !== name) {
      await query(
        itemsModel.changeStandItems({
          company,
          eventId: id,
          newName: itemName,
          oldName: name,
        })
      );
    }

    if (cacheHandlers.checkEvent(id)) {
      cluster.worker.send(
        JSON.stringify({ request: "ITEMS_CHANGE", data: id })
      );
    }

    res.status(200).send();
  } catch (err) {
    console.log("Patch item error:\n\n", err);
    res.status(500).send(err);
  }
}

export async function deleteItemsController(req: Request, res: Response) {
  //#region DELETE BY EVENT
  let client;
  const company: string = res.locals?.company;
  const { id } = req.params;
  const name = (req.query?.itemName as string) || "";

  try {
    if (name) {
      client = await initClient();
      await client.query("BEGIN");
      await client.query(itemsModel.deleteItemModel(name, id, company));
      await client.query(itemsModel.removeItemFromStandModel(name, company));
      await client.query("COMMIT");
    } else {
      await query(itemsModel.deleteItemsByEventModel(id, company));
    }

    if (cacheHandlers.checkEvent(id)) {
      cluster.worker.send(
        JSON.stringify({ request: "ITEMS_CHANGE", data: id })
      );
    }

    res.status(200).send();
  } catch (err) {
    console.log("Delete by event error:\n\n", err);
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
