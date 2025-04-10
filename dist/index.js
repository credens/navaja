// server/index.ts
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
var app = express();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "../dist/public")));
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../dist/public/index.html"));
});
var HOST = process.env.HOST || "localhost";
var PORT = process.env.PORT || 5e3;
app.listen(PORT, HOST, () => {
  console.log(`Servidor corriendo en http://${HOST}:${PORT}`);
});
