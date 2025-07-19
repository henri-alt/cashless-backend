import { Router } from "express";
import { analyticsController } from "../controllers";
import { hasAccess, tokenVerify } from "../middleware";

const router = Router();

router.get(
  "/events/:eventId/analytics",
  tokenVerify,
  hasAccess([0]),
  analyticsController.getEventAnalyticsController
);

router.get(
  "/events/:eventId/analyticsData",
  tokenVerify,
  hasAccess([0]),
  analyticsController.getAnalyticsDataController
);

router.post(
  "/events/:eventId/analytics",
  tokenVerify,
  hasAccess([0]),
  analyticsController.calculateEventAnalytics
);

export default router;
