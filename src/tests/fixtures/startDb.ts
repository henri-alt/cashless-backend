import { initClient, initPool } from "../../providers";
import { createAdmin } from "../models";

export async function prepareDb() {
  try {
    initPool();
    var client = await initClient();

    await client.query("BEGIN");
    await client.query("TRUNCATE staff_members CASCADE");
    await client.query("TRUNCATE events CASCADE");
    await client.query("TRUNCATE balances CASCADE");
    await client.query("TRUNCATE item_configs CASCADE");
    await client.query("TRUNCATE stand_configs CASCADE");
    await client.query("TRUNCATE transactions CASCADE");
    await client.query("COMMIT");

    await client.query(createAdmin());

    return true;
  } catch (err) {
    console.log("Could not prepare tables for test: ", err);
    if (client) {
      await client.query("ROLLBACK");
    }

    return false;
  } finally {
    if (client) {
      client.release();
    }
  }
}
