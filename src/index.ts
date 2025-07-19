import os from "os";
import cluster from "cluster";

import {
  getHost,
  createWorker,
  terminateProcess,
  startWorkerApplication,
} from "./utils";

async function main() {
  if (cluster.isPrimary) {
    //#region PRIMARY
    const HOST = getHost();
    const PORT: number = +process.env.PORT;

    await terminateProcess();

    console.clear();
    console.log(`Process running on http://${HOST}:${PORT}\n`);

    const CPU_NUM = os.cpus();
    for (let i = 0; i < CPU_NUM.length; i++) {
      createWorker();
    }

    cluster.on("exit", (worker, code) => {
      console.log(
        "Worker cluster PID: " +
          worker.process.pid +
          ", exited with code: " +
          code
      );

      createWorker();
    });
  } else {
    //#region WORKER
    startWorkerApplication();
  }
}

main();
