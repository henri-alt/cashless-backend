import { exec } from "child_process";

export default async function (): Promise<number> {
  return new Promise((resolve, reject) => {
    exec(
      `netstat -a -n -o | findStr "${process.env.PORT}"`,
      (error, stdout) => {
        if (error) {
          return reject(error.message);
        }

        const parts = stdout.split(/\s+/g);
        return resolve(Number(parts[parts.length - 2]) || -1);
      }
    );
  });
}
