import pg from "pg";
const { Client } = pg;
import "dotenv/config";

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  console.log("Connected to Neon. Dropping public schema...");
  await client.query("DROP SCHEMA public CASCADE;");
  await client.query("CREATE SCHEMA public;");
  console.log("Schema public recreated.");
  await client.end();
}

run().catch(console.error);
