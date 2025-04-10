import { Instagram } from "lucide-react";
import LogoNovaLogo from "@assets/LogoNovaPanes-Naranja.png";
import { SOCIAL_LINKS } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="bg-[#1A1A1A] text-white py-10 mt-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <img 
              src={LogoNovaLogo} 
              alt="NOVA Panes Logo" 
              className="h-16 filter drop-shadow-md" 
            />
          </div>
          
          <div className="text-center md:text-right">
            <p className="mb-2">© {new Date().getFullYear()} NOVA Panes. Todos los derechos reservados.</p>
            <div className="flex justify-center md:justify-end space-x-4 mt-4">
              <a 
                href={SOCIAL_LINKS.instagram} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-white hover:text-[#F4812A] transition-colors duration-200"
                aria-label="Instagram"
              >
                <Instagram className="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
