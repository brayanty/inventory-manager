import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  user: "brayan",
  host: "localhost",
  database: "inventary",
  password: "",
  port: 5432,
});

export default pool;
