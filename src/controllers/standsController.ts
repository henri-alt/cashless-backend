import { Request, Response } from "express";
import { query } from "../providers";
import { standsModel } from "../models";
import { CreateStandRequest, PatchStandRequest } from "../types";

export async function getStandsController(req: Request, res: Response) {
  //#region EVENT STANDS
  const company: string = res.locals?.company;
  const { id } = req.params;

  try {
    const queryRes = await query(standsModel.getEventStandsModel(id, company));
    res.status(200).send(queryRes.rows);
  } catch (err) {
    console.log("Stands query error:\n\n", err);
    res.status(500).send(err);
  }
}

export async function createStandController(req: Request, res: Response) {
  //#region CREATE STAND
  const company: string = res.locals?.company;
  const { id } = req.params;

  const {
    standName,
    menuItems = [],
    staffMembers = [],
  }: CreateStandRequest = req.body;
  if (!standName) {
    res.status(400).json("Bad request! Missing required standName");
    return;
  }

  try {
    await query(
      standsModel.createStandModel(
        {
          menuItems,
          staffMembers,
          standName,
        },
        id,
        company
      )
    );

    res.status(200).send();
  } catch (err) {
    console.log("Create stand error:\n\n", err);
    res.status(500).send(err);
  }
}

export async function patchStandController(req: Request, res: Response) {
  //#region PATCH STAND
  const { id } = req.params;
  const company: string = res.locals?.company;

  const name = req.query?.standName as string;
  if (!name) {
    res.status(400).json("Bad request! Missing item name query");
    return;
  }

  const { menuItems, staffMembers, standName }: PatchStandRequest = req.body;
  if (!menuItems && !staffMembers && !standName) {
    res.status(400).json("Bad request! Empty body");
    return;
  }

  try {
    await query(
      standsModel.patchStandController(
        {
          menuItems,
          staffMembers,
          standName,
        },
        name,
        id,
        company
      )
    );

    res.status(200).send();
  } catch (err) {
    console.log("Patch stand error:\n\n", err);
    res.status(500).send(err);
  }
}

export async function deleteStandController(req: Request, res: Response) {
  //#region DELETE STAND
  const company: string = res.locals?.company;
  const { id } = req.params;

  const name = req.query?.standName as string;
  if (!name) {
    res.status(400).json("Bad request! Missing item name query");
    return;
  }

  try {
    await query(standsModel.deleteStandModel(name, id, company));

    res.status(200).send();
  } catch (err) {
    console.log("Delete stand error:\n\n", err);
    res.status(500).send(err);
  }
}
