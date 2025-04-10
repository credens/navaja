import PanDePapa from "@assets/Pan de papa.jpg";
import { ClipboardIcon } from "lucide-react";

// Product type definition
type Product = {
  id: number;
  name: string;
  description: string;
  weight: string;
  units: number;
  image?: string;
};

// Products data
const products: Product[] = [
  {
    id: 1,
    name: "Pan de Papa",
    description: "Perfectos para hamburguesas caseras con una textura suave y un sabor inigualable.",
    weight: "400g",
    units: 4,
    image: PanDePapa
  },
  {
    id: 2,
    name: "Pan de Hamburguesa Clásico",
    description: "Nuestra receta tradicional para hamburguesas de todos los estilos.",
    weight: "350g",
    units: 4
  },
  {
    id: 3,
    name: "Pan de Lomito",
    description: "Especialmente diseñado para sandwiches de lomito, con consistencia perfecta para cortes grandes de carne.",
    weight: "320g",
    units: 2
  },
  {
    id: 4,
    name: "Pan de Panchos",
    description: "Panes de alta calidad para hacer panchos caseros, con textura suave y consistente.",
    weight: "280g",
    units: 6
  },
  {
    id: 5,
    name: "Pan de Super Panchos",
    description: "Pan premium para super panchos de mayor tamaño, ideal para recetas gourmet.",
    weight: "340g",
    units: 6
  }
];

export default function ProductsSection() {
  return (
    <section id="productos" className="py-16 md:py-24 bg-white bg-opacity-40">
      <div className="container mx-auto px-4">
        <h2 className="font-serif font-bold text-3xl md:text-4xl text-center mb-12">Nuestros Productos</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-lg overflow-hidden transition-transform duration-300 hover:scale-105">
              <div className="h-56 overflow-hidden flex items-center justify-center">
                {product.image ? (
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4 bg-gray-100 w-full h-full flex flex-col items-center justify-center">
                    <div className="inline-block p-4 rounded-full bg-[#F4812A] mb-4">
                      <ClipboardIcon className="h-10 w-10 text-white" />
                    </div>
                    <p className="text-gray-500 italic">Imagen disponible pronto</p>
                  </div>
                )}
              </div>
              <div className="p-6">
                <h3 className="font-serif font-bold text-xl mb-2">{product.name}</h3>
                <p className="text-gray-700 mb-4">{product.description}</p>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#F4812A]">Peso: {product.weight}</span>
                  <span className="px-3 py-1 bg-[#F4812A] text-white rounded-full text-sm">{product.units} unidades</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
