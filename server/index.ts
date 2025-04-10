
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir archivos estáticos desde dist/public
app.use(express.static(path.join(__dirname, "../dist/public")));

// Ruta raíz y rutas wildcard
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../dist/public/index.html"));
});

const HOST = process.env.HOST || "localhost";
const PORT = process.env.PORT || 5000;

app.listen(PORT, HOST, () => {
  console.log(`Servidor corriendo en http://${HOST}:${PORT}`);
});
