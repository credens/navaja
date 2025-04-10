import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import ProductsSection from "@/components/ProductsSection";
import AboutSection from "@/components/AboutSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#F4812A] to-[#FEE6C8] bg-fixed">
      <Header />
      <main>
        <HeroSection />
        <ProductsSection />
        <div className="container mx-auto px-4 md:py-8">
          <div className="md:flex md:space-x-8">
            <AboutSection />
            <ContactSection />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
