import { Router } from "express";
import { tokenVerify, hasAccess, checkRunningEvent } from "../middleware";
import { historyController } from "../controllers";

const router = Router();

const { getTransactionHistoryController } = historyController;

router.post(
  "/history",
  tokenVerify,
  hasAccess([0, 1, 2]),
  checkRunningEvent,
  getTransactionHistoryController
);

export default router;
