import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Form validation schema
const contactFormSchema = z.object({
  name: z.string()
    .min(2, "El nombre es requerido")
    .max(100, "El nombre es demasiado largo")
    .trim()
    .refine(val => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(val), {
      message: "El nombre solo puede contener letras y espacios"
    }),
  email: z.string()
    .email("Correo electrónico inválido")
    .max(255, "El correo electrónico es demasiado largo")
    .trim()
    .toLowerCase(),
  message: z.string()
    .min(5, "El mensaje es demasiado corto")
    .max(1000, "El mensaje es demasiado largo")
    .trim()
    .refine(val => !/(<script|javascript:|onerror=|onload=|eval\(|setTimeout\()/gi.test(val), {
      message: "El mensaje contiene código no permitido"
    })
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export default function AboutSection() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      message: ""
    }
  });

  const onSubmit = async (data: ContactFormValues) => {
    setIsSubmitting(true);
    try {
      // Sanitización adicional antes de enviar
      const sanitizedData = {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        message: data.message.trim()
      };
      
      await apiRequest("POST", "/api/contact", sanitizedData);
      
      // Limpiar el formulario y cookies si hubiera
      form.reset();
      
      toast({
        title: "Mensaje enviado",
        description: "Gracias por contactarnos, te responderemos a la brevedad.",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error al enviar",
        description: "Hubo un problema al enviar tu mensaje. Por favor intenta nuevamente.",
        variant: "destructive"
      });
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="quienes-somos" className="md:w-1/2 mb-12 md:mb-0">
      <h2 className="font-serif font-bold text-3xl md:text-4xl mb-8">Quiénes Somos</h2>
      
      <div className="bg-white bg-opacity-90 rounded-lg shadow-lg p-6">
        <p className="mb-4">
          NOVA Panes es una empresa Argentina dedicada a la elaboración de productos de panadería de alta calidad. Nos especializamos en panes para hamburguesas que destacan por su textura, sabor y presentación.
        </p>
        <p className="mb-4">
          Desde 2021, hemos estado desarrollando recetas que combinan la tradición panadera con las expectativas de los consumidores modernos. Nuestro compromiso es ofrecer panes que eleven la experiencia culinaria de nuestros clientes.
        </p>
        <p>
          Utilizamos ingredientes seleccionados y procesos que garantizan la frescura y calidad en cada uno de nuestros productos.
        </p>
        
        <div className="mt-8">
          <h3 className="font-serif font-bold text-xl mb-4">Contacto Directo</h3>
          <form 
            onSubmit={form.handleSubmit(onSubmit)} 
            className="space-y-4"
            autoComplete="off"
          >
            <div>
              <input 
                type="text" 
                placeholder="Nombre" 
                autoComplete="off"
                maxLength={100}
                className={`w-full px-4 py-2 border ${form.formState.errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#F4812A]`}
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <input 
                type="email" 
                placeholder="Correo electrónico"
                autoComplete="off"
                maxLength={255}
                spellCheck="false"
                className={`w-full px-4 py-2 border ${form.formState.errors.email ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#F4812A]`}
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <textarea 
                placeholder="Mensaje" 
                rows={4}
                maxLength={1000}
                className={`w-full px-4 py-2 border ${form.formState.errors.message ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#F4812A]`}
                {...form.register("message")}
              ></textarea>
              {form.formState.errors.message && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.message.message}</p>
              )}
            </div>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-black text-white py-3 rounded-md hover:bg-gray-800 transition-colors duration-200 disabled:bg-gray-400"
            >
              {isSubmitting ? "Enviando..." : "Enviar"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
