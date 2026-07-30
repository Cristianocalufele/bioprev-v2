import Header from "@/components/layout/Header";
import Hero from "@/components/home/Hero";
import Services from "@/components/home/Services";
import Reviews from "@/components/home/Reviews";
import Expertise from "@/components/home/Expertise";
import Sectors from "@/components/home/Sectors";
import Partnerships from "@/components/home/Partnerships";
import Footer from "@/components/layout/Footer";
import SEOHead, {
  organizationSchema,
  websiteSchema,
  localBusinessSchema,
  benguelaBranchSchema,
  huamboBranchSchema,
  faqSchema,
} from "@/components/SEOHead";

const homeFaqSchema = faqSchema([
  {
    question: "O que é a Bioprev Angola?",
    answer:
      "A Bioprev Angola é uma empresa angolana fundada em 2010, especializada em controle de pragas, desinfestação, fumigação, limpeza profissional, recolha de resíduos, tratamento de água e jardinagem. Tem sede em Luanda e filiais em Benguela e Huambo.",
  },
  {
    question: "Quais são os serviços da Bioprev Angola?",
    answer:
      "A Bioprev oferece: desinfestação geral (fumigação, pulverização, desratização, desbaratização), limpeza profissional (industrial, doméstica, urbana, de tanques), recolha de resíduos (urbanos, hospitalares, industriais, pós-construção), tratamento e fornecimento de água potável, e jardinagem (manutenção de relvados, poda, rega).",
  },
  {
    question: "Em que cidades a Bioprev opera em Angola?",
    answer:
      "A Bioprev está presente em Luanda (sede na Rua do Clube Hípico, S/N, Benfica), Benguela (Rua do Compão) e Huambo.",
  },
  {
    question: "Como contactar a Bioprev Angola?",
    answer:
      "Pode contactar a Bioprev pelo WhatsApp ou telefone +244 928 737 888 / +244 947 059 109, pelo email geral@bioprev.com ou dp.comercial@bioprevangola.com.",
  },
  {
    question: "A Bioprev faz desinfestação em residências particulares?",
    answer:
      "Sim. A Bioprev realiza serviços de desinfestação em residências, empresas, condomínios, restaurantes, hotéis e instalações industriais em Angola.",
  },
  {
    question: "Há quanto tempo a Bioprev está no mercado angolano?",
    answer:
      "A Bioprev foi fundada em 2010 e tem mais de 15 anos de experiência no mercado angolano de controle de pragas e higiene ambiental.",
  },
]);

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead
        title="Início"
        description="Bioprev Angola — empresa líder em controle de pragas, desinfestação, fumigação, limpeza profissional, recolha de resíduos, fornecimento de água e jardinagem. Presente em Luanda, Benguela e Huambo desde 2010."
        canonical="/"
        keywords="controle de pragas Angola, desinfestação Luanda, fumigação Angola, limpeza profissional Angola, Bioprev Angola, recolha resíduos Angola, fornecimento água Angola, jardinagem Angola, desratização Angola, empresa higiene Angola"
        structuredData={[organizationSchema, websiteSchema, localBusinessSchema, benguelaBranchSchema, huamboBranchSchema, homeFaqSchema]}
      />
      <Header />
      <main className="flex-grow">
        <Hero />
        <Services />
        <Reviews />
        <Expertise />
        <Sectors />
        <Partnerships />
      </main>
      
      <Footer />
    </div>
  );
}
