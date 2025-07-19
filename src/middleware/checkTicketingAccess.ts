import { Request, Response, NextFunction } from "express";
import tokens from "jsonwebtoken";
import { TicketingAdminToken } from "../types";

export default function checkTicketingAccess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const bearer: string = req?.headers?.authorization || "";
  const token = bearer.replace("Bearer ", "");

  if (token === "null" || !token) {
    res.status(401).json("No authentication token");
    return;
  }

  try {
    const { ticketingToken } = tokens.verify(
      token,
      process.env.JWT_SECRET
    ) as TicketingAdminToken;

    if (!ticketingToken || ticketingToken !== process.env.TICKETING_SECRET) {
      throw new Error();
    }
  } catch (err) {
    res.status(403).json("Invalid token");
    return;
  }

  next();
}
