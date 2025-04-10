import PanDePapa from "@assets/Pan de papa.jpg";

export default function HeroSection() {
  return (
    <section id="inicio" className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="md:flex md:items-center md:justify-between">
          <div className="md:w-1/2 mb-10 md:mb-0">
            <h1 className="font-serif font-bold text-4xl md:text-5xl lg:text-6xl leading-tight mb-6">
              Reunite con amigos y disfruta de unas deliciosas hamburguesas.
            </h1>
            <p className="text-lg md:text-xl opacity-90 max-w-xl">
              Nuestros panes de papa son perfectos para crear las mejores hamburguesas caseras.
            </p>
          </div>
          <div className="md:w-1/2 flex justify-center">
            <div className="relative">
              <img 
                src={PanDePapa}
                alt="Pan de Papa NOVA Panes" 
                className="rounded-lg shadow-xl max-w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
