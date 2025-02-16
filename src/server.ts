import express from "express";
import { Client } from "pg";
import dotenv from "dotenv";
import statsRoutes from "./routes/stats/stats.routes";
import usersRoutes from "./routes/user/user.routes";

dotenv.config();

const server = express();
const port = 3000;

const client = new Client({
  user: "postgres",
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PW,
  port: parseInt(process.env.DB_PORT as string),
  ssl: {
    rejectUnauthorized: false,
  },
});

client
  .connect()
  .then(() => {
    console.log("Connected to the PostgreSQL database");
  })
  .catch((err) => {
    console.error("Connection error", err.stack);
  });

server.use(express.json());

if (process.env.NODE_ENV !== "test") {
  server.listen(port, () => console.log(`Listening on port ${port}`));
}

server.use("/", usersRoutes);
server.use("/stats", statsRoutes);

export { server, client };
