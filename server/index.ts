import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Security headers
app.use((req, res, next) => {
  // Content Security Policy - más permisiva en desarrollo, más estricta en producción
  const isProduction = process.env.NODE_ENV === "production";
  const cspValue = isProduction
    ? "default-src 'self'; script-src 'self' https://replit.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src https://www.google.com;"
    : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://replit.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' ws: wss:; frame-src https://www.google.com;";
  
  res.setHeader('Content-Security-Policy', cspValue);
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Block MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Enable XSS protection in browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Strict referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin');
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    
    // En producción, no mostrar detalles específicos de los errores
    const isProduction = process.env.NODE_ENV === "production";
    const message = isProduction ? "Internal Server Error" : (err.message || "Internal Server Error");
    
    // Log error para debugging interno pero no exponer al cliente
    console.error("Server error:", err);
    
    res.status(status).json({ message });
    
    // No propagar el error más allá de este middleware
    // Solo registrarlo internamente
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
