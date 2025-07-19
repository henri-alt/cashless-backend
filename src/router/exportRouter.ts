import { Router } from "express";
import { hasAccess, tokenVerify } from "../middleware";
import { exportController } from "../controllers";

const router = Router();

router.get(
  "/events/:eventId/exports",
  tokenVerify,
  hasAccess([0]),
  exportController.excelExportController
);

router.get(
  "/events/:eventId/exportAnalytics",
  tokenVerify,
  hasAccess([0]),
  exportController.analyticsExportController
);

router.get(
  "/reports",
  tokenVerify,
  hasAccess([0]),
  exportController.getAllReportsController
);

router.get(
  "/events/:eventId/report",
  tokenVerify,
  hasAccess([0]),
  exportController.getExportReportController
);

export default router;
