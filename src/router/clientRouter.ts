import { Router } from "express";
import { tokenVerify, hasAccess, checkRunningEvent } from "../middleware";
import { clientController } from "../controllers";

const router = Router();

router.get(
  "/clients",
  tokenVerify,
  hasAccess([0, 2]),
  checkRunningEvent,
  clientController.getClientsController
);

router.post(
  "/clients",
  tokenVerify,
  hasAccess([2]),
  checkRunningEvent,
  clientController.createClientController
);

router.patch(
  "/clients/:id",
  tokenVerify,
  hasAccess([0, 2]),
  checkRunningEvent,
  clientController.patchClientController
);

router.delete(
  "/clients/:id",
  tokenVerify,
  hasAccess([0, 2]),
  checkRunningEvent,
  clientController.deleteClientController
);

export default router;
