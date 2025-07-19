import { Request, Response, NextFunction } from "express";
import tokens from "jsonwebtoken";
import { SuperAdminToken } from "../types";

export default function checkSuperAdmin(
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

  let decodedToken: SuperAdminToken;
  try {
    decodedToken = tokens.verify(token, process.env.JWT_SECRET, {
      maxAge: process.env.TOKEN_MAX_AGE,
    }) as SuperAdminToken;

    if (
      !decodedToken?.memberId ||
      +decodedToken?.userClass !== +process.env.ADMIN_CLASS ||
      decodedToken.adminToken !== process.env.SUPER_ADMIN_KEY
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
