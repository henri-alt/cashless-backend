import app from "../app";
import cluster from "cluster";
import { cache } from "../providers";
import { cacheHandlers, getHost } from ".";

const messageHandlers: Record<string, (data: string) => Promise<void> | void> =
  {
    EVENT_START: cacheHandlers.startEvent,
    EVENT_END: cacheHandlers.endEvent,
    EVENT_CHANGE: cacheHandlers.changeEvent,
    ITEMS_CHANGE: cacheHandlers.changeItems,
    CURRENCIES_CHANGE: cacheHandlers.changeCurrencies,
    POPULATE_DATA: cacheHandlers.populateRunningEvents,
  };

async function startWorkerApplication() {
  cache.initCache();

  await cacheHandlers.populateRunningEvents();

  app.listen(+process.env.PORT, getHost(), () => {
    cluster.worker.on("message", async (message) => {
      const { request, data } = JSON.parse(message) as {
        request: string;
        data: any;
      };

      try {
        await messageHandlers[request](data);
      } catch (err) {
        console.log("Cache error: ", err);
        cluster.worker.kill("SIGTERM");
      }
    });
  });
}

export default startWorkerApplication;
