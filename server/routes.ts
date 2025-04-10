import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";

// Contact form schema
const contactFormSchema = z.object({
  name: z.string().min(2, "Name is required").max(100, "Name is too long").trim(),
  email: z.string().email("Invalid email address").max(255, "Email is too long").trim().toLowerCase(),
  message: z.string().min(5, "Message is too short").max(1000, "Message is too long").trim()
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Contact form submission endpoint
  app.post("/api/contact", async (req, res) => {
    try {
      // Validate the request body
      const validatedData = contactFormSchema.parse(req.body);
      
      // Here you would typically store the contact form submission or send an email
      // For now, we'll just return success
      console.log("Contact form submission:", validatedData);
      
      return res.status(200).json({ 
        message: "Mensaje recibido correctamente" 
      });
    } catch (error) {
      console.error("Error processing contact form:", error);
      
      // No revelar detalles específicos del error al cliente por seguridad
      return res.status(400).json({ 
        message: "Error al procesar el formulario. Por favor verifique los datos ingresados e intente nuevamente."
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
