import { Router } from "express";
import { checkTicketingAccess } from "../middleware";
import { ticketingEventController } from "../controllers";

const router = Router();

router.post(
  "/ticketing-event",
  checkTicketingAccess,
  ticketingEventController.createTicketingEventController
);

export default router;
