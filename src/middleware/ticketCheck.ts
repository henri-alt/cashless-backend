import { Request, Response, NextFunction } from "express";
import NodeCache from "node-cache";
import tokens from "jsonwebtoken";
import { TicketingToken } from "../types";

const tickets_cache = new NodeCache({
  checkperiod: 3600,
  deleteOnExpire: true,
  stdTTL: 18000,
});

interface PartialBody {
  scanId?: string;
  ticketId?: string;
}

function getDecodedTicket(str: string) {
  let decodedVal: string;
  const cachedVal = tickets_cache.get<string>(str);
  if (!cachedVal) {
    try {
      const tokenPayload = tokens.decode(str) as TicketingToken;

      decodedVal = tokenPayload.data.ticketId;
      if (!decodedVal) throw new Error();
    } catch {
      decodedVal = str;
    } finally {
      tickets_cache.set(str, decodedVal, 18000);
    }
  } else {
    decodedVal = cachedVal;
  }

  return decodedVal;
}

/**
 * Middleware supposed to handle token decoding.
 * This is meant to handle wow.al events. Clients
 * of the system are allowed to register balances with
 * their tickets. However, the token comes encoded as a JWT.
 * This Token needs to be decrypted in order to handle requests
 */
export default async function ticketCheck(
  req: Request,
  _: Response,
  next: NextFunction
) {
  const { scanId, ticketId } = req.body as PartialBody;
  const { scanId: paramsScan } = req.params;
  const { scanId: queryScan } = req.query;

  if (scanId) {
    req.body.scanId = getDecodedTicket(scanId);
  }

  if (ticketId) {
    req.body.ticketId = getDecodedTicket(ticketId);
  }

  if (paramsScan) {
    req.params.scanId = getDecodedTicket(paramsScan);
  }

  if (queryScan) {
    req.query.scanId = getDecodedTicket(queryScan as string);
  }

  next();
}
