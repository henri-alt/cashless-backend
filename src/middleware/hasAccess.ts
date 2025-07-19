import { NextFunction, Request, Response } from "express";

/**
 * To be used after the 'tokenVerify' middleware
 * The token verify will put the user id and role in the locals
 * in order to make it easy to validate a request
 */
function hasAccess(
  roleList: number[] = [],
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userClass = res.locals?.userClass;
  if (roleList.length) {
    if (!roleList.includes(userClass)) {
      res.status(403).json("User forbidden from making requests");
      return;
    }
  }
  next();
}

export default function (
  roleList: number[]
): (req: Request, res: Response, next: NextFunction) => void {
  return hasAccess.bind(null, roleList);
}
