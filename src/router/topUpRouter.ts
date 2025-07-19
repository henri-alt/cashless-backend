import { Router } from "express";
import { checkRunningEvent, hasAccess, tokenVerify } from "../middleware";
import { topUpsController } from "../controllers";

const router = Router();

router.get(
  "/topUps",
  tokenVerify,
  hasAccess([0]),
  topUpsController.getTopUpsController
);

router.post(
  "/topUps",
  tokenVerify,
  hasAccess([0, 2]),
  checkRunningEvent,
  topUpsController.topUpController
);

export default router;
