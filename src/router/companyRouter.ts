import { Router } from "express";
import { checkSuperAdmin, hasAccess } from "../middleware";
import { companyController } from "../controllers";

const router = Router();

router.get(
  "/companies",
  checkSuperAdmin,
  hasAccess([0]),
  companyController.getCompaniesController
);

router.post(
  "/companies",
  checkSuperAdmin,
  hasAccess([0]),
  companyController.createCompanyController
);

router.patch(
  "/companies/:companyId",
  checkSuperAdmin,
  hasAccess([0]),
  companyController.patchCompanyController
);

router.delete(
  "/companies/:companyId",
  checkSuperAdmin,
  hasAccess([0]),
  companyController.deleteCompanyController
);

export default router;
