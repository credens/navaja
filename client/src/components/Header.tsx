import { useState, useEffect } from "react";
import { Link } from "wouter";
import LogoNovaLogo from "@assets/LogoNovaPanes-Naranja.png";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 80,
        behavior: "smooth",
      });
    }
  };

  return (
    <header className={`sticky top-0 z-50 shadow-md ${isScrolled ? 'bg-gradient-to-r from-[#F4812A] to-[#FEE6C8]' : 'bg-gradient-to-r from-[#F4812A] to-[#FEE6C8]'}`}>
      <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center">
        <div className="logo mb-4 md:mb-0">
          <Link href="/">
            <img src={LogoNovaLogo} alt="NOVA Panes Logo" className="h-16 filter drop-shadow-md" />
          </Link>
        </div>
        
        <nav className="flex flex-wrap justify-center md:justify-end space-x-6 md:space-x-8">
          <button 
            onClick={() => scrollToSection("inicio")} 
            className="text-white hover:text-[#1A1A1A] font-semibold transition-colors duration-200"
          >
            Inicio
          </button>
          <button 
            onClick={() => scrollToSection("productos")} 
            className="text-white hover:text-[#1A1A1A] font-semibold transition-colors duration-200"
          >
            Productos
          </button>
          <button 
            onClick={() => scrollToSection("quienes-somos")} 
            className="text-white hover:text-[#1A1A1A] font-semibold transition-colors duration-200"
          >
            Quiénes Somos
          </button>
          <button 
            onClick={() => scrollToSection("contacto")} 
            className="text-white hover:text-[#1A1A1A] font-semibold transition-colors duration-200"
          >
            Contacto
          </button>
        </nav>
      </div>
    </header>
  );
}
