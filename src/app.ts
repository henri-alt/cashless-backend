import express from "express";
import cors from "cors";
import bp from "body-parser";
import { initPool } from "./providers";
import { ticketCheck } from "./middleware";

initPool();

import router from "./router";

const app = express();

app.use(cors());
app.use(bp.json({}));
app.use(ticketCheck);

for (const route in router) {
  app.use(router[route as keyof typeof router]);
}

export default app;
