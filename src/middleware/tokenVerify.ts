import { Request, Response, NextFunction } from "express";
import tokens from "jsonwebtoken";
import { TokenStructure } from "../types";

async function tokenVerify(req: Request, res: Response, next: NextFunction) {
  const bearer: string = req?.headers?.authorization || "";
  const token = bearer.replace("Bearer ", "");

  if (token === "null" || !token) {
    res.status(401).json("No authentication token");
    return;
  }

  let decodedToken: TokenStructure;
  try {
    decodedToken = tokens.verify(token, process.env.JWT_SECRET, {
      maxAge: process.env.TOKEN_MAX_AGE,
    }) as TokenStructure;

    if (
      !decodedToken?.memberId ||
      isNaN(+decodedToken?.userClass) ||
      !decodedToken.company
    ) {
      throw new Error();
    }

    res.locals.token = token;
    res.locals.memberId = decodedToken?.memberId;
    res.locals.userClass = decodedToken?.userClass;
    res.locals.company = decodedToken?.company;
    res.locals.eventId = decodedToken?.eventId || "";
    res.locals.memberName = decodedToken.memberName;
    res.locals.tenantId = decodedToken.tenantId || null;
  } catch (err) {
    res.status(403).json("Invalid token");
    return;
  }

  next();
}

export default tokenVerify;
