import { Zap, Shield, SprayCan, Microscope, Wind, FileCheck, Bug, Rat, Archive, FlaskConical, BarChart3, Home, Briefcase, Utensils, Building2, Building, Ship, Warehouse, Sprout } from "lucide-react";
import ServicePageTemplate, { type ServicePageData } from "./ServicePageTemplate";
import desinfestacaoHero from "../../assets/images/service-desinfestacao-hero.jpg";
import desinfEspecializadaImg from "../../assets/images/imagem1_convertida.png";
import desinfPreventivaImg from "../../assets/images/imagem2_convertida.png";

const data: ServicePageData = {
  seoTitle: "Desinfestação Profissional em Angola",
  seoDescription: "Serviços de desinfestação, fumigação, pulverização, desratização, desbaratização e controlo de gorgulhos e traças em Angola. A Bioprev elimina pragas com segurança em Luanda, Benguela e Huambo.",
  seoKeywords: "desinfestação Angola, fumigação Luanda, pulverização, desratização Angola, desbaratização, gorgulhos, traças, carunchos, controle de pragas Angola, Bioprev desinfestação",
  seoCanonical: "/services/disinfestation",
  heroImage: desinfestacaoHero,
  heroImageAlt: "Serviço de desinfestação",
  breadcrumbLabel: "Desinfestação",
  heroTitle: "Serviços de desinfestação\ngeral e profissional",
  heroSubtitle: "A Bioprev oferece serviços especializados de fumigação, pulverização, desratização, desbaratização, controlo de gorgulhos e traças, e tratamentos com gel — soluções completas para eliminar pragas com segurança e eficiência em todo o país.",
  introText: "A Bioprev protege pessoas, residências e empresas dos perigos das pragas urbanas com mais de nove anos de experiência no mercado angolano. Utilizamos produtos seguros, certificados e sem prejuízo para a saúde do homem e para o meio ambiente.",
  introSubtext: "É com intenção de servir a população e instituições no controlo de pragas que a BIOPREV utiliza equipamentos e métodos mais modernos, com garantia de um serviço profissional, eficiente e uma equipa técnica hábil e dedicada. Tornando-se parte ativa da estratégia e sucesso da empresa, oferecemos alta qualidade ao menor custo possível.",
  sectionTitle: "Serviços especializados de desinfestação geral",
  sectionText: "A Bioprev dedica-se a manter os seus funcionários, clientes e a reputação da marca protegidos com serviços de desinfestação líderes de mercado. Oferecemos métodos completos de desinfestação — fumigação, pulverização, desratização, desbaratização, controlo de gorgulhos e traças, e aplicação de gel — cada um adaptado ao tipo de praga e ao ambiente a tratar.",
  serviceCards: [
    {
      title: "Desinfestação especializada",
      description: "Os nossos serviços de desinfestação especializada fornecem uma resposta rápida para ajudá-lo a manter um alto nível de higiene nas suas instalações, reduzindo o risco de infecção e contaminação através de fumigação, pulverização e tratamentos com gel.",
      image: desinfEspecializadaImg,
      imageAlt: "Desinfestação especializada"
    },
    {
      title: "Desinfestação preventiva",
      description: "Uma série de soluções de desinfestação preventiva — incluindo desratização, desbaratização e controlo de gorgulhos e traças — concebidas para ajudar as empresas a manter um ambiente seguro e proporcionar paz de espírito aos funcionários e visitantes.",
      image: desinfPreventivaImg,
      imageAlt: "Desinfestação preventiva"
    }
  ],
  detailsTitle: "Os nossos métodos de desinfestação",
  detailsSubtitle: "Conheça em detalhe cada um dos métodos especializados que a Bioprev utiliza para eliminar pragas de forma segura e eficaz nas suas instalações, incluindo o controlo de gorgulhos, traças e carunchos em produtos armazenados.",
  details: [
    { icon: Wind, title: "Fumigação", description: "A fumigação consiste num tipo de controle de pragas que é um procedimento de desinfestação por via seca. Através do tratamento químico realizado com compostos químicos ou formulações pesticidas (fumegantes) voláteis em sistema hermético, visando a desinfestação de materiais e instalações." },
    { icon: SprayCan, title: "Pulverização", description: "É a aplicação de um produto pesticida em modo de dispersar através de gotas de dimensão variável dependendo do tipo de aparelho de pulverização, garantindo uma distribuição correta e uniforme das substâncias ativas." },
    { icon: Rat, title: "Desratização", description: "O serviço de desratização é feito por profissionais especializados para localizar os focos da infestação de ratos e remover essa praga urbana do local com segurança, através da aplicação de produtos químicos posicionados estrategicamente." },
    { icon: Bug, title: "Desbaratização", description: "A forma mais eficaz de prevenir das baratas é efectuar o serviço de desbaratização, com aplicação de gel ou spray nos pontos críticos das instalações." },
    { icon: Shield, title: "Gel anti-baratas", description: "Este gel é aplicado em todos os pontos críticos das instalações, para obter um efeito máximo de mortalidade de baratas em menos de uma semana, sem qualquer risco para a saúde dos ocupantes." },
    { icon: Archive, title: "Controlo de traças e carunchos", description: "Oferecemos tratamentos especializados para armazéns, indústria alimentar, museus e arquivos, eliminando estas pragas com métodos seguros e eficazes." },
    { icon: FlaskConical, title: "Fumigação de armazéns", description: "Fumigação profissional de armazéns, contentores e silos para eliminar gorgulhos, traças e carunchos em todas as fases do ciclo de vida, com produtos certificados." },
    { icon: Microscope, title: "Análise e identificação", description: "Testes e inspeções especializadas para identificar o tipo de praga presente, determinar os focos de infestação e selecionar o tratamento mais eficaz para cada cliente." },
    { icon: FileCheck, title: "Certificação pós-tratamento", description: "Emissão de certificados de desinfestação que comprovam o cumprimento dos protocolos de higiene e segurança exigidos, com relatórios detalhados de todos os métodos e produtos utilizados." },
    { icon: BarChart3, title: "Relatório estatístico de controle", description: "Cada cliente possui acesso a relatórios estatísticos completos: pragas capturadas por tipo de armadilha, consumo de pesticida, ocorrência de pragas nas fichas de monitoramento e relatórios de trabalho preventivo e corretivo." }
  ],
  approachTitle: "O nosso processo de desinfestação",
  approachText: "A Bioprev segue uma abordagem rigorosa para a desinfestação profissional, garantindo que todas as etapas sejam tratadas com os mais altos padrões de segurança e qualidade.",
  approachSteps: [
    { title: "Pesquisa e avaliação de risco", content: "Realizamos uma avaliação detalhada das suas instalações para identificar áreas de alto risco, pontos de contacto frequente e potenciais focos de infestação." },
    { title: "Identificação de espécies e fonte", content: "Recolhemos amostras e realizamos análise para identificar a espécie exata, o ciclo de vida e o nível de infestação, permitindo um tratamento direcionado." },
    { title: "Preparação e protocolos de segurança", content: "Antes de iniciar o tratamento, estabelecemos todos os protocolos de segurança necessários, incluindo isolamento de áreas e proteção de equipamentos sensíveis." },
    { title: "Aplicação do tratamento especializado", content: "Os nossos técnicos certificados aplicam os tratamentos utilizando equipamento de última geração, adaptado ao tipo de praga e ambiente de cada cliente." },
    { title: "Verificação pós-tratamento", content: "Após o tratamento, realizamos verificações rigorosas para confirmar a eficácia da desinfestação em todas as áreas tratadas." },
    { title: "Certificação e relatórios estatísticos", content: "Emitimos um certificado de desinfestação e relatórios estatísticos completos prontos para auditorias e inspeções regulamentares." },
    { title: "Prevenção e aconselhamento contínuo", content: "Fornecemos recomendações detalhadas sobre boas práticas para prevenir futuras infestações." }
  ],
  whyTitle: "Porquê escolher a Bioprev para desinfestação?",
  whyText1: "Na Bioprev, os nossos especialistas em desinfestação dedicam-se a identificar as soluções mais seguras e eficazes para proteger a sua casa e negócio. Oferecemos métodos completos — fumigação, pulverização, desratização, desbaratização, controlo de gorgulhos e traças, e gel — cada um selecionado após inspeção minuciosa.",
  whyText2: "Utilizamos apenas produtos certificados e sem prejuízo para a saúde do homem e para o meio ambiente. Além de tratamentos eficazes, oferecemos um sistema completo de relatórios estatísticos de controle de pragas. Escolha a Bioprev para soluções completas, ecológicas e um compromisso com os mais altos padrões de serviço.",
  ctaTitle: "Agende a sua avaliação de desinfestação hoje",
  sectorsTitle: "Setores onde atuamos com desinfestação",
  sectorsText: "Os nossos serviços de desinfestação são adaptados às necessidades específicas de cada setor, garantindo soluções eficazes e em conformidade com as regulamentações de cada indústria.",
  sectors: [
    { icon: Home, name: "Residência", description: "Serviços de desinfestação para residências e habitações, eliminando pragas domésticas com produtos seguros para a família e animais de estimação." },
    { icon: Briefcase, name: "Escritório", description: "Tratamentos discretos fora do horário laboral para manter ambientes de escritório confortáveis e livres de pragas." },
    { icon: Utensils, name: "Restaurante", description: "Programas intensivos para cozinhas e salas de restaurantes que garantem a segurança alimentar e a conformidade sanitária." },
    { icon: Building2, name: "Empresas", description: "Soluções de desinfestação personalizadas para empresas de todos os sectores, garantindo ambientes de trabalho seguros e saudáveis." },
    { icon: Building, name: "Condomínio", description: "Programas coordenados para condomínios residenciais e comerciais, garantindo proteção uniforme em todas as áreas comuns e privadas." },
    { icon: Ship, name: "Espurgos de Navios", description: "Serviços especializados de fumigação e desinfestação de navios, embarcações e contentores marítimos, cumprindo normas internacionais de fitossanidade." },
    { icon: Warehouse, name: "Espurgos de Silos", description: "Fumigação profissional de silos e armazéns de cereais para eliminar gorgulhos, traças e carunchos em todas as fases do ciclo de vida, com produtos certificados." },
    { icon: Sprout, name: "Espalate", description: "Tratamentos de desinfestação para espaços agrícolas e de armazenamento de produtos, protegendo colheitas e stocks contra pragas." },
  ]
};

export default function Disinfestation() {
  return <ServicePageTemplate data={data} />;
}
