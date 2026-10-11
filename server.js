
const http = require("http");
const { Pool } = require("pg");
const { createClient } = require("redis");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "appdb",
  user: process.env.DB_USER || "appuser",
  password: process.env.DB_PASSWORD || "localpass123",
});

const redis = createClient({
  socket: {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT || 6379),
  },
});

redis.on("error", (err) => {
  console.error("Redis error:", err.message);
});

const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  try {
    if (req.url === "/") {
      res.end(JSON.stringify({
        message: "Node.js + PostgreSQL + Redis",
      }));
    } else if (req.url === "/db-test") {
      const result = await pool.query("SELECT NOW() AS time");
      res.end(JSON.stringify({
        database: "connected",
        time: result.rows[0].time,
      }));
    } else if (req.url === "/redis-test") {
      await redis.set("message", "Redis is working!");
      const message = await redis.get("message");
      res.end(JSON.stringify({
        redis: "connected",
        message,
      }));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "Route not found" }));
    }
  } catch (err) {
    console.error(err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
});

async function startServer() {
  await redis.connect();

  server.listen(3000, "0.0.0.0", () => {
    console.log("Server running on port 3000");
  });
}

startServer().catch((err) => {
  console.error("Startup failed:", err);
  process.exit(1);
});

process.on("SIGTERM", async () => {
  server.close();
  await pool.end();
  if (redis.isOpen) await redis.quit();
});
