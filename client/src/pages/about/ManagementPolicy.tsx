import { ChevronRight, ShieldCheck } from "lucide-react";
import Header from "@/components/layout/Header";
import { Link } from "wouter";
import Footer from "@/components/layout/Footer";
import SEOHead, { breadcrumbSchema } from "@/components/SEOHead";
import aboutHeroBg from "../../assets/images/about-hero.jpg";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useEffect, useState } from "react";

export default function ManagementPolicy() {
  const [heroLoaded, setHeroLoaded] = useState(false);
  const introReveal = useScrollReveal(0.15);
  const block1Reveal = useScrollReveal(0.15);
  const block2Reveal = useScrollReveal(0.15);
  const block3Reveal = useScrollReveal(0.15);

  useEffect(() => {
    const t = setTimeout(() => setHeroLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <SEOHead
        title="Política de Gestão"
        description="Conheça a Política de Gestão da Bioprev Angola — compromisso com a qualidade, segurança, saúde e meio ambiente na prestação de serviços em Angola."
        canonical="/about/management-policy"
        keywords="política de gestão Bioprev Angola, qualidade Bioprev, segurança saúde meio ambiente Angola, gestão Bioprev"
        structuredData={breadcrumbSchema([
          { name: "Início", url: "/" },
          { name: "Sobre", url: "/about" },
          { name: "Política de Gestão", url: "/about/management-policy" },
        ])}
      />
      <Header />

      <main className="flex-grow">
        {/* Hero */}
        <section className="relative h-[300px] sm:h-[380px] md:h-[460px] lg:h-[500px] flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src={aboutHeroBg}
              alt="Política de Gestão - BIOPREV"
              className={`w-full h-full object-cover object-top transition-transform duration-[1.5s] ease-out ${heroLoaded ? "scale-100" : "scale-110"}`}
            />
            <div className="absolute inset-0 bg-[#001d3d]/75" />
          </div>

          <div className="container mx-auto px-4 sm:px-6 z-10">
            <div className="max-w-3xl">
              <nav
                className={`flex flex-wrap items-center gap-1 text-white/90 text-xs sm:text-sm mb-4 sm:mb-6 font-medium transition-all duration-700 ${heroLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              >
                <Link href="/" className="hover:underline">Início</Link>
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                <Link href="/about" className="hover:underline">Sobre</Link>
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Política de Gestão</span>
              </nav>

              <h1
                className={`text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium mb-3 sm:mb-5 leading-tight transition-all duration-1000 delay-150 ${heroLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              >
                Política de Gestão
              </h1>

              <p
                className={`text-white/90 text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed font-light transition-all duration-1000 delay-300 ${heroLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              >
                O nosso compromisso com a qualidade, segurança, saúde e meio ambiente em cada serviço que prestamos.
              </p>
            </div>
          </div>
        </section>

        {/* Intro */}
        <section className="py-12 sm:py-16 md:py-20 bg-white">
          <div
            ref={introReveal.ref}
            className={`container mx-auto px-4 sm:px-6 max-w-4xl sr-hidden ${introReveal.isVisible ? "sr-visible" : ""}`}
          >
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
              <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-[#f2c92f] flex-shrink-0" strokeWidth={1.5} />
              <h2 className="text-2xl sm:text-3xl md:text-[36px] font-medium text-[#333333] leading-tight">
                O nosso compromisso
              </h2>
            </div>
            <p className="text-[#555555] text-sm sm:text-base md:text-[17px] leading-relaxed">
              A <strong className="text-[#333333]">BIOPREV</strong>, empresa prestadora de serviços Mercantis de Desinfestação Geral,
              Jardinagem, Limpeza Urbana e recolha de resíduos, localizada na rua clube Hípico, S/Nº, Benfica-Talatona,
              assegura a total satisfação dos seus clientes, aplicando as melhores práticas ambientais resultantes da sua
              atividade, contribuindo com práticas que visam garantir a saúde dos seus colaboradores, clientes e vizinhança
              em conformidade com a legislação.
            </p>
          </div>
        </section>

        {/* Strategy Pillars */}
        <section className="pb-12 sm:pb-16 md:pb-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <div className="mb-8 sm:mb-12">
              <p className="text-[#007cc3] font-semibold text-sm sm:text-base uppercase tracking-wider mb-3">
                Estratégia
              </p>
              <h2 className="text-xl sm:text-2xl md:text-[28px] font-medium text-[#333333]">
                Nesse contexto a Bioprev utiliza a estratégia baseada em:
              </h2>
            </div>

            <div className="space-y-6 sm:space-y-8">
              {/* Pillar 1 */}
              <div
                ref={block1Reveal.ref}
                className={`bg-[#f8f9fa] border-l-4 border-[#f2c92f] p-6 sm:p-8 sr-hidden ${block1Reveal.isVisible ? "sr-visible" : ""}`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#007cc3] text-white flex items-center justify-center font-bold text-sm sm:text-base flex-shrink-0 mt-0.5">
                    01
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-[#333333] mb-2 sm:mb-3">
                      Qualidade, Segurança & Melhoria Contínua
                    </h3>
                    <p className="text-[#555555] text-sm sm:text-[15px] leading-relaxed">
                      Desenvolver, definir e alcançar metas ou objetivos relacionados à qualidade, segurança, saúde e meio
                      ambiente satisfazendo as necessidades das partes interessadas, bem como as suas expectativas atuais e
                      futuras, promovendo a melhoria contínua na organização, proporcionando-lhes serviços de alta qualidade,
                      com o objetivo de atingir a excelência nos serviços e que satisfaçam os requisitos do sistema de Gestão
                      da Qualidade.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pillar 2 */}
              <div
                ref={block2Reveal.ref}
                className={`bg-[#f8f9fa] border-l-4 border-[#007cc3] p-6 sm:p-8 sr-hidden ${block2Reveal.isVisible ? "sr-visible" : ""}`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#f2c92f] text-[#001d3d] flex items-center justify-center font-bold text-sm sm:text-base flex-shrink-0 mt-0.5">
                    02
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-[#333333] mb-2 sm:mb-3">
                      Cultura de Conhecimento & Desenvolvimento Profissional
                    </h3>
                    <p className="text-[#555555] text-sm sm:text-[15px] leading-relaxed">
                      Promover uma cultura de conhecimento motivando os colaboradores por meio de uma comunicação eficaz,
                      trabalho em equipa e capacitá-los para assegurar o seu desenvolvimento profissional em um ambiente de
                      trabalho proactivo que vise a redução dos incidentes e acidentes de trabalho.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pillar 3 */}
              <div
                ref={block3Reveal.ref}
                className={`bg-[#f8f9fa] border-l-4 border-[#001d3d] p-6 sm:p-8 sr-hidden ${block3Reveal.isVisible ? "sr-visible" : ""}`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#001d3d] text-white flex items-center justify-center font-bold text-sm sm:text-base flex-shrink-0 mt-0.5">
                    03
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-[#333333] mb-2 sm:mb-3">
                      Legislação, Recursos & Otimização
                    </h3>
                    <p className="text-[#555555] text-sm sm:text-[15px] leading-relaxed">
                      Cumprir a legislação e normas aplicáveis, bem como os nossos principais objetivos que compreendem uma
                      alta disponibilidade de equipamentos de produção, com baixos custos de manutenção e de recursos naturais
                      e energéticos visando também a otimização dos recursos humanos e promovendo uma cultura de conhecimento.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Signature */}
            <div className="mt-10 sm:mt-14 pt-6 sm:pt-8 border-t border-gray-200 text-right">
              <p className="text-[#555555] text-sm sm:text-base italic">Luanda, 10 de Dezembro de 2025</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#007cc3] py-10 sm:py-14 md:py-16 text-center">
          <div className="container mx-auto px-4 sm:px-6">
            <h2 className="text-white text-xl sm:text-2xl md:text-3xl font-medium mb-5 sm:mb-8">
              Pronto para trabalhar com a BIOPREV?
            </h2>
            <Link
              href="/contact"
              className="inline-block bg-white text-[#007cc3] hover:bg-white/90 px-8 sm:px-10 md:px-12 py-2.5 sm:py-3 text-sm sm:text-base md:text-lg font-bold transition-all duration-300 hover:shadow-lg"
            >
              Contacte-nos
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
