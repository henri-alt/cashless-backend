import { Router } from "express";
import { tokenVerify, hasAccess } from "../middleware";
import { currenciesController } from "../controllers";

const router = Router();

router.get(
  "/events/:eventId/currencies",
  tokenVerify,
  hasAccess([0, 1, 2]),
  currenciesController.getCurrenciesController
);

router.post(
  "/events/:eventId/currencies",
  tokenVerify,
  hasAccess([0]),
  currenciesController.createCurrenciesController
);

export default router;
