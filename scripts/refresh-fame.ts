import "dotenv/config";
import pool from "../src/lib/db";
import { refreshAllFameRatings } from "../src/lib/fame";

refreshAllFameRatings()
  .then(() => console.log("Fame ratings refreshed."))
  .catch((error) => {
    console.error("Unable to refresh fame ratings.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => pool.end());
