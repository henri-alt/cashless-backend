import { cacheHandlers } from "../utils";
import { Request, Response, NextFunction } from "express";

async function checkRunningEvent(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userClass: number = res.locals?.userClass;
  const eventId: string | undefined = res.locals?.eventId;

  if (userClass === +process.env.ADMIN_CLASS) {
    next();
    return;
  }

  try {
    if (!eventId) {
      res.status(410).json("Event stopped running");
      return;
    }

    if (!cacheHandlers.checkEvent(eventId)) {
      res.status(410).json("Event stopped running");
      return;
    }
  } catch (err) {
    console.log("Could not access running events: ", err);
    res.status(410).json("Event stopped running");
    return;
  }

  next();
}

export default checkRunningEvent;
