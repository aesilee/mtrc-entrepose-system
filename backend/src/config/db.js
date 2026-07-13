import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// A pool is used instead of a single connection so multiple requests
// (e.g. several staff members logging in at the same time) can be
// handled without waiting on each other.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
