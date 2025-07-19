import { unixHandlers } from "./unix";
import getOpenPort from "./getOpenPort";
import { windowsHandlers } from "./windows";

async function terminateProcess() {
  try {
    const freePort = await getOpenPort();
    if (freePort !== +process.env.PORT) {
      console.log("Predefined port is already in use\n");
      console.log("Trying to kill blocking process...\n");

      switch (process.platform) {
        case "win32": {
          const blockingProcessId = await windowsHandlers.findProcessId();
          if (blockingProcessId === -1) {
            throw new Error("Could not find process id");
          }

          await windowsHandlers.killProcessById(blockingProcessId);
          break;
        }
        case "linux": {
          const blockingProcessId = await unixHandlers.findProcessId();
          if (blockingProcessId === -1) {
            throw new Error("Could not find process id");
          }

          await unixHandlers.killProcessById(blockingProcessId);
          break;
        }
        default: {
          throw new Error("System not supported");
        }
      }
    }
  } catch (err) {
    console.error("Could not start application:\n");
    console.error(err);
    console.error("\n");
    process.exit(1);
  }
}

export default terminateProcess;
