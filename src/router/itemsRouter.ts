import { Router } from "express";
import { tokenVerify, hasAccess } from "../middleware";
import { itemsController } from "../controllers";

const router = Router();

router.get(
  "/events/:id/items",
  tokenVerify,
  hasAccess([0]),
  itemsController.getItemsController
);

router.post(
  "/events/:id/items",
  tokenVerify,
  hasAccess([0]),
  itemsController.postItemsController
);

router.patch(
  "/events/:id/items",
  tokenVerify,
  hasAccess([0]),
  itemsController.patchItemController
);

router.delete(
  "/events/:id/items",
  tokenVerify,
  hasAccess([0]),
  itemsController.deleteItemsController
);

export default router;
