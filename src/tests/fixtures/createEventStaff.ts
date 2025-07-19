import { initClient } from "../../providers";
import { createBartender, createCashier } from "../models";

export async function createEventStaff(eventId: string | null) {
  try {
    var client = await initClient();

    await client.query("BEGIN");
    await client.query(createBartender(eventId));
    await client.query(createCashier(eventId));
    await client.query("COMMIT");

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
