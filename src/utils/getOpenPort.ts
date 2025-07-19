import detectPort from "detect-port";
import getHost from "./getHost";

export default async function getOpenPort(
  port: number = +process.env.PORT
): Promise<number> {
  return new Promise((resolve, reject) => {
    detectPort({
      port,
      hostname: getHost(),
      callback(err, _port) {
        if (err) {
          return reject(err);
        }

        return resolve(_port);
      },
    });
  });
}
