import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./db/connectDB.js";

dotenv.config();
const app = express();

app.get("/", (req, res) => {
  res.send("Hello world 123");
});

app.listen(3000, () => {
  connectDB();
  console.log("server is listening on port 3000");
});
