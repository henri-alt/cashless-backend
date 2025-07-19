import { Router } from "express";
import { hasAccess, tokenVerify } from "../middleware";
import { staffController } from "../controllers";

const router = Router();

router.post("/staffMembers/login", staffController.memberLoginController);

router.get(
  "/staffMembers/profile",
  tokenVerify,
  staffController.getProfileController
);

router.get(
  "/staffMembers/dataRefresh",
  tokenVerify,
  staffController.memberRefreshController
);

router.get(
  "/staffMembers",
  tokenVerify,
  hasAccess([0]),
  staffController.getStaffController
);

router.post(
  "/staffMembers",
  tokenVerify,
  hasAccess([0]),
  staffController.createMemberController
);

router.get(
  "/staffMembers/:id",
  tokenVerify,
  hasAccess([0]),
  staffController.getMemberController
);

router.patch(
  "/staffMembers/:id",
  tokenVerify,
  hasAccess([0]),
  staffController.patchMemberController
);

router.delete(
  "/staffMembers/:id",
  tokenVerify,
  hasAccess([0]),
  staffController.deleteMemberController
);

export default router;
