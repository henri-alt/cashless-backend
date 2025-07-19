import { Request, Response } from "express";
import {
  PatchCompanyRequest,
  CreateCompanyRequest,
} from "../types/requests/companyRequests";
import { initClient, query } from "../providers";
import { companyModel } from "../models";
import cluster from "cluster";

export async function getCompaniesController(req: Request, res: Response) {
  //#region GET COMPANIES
  try {
    const compRes = await query(companyModel.getCompaniesModel());

    res.status(200).send(compRes.rows);
  } catch (err) {
    console.log("Error getting companies: ", err);

    res.status(500).send(err);
  }
}

export async function createCompanyController(req: Request, res: Response) {
  //#region CREATE COMPANY
  try {
    const { company, tenantId } = req.body as CreateCompanyRequest;

    if (!company) {
      res.status(403).json("Bad request. Missing company name");
      return;
    }

    await query(
      companyModel.createCompanyModel({
        company,
        tenantId,
      })
    );

    res.status(200).send();
  } catch (err) {
    console.log("Error creating company: ", err);

    res.status(500).send(err);
  }
}

export async function patchCompanyController(req: Request, res: Response) {
  //#region PATCH COMPANY
  try {
    const { company, companyStatus, tenantId } =
      req.body as PatchCompanyRequest;

    if (!company && !companyStatus && !tenantId) {
      res.status(403).json("Bad request. Empty body");
      return;
    }

    const companyId = req.params?.companyId!;

    await query(
      companyModel.patchCompanyModel({
        company,
        companyId,
        companyStatus,
        tenantId,
      })
    );

    res.status(200).send();
  } catch (err) {
    console.log("Error updating company: ", err);

    res.status(500).send(err);
  }
}

export async function deleteCompanyController(req: Request, res: Response) {
  //#region DELETE COMPANY
  let client;

  try {
    const companyId = req.params?.companyId;
    const {
      analytics,
      balances,
      clients,
      company,
      currencies,
      event,
      eventExports,
      items,
      members,
      stands,
      tickets,
      topUps,
      transactions,
    } = companyModel.deleteCompanyModel({ companyId });

    client = await initClient();
    await client.query("BEGIN");
    await client.query(tickets);
    await client.query(analytics);
    await client.query(eventExports);
    await client.query(currencies);
    await client.query(items);
    await client.query(clients);
    await client.query(topUps);
    await client.query(transactions);
    await client.query(balances);
    await client.query(stands);
    await client.query(members);
    await client.query(event);
    await client.query(company);
    await client.query("COMMIT");

    cluster.worker.send(JSON.stringify({ request: "POPULATE_DATA", data: "" }));

    res.status(200).send();
  } catch (err) {
    console.log("Error deleting company: ", err);

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
