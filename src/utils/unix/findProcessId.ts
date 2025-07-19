import { exec } from "child_process";

export default async function (): Promise<number> {
  return new Promise((resolve, reject) => {
    exec(`lsof -t -i:${process.env.PORT}`, (error, stdout) => {
      if (error) {
        return reject(error.message);
      }

      return resolve(Number(stdout.replace("\n", "")) || -1);
    });
  });
}
