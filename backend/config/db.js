import pkg from "pg";
import loadConfig from "./env.js";
const { Pool } = pkg;

const { DATABASE_URL } = loadConfig();
const pool = new Pool({
  connectionString: DATABASE_URL
});

export default pool;
