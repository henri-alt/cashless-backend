import { Router } from "express";
import { tokenVerify, hasAccess } from "../middleware";
import { eventController } from "../controllers";

const router = Router();

router.get(
  "/events",
  tokenVerify,
  hasAccess([0]),
  eventController.getAllEventsController
);

router.get(
  "/events/active",
  tokenVerify,
  hasAccess([0]),
  eventController.getActiveEvents
);

router.post(
  "/events",
  tokenVerify,
  hasAccess([0]),
  eventController.createEventController
);

router.get(
  "/events/:id",
  tokenVerify,
  hasAccess([0]),
  eventController.getEventController
);

router.patch(
  "/events/:id",
  tokenVerify,
  hasAccess([0]),
  eventController.patchEventController
);

router.delete(
  "/events/:id",
  tokenVerify,
  hasAccess([0]),
  eventController.deleteEventController
);

export default router;
