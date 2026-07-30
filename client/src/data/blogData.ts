export interface BlogPost {
  id: string;
  title: string;
  category: "news" | "tips";
  categoryLabel: string;
  date: string;
  readTime: string;
  description: string;
  image: string;
  serviceLink: string;
  serviceName: string;
  content: {
    intro: string;
    sections: {
      heading: string;
      body: string;
      list?: string[];
    }[];
    closing: string;
  };
}

export const blogPosts: BlogPost[] = [
  {
    id: "sinais-de-infestacao-que-nao-deve-ignorar",
    title: "Sinais de infestação que não deve ignorar",
    category: "tips",
    categoryLabel: "Dicas de prevenção",
    date: "15 de Junho de 2025",
    readTime: "5 min",
    description:
      "Ratos, baratas ou térmitas no seu espaço? Saiba identificar os primeiros sinais de infestação e por que actuar cedo pode evitar prejuízos maiores para a sua empresa ou residência.",
    image: "blog-fruit-flies",
    serviceLink: "/services/disinfestation",
    serviceName: "Desinfestação Geral",
    content: {
      intro:
        "Em Angola, o clima quente e húmido favorece a proliferação de pragas ao longo de todo o ano. Baratas, ratos, térmitas, mosquitos e formigas são visitantes indesejados que se instalam silenciosamente — muitas vezes antes de serem notados. Identificar os primeiros sinais é o passo mais importante para controlar o problema antes que se torne uma infestação grave.",
      sections: [
        {
          heading: "1. Fezes e vestígios de roedores",
          body: "Os roedores deixam pequenas fezes escuras em cantos, armários e atrás de electrodomésticos. Se encontrar estes sinais, pode ter a certeza de que o animal está activo na sua propriedade. Além das fezes, procure marcas de roer em cabos eléctricos, madeiras ou embalagens de alimentos — os roedores têm os dentes em crescimento contínuo e roem constantemente.",
          list: [
            "Fezes escuras de 3–10 mm em cantos e prateleiras",
            "Marcas de roer em cabos, madeiras ou plásticos",
            "Ninhos feitos de papel, tecido ou materiais isolantes",
            "Cheiro forte e amoniacal sem causa aparente",
          ],
        },
        {
          heading: "2. Actividade nocturna de baratas",
          body: "As baratas são animais nocturnos. Se as vir durante o dia, é sinal de que a população já é grande e está a competir por espaço. Procure também exúvias (peles mudadas), cápsulas de ovos marrom-escuras e um odor oleoso característico em zonas húmidas como cozinhas, casas de banho e locais de armazenamento de alimentos.",
        },
        {
          heading: "3. Danos causados por térmitas",
          body: "As térmitas são responsáveis por danos silenciosos e devastadores em estruturas de madeira. Ao contrário de outras pragas, raramente são vistas directamente. Os sinais incluem madeira que soa oca ao bater, túneis de barro nas paredes e fundações, e asas descartadas perto de janelas e portas — sinal de que o enxame se instalou.",
          list: [
            "Madeiras ocas ao bater",
            "Túneis de barro nas paredes ou fundações",
            "Asas descartadas perto de janelas",
            "Bolhas ou ondulações na tinta e revestimento",
          ],
        },
        {
          heading: "Quando contactar um profissional",
          body: "Se identificar qualquer um destes sinais, não espere. As pragas reproduzem-se rapidamente — uma fêmea de barata pode produzir centenas de descendentes por ano. A intervenção precoce é sempre mais eficaz e menos dispendiosa do que tratar uma infestação avançada.",
        },
      ],
      closing:
        "A Bioprev dispõe de uma equipa especializada em desinfestação geral, com métodos seguros e aprovados para residências, escritórios, restaurantes e instalações industriais. Entre em contacto connosco para uma avaliação gratuita do seu espaço.",
    },
  },
  {
    id: "limpeza-profissional-por-que-faz-diferenca",
    title: "Limpeza profissional: por que faz diferença para o seu negócio",
    category: "tips",
    categoryLabel: "Dicas de prevenção",
    date: "28 de Julho de 2025",
    readTime: "6 min",
    description:
      "Um espaço limpo não é apenas apresentável — é mais seguro, mais produtivo e reduz riscos de infestações. Descubra como a limpeza profissional protege a saúde dos seus colaboradores e a imagem da sua empresa.",
    image: "service-limpeza-hero",
    serviceLink: "/services/cleaning",
    serviceName: "Limpeza Profissional",
    content: {
      intro:
        "A limpeza de um espaço comercial vai muito além da aparência. Superfícies sujas e mal higienizadas são focos de bactérias, vírus e, inevitavelmente, de pragas. Para empresas em Angola — escritórios, restaurantes, hospitais ou condomínios — manter padrões elevados de limpeza é uma questão de saúde pública, produtividade e reputação.",
      sections: [
        {
          heading: "Limpeza e prevenção de pragas: a ligação directa",
          body: "A maioria das infestações começa precisamente onde a higiene falha. Restos de comida, resíduos orgânicos acumulados, lixo não recolhido e superfícies húmidas são as condições ideais para que baratas, ratos e moscas se instalem. Uma limpeza profissional regular elimina estes focos de atracção antes que se tornem problemas.",
          list: [
            "Resíduos alimentares são a principal fonte de atracção de pragas",
            "Humidade acumulada favorece baratas e mosquitos",
            "Lixeiras sem limpeza regular tornam-se ninhos de roedores",
            "Gordura em cozinhas industriais atrai insectos e contamina alimentos",
          ],
        },
        {
          heading: "O impacto na produtividade e bem-estar",
          body: "Estudos mostram que colaboradores que trabalham em ambientes limpos são mais produtivos e têm menor índice de absentismo por doença. No contexto angolano, onde as temperaturas elevadas aceleram a proliferação de microrganismos, a limpeza regular é especialmente crítica em escritórios, unidades de saúde e espaços com grande circulação de pessoas.",
        },
        {
          heading: "O que distingue a limpeza profissional da doméstica",
          body: "A limpeza profissional utiliza produtos industriais certificados, equipamentos de alta pressão e técnicas específicas para cada tipo de superfície e ambiente. A Bioprev forma as suas equipas para identificar pontos críticos de contaminação e actuar com métodos que garantem resultados duradouros — não apenas visualmente limpos, mas higienizados.",
          list: [
            "Produtos certificados e seguros para saúde humana",
            "Equipamentos industriais para limpeza profunda",
            "Técnicas adaptadas a cada tipo de espaço",
            "Relatórios de intervenção para controlo de qualidade",
          ],
        },
        {
          heading: "Periodicidade recomendada por tipo de espaço",
          body: "Nem todos os espaços requerem a mesma frequência de limpeza profissional. Restaurantes e cozinhas industriais necessitam de limpeza diária e higienização profunda semanal. Escritórios beneficiam de limpeza diária e profunda mensal. Condomínios e áreas comuns devem ser limpos diariamente nas zonas de maior tráfego.",
        },
      ],
      closing:
        "A Bioprev oferece programas de limpeza profissional adaptados às necessidades de cada cliente — residências, escritórios, restaurantes, unidades industriais e condomínios em Luanda, Benguela e Huambo. Fale connosco para definir o programa ideal para o seu espaço.",
    },
  },
  {
    id: "gestao-de-residuos-responsabilidade-em-angola",
    title: "Gestão de resíduos: responsabilidade ambiental e legal em Angola",
    category: "news",
    categoryLabel: "Notícias e actualidades",
    date: "10 de Maio de 2025",
    readTime: "5 min",
    description:
      "A correcta gestão de resíduos é uma obrigação legal e ambiental para empresas em Angola. Saiba o que a lei exige, quais os riscos de incumprimento e como a Bioprev pode ajudar a sua organização a estar em conformidade.",
    image: "service-residuos-hero",
    serviceLink: "/services/waste",
    serviceName: "Recolha de Resíduos",
    content: {
      intro:
        "Angola tem vindo a reforçar a sua legislação ambiental nos últimos anos, e a gestão de resíduos é uma das áreas com maior atenção das autoridades. Para empresas e condomínios, o incumprimento das normas de recolha e tratamento de resíduos pode resultar em coimas, interdições e danos significativos à reputação. Mas além da lei, há uma responsabilidade maior: o impacto directo na saúde pública e no ambiente.",
      sections: [
        {
          heading: "O que diz a legislação angolana",
          body: "A Lei de Bases do Ambiente de Angola (Lei n.º 5/98) e os diplomas complementares estabelecem obrigações claras para produtores de resíduos. Empresas do sector hospitalar, industrial, da construção civil e da restauração têm requisitos específicos quanto à separação, armazenamento temporário, transporte e destino final dos resíduos que produzem.",
          list: [
            "Resíduos hospitalares exigem recolha e tratamento especializados",
            "Resíduos industriais não podem ser misturados com resíduos domésticos",
            "O transporte deve ser feito por operadores licenciados",
            "A empresa produtora é responsável pelo destino final dos seus resíduos",
          ],
        },
        {
          heading: "Os riscos do abandono de resíduos",
          body: "Resíduos mal geridos são um dos principais vectores de infestação de pragas urbanas. Ratos, baratas e moscas proliferam em locais com acumulação de lixo. Além disso, resíduos orgânicos em decomposição libertam gases e líquidos que contaminam solos e lençóis freáticos, com impacto directo na saúde das populações vizinhas.",
        },
        {
          heading: "Tipos de resíduos que a Bioprev recolhe",
          body: "A Bioprev está equipada para recolher e encaminhar correctamente uma ampla variedade de resíduos, respeitando as normas ambientais e de saúde pública em vigor em Angola.",
          list: [
            "Resíduos urbanos e domésticos",
            "Resíduos de construção e demolição",
            "Resíduos hospitalares e de unidades de saúde",
            "Resíduos industriais e de armazéns",
            "Resíduos orgânicos de condomínios e restaurantes",
          ],
        },
        {
          heading: "Como garantir conformidade na sua empresa",
          body: "O primeiro passo é mapear os resíduos que a sua organização produz e avaliar os requisitos legais aplicáveis. A Bioprev pode apoiar este processo, sugerindo um plano de recolha adequado, com frequência e meios de transporte dimensionados para o volume produzido. Emitimos documentação de acompanhamento para que a sua empresa tenha sempre o registo das operações.",
        },
      ],
      closing:
        "Não deixe a gestão de resíduos para último plano. A Bioprev oferece serviços de recolha e transporte de resíduos em Luanda, Benguela e Huambo, com equipas e viaturas dedicadas para garantir o cumprimento das suas obrigações legais e ambientais.",
    },
  },
  {
    id: "manutencao-de-areas-verdes-em-angola",
    title: "Manutenção de áreas verdes: como criar espaços saudáveis e valorizados",
    category: "news",
    categoryLabel: "Notícias e actualidades",
    date: "3 de Abril de 2025",
    readTime: "4 min",
    description:
      "Jardins e áreas verdes bem mantidos valorizam imóveis, melhoram o bem-estar de quem os habita e reduzem pragas. Veja as melhores práticas de manutenção para o clima angolano.",
    image: "service-jardinagem-hero",
    serviceLink: "/services/gardening",
    serviceName: "Jardinagem",
    content: {
      intro:
        "As áreas verdes — jardins de condomínios, parques empresariais, espaços exteriores de hotéis — são muito mais do que decoração. Quando bem mantidas, contribuem para o bem-estar de quem as utiliza, valorizam os imóveis e, surpreendentemente, reduzem a incidência de pragas. Quando abandonadas, tornam-se o habitat ideal para roedores, insectos e outros indesejados.",
      sections: [
        {
          heading: "O clima angolano e os desafios da jardinagem",
          body: "Angola tem um clima tropical com estação seca e estação das chuvas bem definidas. Durante a estação das chuvas, o crescimento das plantas acelera e a humidade aumenta — condições que também favorecem a proliferação de fungos, insectos e roedores. Durante a estação seca, a falta de água pode secar rapidamente vegetação não adaptada. Uma estratégia de manutenção eficaz tem de contemplar estas duas realidades.",
          list: [
            "Corte regular do relvado para evitar esconderijos de roedores",
            "Poda preventiva de arbustos que cobrem paredes e entradas",
            "Drenagem adequada para evitar acumulação de água parada",
            "Selecção de espécies adaptadas ao clima local",
          ],
        },
        {
          heading: "Áreas verdes e controlo de pragas: a relação que poucos conhecem",
          body: "Vegetação alta e densa junto a edifícios é uma das principais vias de entrada de ratos e insectos. Roedores usam ramos que tocam paredes ou telhados como pontes de acesso. Folhas acumuladas criam camadas húmidas que atraem baratas, lagartas e fungos. Uma manutenção regular — corte, poda e limpeza de folhagem acumulada — é também uma medida de controlo de pragas.",
        },
        {
          heading: "Serviços de jardinagem da Bioprev",
          body: "A equipa de jardinagem da Bioprev actua em condomínios residenciais, instalações empresariais, hotéis e espaços públicos em Luanda, Benguela e Huambo. Os nossos serviços incluem manutenção periódica de relvados e arbustos, plantação e substituição de espécies, sistemas de rega e tratamento fitossanitário.",
          list: [
            "Corte e manutenção de relvado",
            "Poda de arbustos, sebe e árvores",
            "Limpeza de folhagem e resíduos vegetais",
            "Tratamento fitossanitário preventivo",
            "Instalação e manutenção de sistemas de rega",
          ],
        },
        {
          heading: "Com que frequência devo fazer manutenção?",
          body: "Durante a estação das chuvas (Outubro a Abril), recomendamos manutenção quinzenal — o crescimento acelerado das plantas exige intervenção frequente. Na estação seca, a manutenção mensal é geralmente suficiente, complementada com rega regular. Em espaços de grande dimensão ou com muita circulação de pessoas, como hotéis e condomínios, a periodicidade semanal garante sempre uma imagem cuidada.",
        },
      ],
      closing:
        "A Bioprev oferece contratos de manutenção de áreas verdes com visitas periódicas adaptadas ao tamanho e necessidades do seu espaço. Contacte-nos para uma avaliação gratuita e um orçamento personalizado.",
    },
  },
];

export function getPostById(id: string): BlogPost | undefined {
  return blogPosts.find((p) => p.id === id);
}
