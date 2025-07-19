import { Router } from "express";
import { tokenVerify, hasAccess, checkRunningEvent } from "../middleware";
import { transactionsController } from "../controllers";

const router = Router();

router.get(
  "/transactions",
  tokenVerify,
  hasAccess([0]),
  transactionsController.getTransactionsController
);

router.post(
  "/transactions",
  tokenVerify,
  hasAccess([1]),
  checkRunningEvent,
  transactionsController.createTransactionController
);

router.delete(
  "/transactions/:id",
  tokenVerify,
  hasAccess([0]),
  transactionsController.deleteTransactionsController
);

export default router;
