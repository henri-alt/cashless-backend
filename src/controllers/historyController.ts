import { Request, Response } from "express";
import { query } from "../providers";
import {
  TransactionType,
  TopUp,
  GetTransactionsHistoryRequest,
  GetTransactionHistoryResponse,
  BalanceType,
} from "../types";
import { historyModel } from "../models";

export async function getTransactionHistoryController(
  req: Request,
  res: Response
) {
  //#region TRANSACTIONS HISTORY
  const { scanId }: GetTransactionsHistoryRequest = req.body;
  const company = res.locals?.company;
  const eventId = res.locals?.eventId;
  const userClass = Number(res.locals?.userClass);

  if (!scanId) {
    res.status(403).json("No scan id was sent!");
    return;
  }

  try {
    const [trRes, tpRes, blRes] = await Promise.all([
      query<TransactionType>(
        historyModel.getTransactionHistoryModel({
          company,
          eventId,
          scanId,
        })
      ),
      query<TopUp>(
        historyModel.getTopUpHistoryModel({
          company,
          eventId,
          scanId,
        })
      ),
      query<BalanceType>(
        historyModel.getBalanceHistoryModel({
          company,
          eventId,
          scanId,
        })
      ),
    ]);

    if (!blRes.rowCount) {
      res.status(404).json("Balance was not found");
      return;
    }

    const [balance] = blRes.rows;

    if (
      userClass !== Number(process.env.ADMIN_CLASS) &&
      !balance.isFidelityCard &&
      balance.eventCreated !== eventId
    ) {
      res.status(403).json("Balance was not created in this event");
      return;
    }

    const response: GetTransactionHistoryResponse = {
      topUps: tpRes.rows,
      transactions: trRes.rows,
      balance,
    };

    res.status(200).send(response);
  } catch (err) {
    console.log("Get transaction history error: ", err);
    res.status(500).send(err);
  }
}
