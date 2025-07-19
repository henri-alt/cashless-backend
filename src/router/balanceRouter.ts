import { Router } from "express";
import {
  tokenVerify,
  hasAccess,
  checkRunningEvent,
  ticketCheck,
} from "../middleware";
import { balanceController } from "../controllers";

const router = Router();

router.get(
  "/balances",
  tokenVerify,
  hasAccess([0, 1, 2]),
  checkRunningEvent,
  ticketCheck,
  balanceController.getBalancesController
);

router.get(
  "/balances/:scanId",
  tokenVerify,
  hasAccess([0, 1, 2]),
  checkRunningEvent,
  ticketCheck,
  balanceController.getBalanceByScanController
);

router.post(
  "/balances",
  tokenVerify,
  hasAccess([0, 2]),
  checkRunningEvent,
  balanceController.createBalanceController
);

router.post(
  "/balances/staffBalance",
  tokenVerify,
  hasAccess([0, 1, 2]),
  checkRunningEvent,
  balanceController.createStaffBalanceController
);

router.patch(
  "/balances/:id",
  tokenVerify,
  hasAccess([0]),
  ticketCheck,
  balanceController.patchBalanceController
);

router.delete(
  "/balances/:id",
  tokenVerify,
  hasAccess([0]),
  ticketCheck,
  balanceController.deleteSingleBalanceController
);

router.delete(
  "/balances/event/:id",
  tokenVerify,
  hasAccess([0]),
  ticketCheck,
  balanceController.deleteEventBalances
);

export default router;
