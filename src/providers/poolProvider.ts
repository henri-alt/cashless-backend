import pg from "pg";
const types = pg.types;
types.setTypeParser(types.builtins.NUMERIC, (val) => parseFloat(val));

let pool: pg.Pool;

export function initPool() {
  pool = new pg.Pool();

  pool.addListener("error", (err, client: pg.PoolClient) => {
    console.log("Error on idle client: ", err);
    try {
      client.release(true);
    } catch {}
  });
}

export function closePool() {
  if (pool) {
    return pool.end();
  }

  return Promise.resolve();
}

export async function query<T = unknown>(q: string) {
  return pool.query<T>(q);
}

export async function initClient() {
  return await pool.connect();
}
