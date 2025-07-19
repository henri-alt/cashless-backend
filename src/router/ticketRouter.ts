import { Router } from "express";
import { hasAccess, tokenVerify } from "../middleware";
import { ticketController } from "../controllers";

const router = Router();

router.post(
  "/check-ticket",
  tokenVerify,
  hasAccess([3]),
  ticketController.checkTicketController
);

export default router;
