import { exec } from "child_process";

export default async function (pid: number): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(`kill ${pid}`, (error) => {
      if (error) {
        return reject(error.message);
      }

      return resolve();
    });
  });
}
