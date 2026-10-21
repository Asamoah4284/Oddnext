import { connectDb, disconnectDb } from "../db.js";
import { Tip } from "../models/Tip.js";

async function main() {
  await connectDb();
  const count = await Tip.countDocuments();
  console.log(`Current tips count: ${count}`);
  const result = await Tip.deleteMany({});
  console.log(`Successfully deleted ${result.deletedCount} tips.`);
  await disconnectDb();
}

main().catch((err) => {
  console.error("Error clearing tips:", err);
  process.exit(1);
});
