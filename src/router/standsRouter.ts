import { Router } from "express";
import { tokenVerify, hasAccess } from "../middleware";
import { standsController } from "../controllers";

const router = Router();

router.get(
  "/events/:id/stands",
  tokenVerify,
  hasAccess([0]),
  standsController.getStandsController
);

router.post(
  "/events/:id/stands",
  tokenVerify,
  hasAccess([0]),
  standsController.createStandController
);

router.patch(
  "/events/:id/stands",
  tokenVerify,
  hasAccess([0]),
  standsController.patchStandController
);

router.delete(
  "/events/:id/stands",
  tokenVerify,
  hasAccess([0]),
  standsController.deleteStandController
);

export default router;
