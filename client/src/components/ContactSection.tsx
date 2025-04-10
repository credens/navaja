import { MapPin, Mail, Phone } from "lucide-react";

export default function ContactSection() {
  return (
    <section id="contacto" className="md:w-1/2">
      <h2 className="font-serif font-bold text-3xl md:text-4xl mb-8">Contacto</h2>
      
      <div className="bg-white bg-opacity-90 rounded-lg shadow-lg overflow-hidden">
        <div className="h-64 sm:h-80 md:h-96">
          <div className="w-full h-full">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3276.8938386053774!2d-58.319862423760876!3d-34.78241887297794!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95a32c96e86bdfc3%3A0xa46dc1b1a0ed3e77!2sCalle%20824%202537%2C%20San%20Francisco%20Solano%2C%20Provincia%20de%20Buenos%20Aires%2C%20Argentina!5e0!3m2!1sen!2sus!4v1711999970953!5m2!1sen!2sus" 
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen 
              loading="lazy"
              title="Google Maps"
            ></iframe>
          </div>
        </div>
        
        <div className="p-6">
          <a href="https://maps.app.goo.gl/4b5fq5AeYkSDNXVE6" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-full bg-[#F4812A] text-white py-3 rounded-md hover:bg-orange-600 transition-colors duration-200">
            <MapPin className="h-5 w-5 mr-2" />
            Ver en Google Maps
          </a>
          
          <div className="mt-6">
            <div className="flex items-start mb-4">
              <MapPin className="h-6 w-6 text-[#F4812A] mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">Dirección:</h3>
                <p>Calle 824 2537, San Francisco Solano, Argentina</p>
              </div>
            </div>
            
            <div className="flex items-start mb-4">
              <Mail className="h-6 w-6 text-[#F4812A] mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">Email:</h3>
                <p>panes.nova@gmail.com</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <Phone className="h-6 w-6 text-[#F4812A] mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">Teléfono:</h3>
                <p>+5491121619925</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
