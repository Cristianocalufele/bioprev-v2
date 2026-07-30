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
  /* ── DICAS DE PREVENÇÃO ──────────────────────────────────────── */
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
    id: "como-prevenir-baratas-em-restaurantes",
    title: "Como prevenir baratas em cozinhas de restaurantes",
    category: "tips",
    categoryLabel: "Dicas de prevenção",
    date: "20 de Julho de 2025",
    readTime: "5 min",
    description:
      "Uma cozinha de restaurante é o ambiente ideal para baratas: calor, humidade e alimentos. Saiba as medidas preventivas que os melhores restaurantes em Angola adoptam para manter as pragas fora.",
    image: "blog-food-safety",
    serviceLink: "/services/disinfestation",
    serviceName: "Desinfestação Geral",
    content: {
      intro:
        "Uma barata avistada numa cozinha ou sala de refeições pode destruir a reputação de um restaurante em minutos — basta um cliente partilhar nas redes sociais. Mais do que um problema de imagem, as baratas transportam agentes patogénicos que causam doenças graves como salmonela, gastroenterite e hepatite. Prevenir é, neste caso, muito mais eficaz do que remediar.",
      sections: [
        {
          heading: "Por que as baratas adoram cozinhas industriais",
          body: "As baratas prosperam em ambientes com três elementos: calor, humidade e alimento. Uma cozinha industrial fornece os três em abundância. Fogões, fritadeiras e fornos criam zonas quentes. O vapor e a lavagem constante geram humidade. E a presença permanente de alimentos — mesmo microscópica, como gordura nos rejuntes — alimenta colónias inteiras.",
          list: [
            "Fendas atrás de equipamentos e bancadas são esconderijos ideais",
            "Tubagens de água e esgotos são vias de entrada comuns",
            "Entregas de mercadorias podem introduzir ovos de baratas",
            "Caixotes de lixo sem tampa são fontes de alimentação constante",
          ],
        },
        {
          heading: "Medidas preventivas essenciais",
          body: "A prevenção começa na rotina diária. Limpeza rigorosa no final de cada turno — incluindo debaixo de equipamentos, dentro de fornos e atrás de frigoríficos — é a primeira linha de defesa. Vedar fendas e fissuras em paredes e pavimentos elimina os esconderijos preferidos das baratas. A gestão correcta do lixo, com lixeiras fechadas e esvaziadas regularmente, corta o acesso a alimento.",
          list: [
            "Limpar debaixo e atrás de todos os equipamentos diariamente",
            "Vedar fendas em paredes, rodapés e zonas de tubagens",
            "Armazenar alimentos em recipientes fechados e herméticos",
            "Manter lixeiras com tampa e esvaziar no final de cada turno",
            "Inspecionar todas as entregas antes de as armazenar",
          ],
        },
        {
          heading: "Quando a prevenção não é suficiente",
          body: "Mesmo com medidas preventivas rigorosas, as baratas podem instalar-se — especialmente em edifícios mais antigos ou em zonas urbanas densas. Quando tal acontece, o tratamento profissional é a solução mais eficaz e segura. A Bioprev utiliza gel insecticida de alta eficácia e tratamentos por pulverização em zonas não alimentares, com produtos aprovados para uso em estabelecimentos de restauração.",
        },
        {
          heading: "O papel das auditorias periódicas",
          body: "Restaurantes de referência em Angola contratam serviços de monitorização periódica com a Bioprev — visitas regulares para inspecção preventiva, colocação de isco e relatório técnico. Este acompanhamento permite detectar sinais de actividade antes de uma infestação se desenvolver e manter a documentação necessária para auditorias de segurança alimentar.",
        },
      ],
      closing:
        "A Bioprev tem experiência no controlo de pragas em restaurantes, hotéis e unidades de restauração colectiva em Angola. Oferecemos contratos de manutenção preventiva com visitas periódicas e relatórios técnicos. Entre em contacto para um programa personalizado.",
    },
  },
  {
    id: "habitos-que-atraem-pragas-para-o-escritorio",
    title: "5 hábitos que atraem pragas para o seu escritório",
    category: "tips",
    categoryLabel: "Dicas de prevenção",
    date: "5 de Maio de 2025",
    readTime: "4 min",
    description:
      "Muitas infestações em escritórios começam por hábitos simples e facilmente corrigíveis. Descubra os 5 comportamentos mais comuns que transformam espaços de trabalho em ambientes favoráveis a pragas.",
    image: "blog-industry",
    serviceLink: "/services/disinfestation",
    serviceName: "Desinfestação Geral",
    content: {
      intro:
        "Um escritório pode parecer um ambiente pouco atraente para pragas — não há cozinha industrial nem grandes quantidades de alimento à vista. Mas a realidade é diferente. Escritórios em Angola são regularmente afectados por infestações de baratas, formigas e até roedores, muitas vezes por causa de hábitos do dia-a-dia que os colaboradores não associam a esse risco.",
      sections: [
        {
          heading: "1. Comer na secretária",
          body: "Comer na secretária é o hábito mais comum e um dos mais problemáticos. Migalhas de pão, restos de fruta, gotas de café e açúcar derramado acumulam-se em teclados, gavetas e sob mobiliário — uma fonte de alimento invisível mas constante para formigas e baratas. Designar uma área específica para refeições e exigir a sua limpeza após uso reduz significativamente este risco.",
        },
        {
          heading: "2. Lixeiras sem tampa ou esvaziadas com pouca frequência",
          body: "Lixeiras abertas e cheias são pontos de atracção directa para pragas. No calor angolano, resíduos orgânicos deterioram-se rapidamente e libertam odores que atraem insectos. Lixeiras com tampa e esvaziadas diariamente eliminam este foco. Em escritórios de maior dimensão, a recolha interna deve ser feita no final de cada dia de trabalho.",
          list: [
            "Usar sempre lixeiras com tampa de fecho",
            "Esvaziar no final de cada dia de trabalho",
            "Lavar as lixeiras semanalmente",
            "Colocar o lixo em sacos fechados antes de recolher",
          ],
        },
        {
          heading: "3. Plantas de interior mal cuidadas",
          body: "Plantas decorativas de interior são frequentemente negligenciadas. Excesso de rega cria solo encharcado — o ambiente perfeito para fungos gnats (mosquitos de fungos) e outros insectos. Folhas mortas acumuladas à volta da base da planta atraem ainda mais organismos. Mantenha uma rega controlada e limpe regularmente os vasos.",
        },
        {
          heading: "4. Fendas e frestas não vedadas",
          body: "Escritórios em edifícios mais antigos frequentemente têm fendas em rodapés, volta de tubagens e junções entre paredes e pavimento. Estas aberturas são as principais vias de entrada de baratas e roedores. Uma inspecção anual e vedação com silicone ou argamassa é uma medida simples e eficaz.",
        },
        {
          heading: "5. Armazenamento desorganizado e documentos empilhados",
          body: "Arquivos em papel, caixas de cartão e arrumos desorganizados são esconderijos ideais para baratas e, em casos mais graves, para roedores. O cartão é um material que as baratas adoram para nidificar. Organizar o arquivo, preferir caixas de plástico fechadas e manter os arrumos em ordem reduz significativamente estes refúgios.",
        },
      ],
      closing:
        "Pequenas mudanças de comportamento fazem uma grande diferença na prevenção de infestações. Mas se o seu escritório já mostra sinais de actividade de pragas, a Bioprev pode ajudar com uma intervenção técnica rápida, discreta e eficaz. Contacte-nos para uma avaliação.",
    },
  },

  /* ── NOTÍCIAS E ACTUALIDADES ─────────────────────────────────── */
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
          body: "A equipa de jardinagem da Bioprev actua em condomínios residenciais, instalações empresariais, hotéis e espaços públicos em Luanda, Benguela e Huambo.",
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
          body: "Durante a estação das chuvas (Outubro a Abril), recomendamos manutenção quinzenal — o crescimento acelerado das plantas exige intervenção frequente. Na estação seca, a manutenção mensal é geralmente suficiente, complementada com rega regular. Em espaços de grande dimensão ou com muita circulação de pessoas, a periodicidade semanal garante sempre uma imagem cuidada.",
        },
      ],
      closing:
        "A Bioprev oferece contratos de manutenção de áreas verdes com visitas periódicas adaptadas ao tamanho e necessidades do seu espaço. Contacte-nos para uma avaliação gratuita e um orçamento personalizado.",
    },
  },
  {
    id: "desinfestacao-o-que-esperar-de-uma-visita-tecnica",
    title: "Desinfestação profissional: o que esperar de uma visita técnica",
    category: "news",
    categoryLabel: "Notícias e actualidades",
    date: "18 de Março de 2025",
    readTime: "5 min",
    description:
      "Nunca contratou um serviço de desinfestação? Saiba exactamente o que acontece durante uma visita técnica da Bioprev — da inspecção inicial ao relatório pós-tratamento.",
    image: "service-desinfestacao-hero",
    serviceLink: "/services/disinfestation",
    serviceName: "Desinfestação Geral",
    content: {
      intro:
        "Muitos clientes contratam o seu primeiro serviço de desinfestação sem saber o que esperar. A incerteza sobre os procedimentos, os produtos utilizados e o tempo de afastamento do espaço é natural. A Bioprev acredita que a transparência é parte do serviço — por isso explicamos, passo a passo, o que acontece numa visita técnica de desinfestação profissional.",
      sections: [
        {
          heading: "1. Contacto inicial e agendamento",
          body: "Tudo começa com o contacto do cliente — por telefone, WhatsApp ou email. A nossa equipa comercial recolhe informação sobre o tipo de espaço, a praga identificada e a urgência da intervenção. Com base nessa informação, agendamos uma visita técnica na data e hora mais conveniente para o cliente.",
        },
        {
          heading: "2. Inspecção técnica do espaço",
          body: "No início da visita, o técnico da Bioprev realiza uma inspecção detalhada do espaço para identificar o tipo de praga, o nível de infestação, as vias de entrada e os focos de actividade. Esta fase é fundamental para definir o método e os produtos mais adequados a cada situação.",
          list: [
            "Identificação da espécie de praga presente",
            "Avaliação do nível de infestação (baixo, médio, elevado)",
            "Mapeamento das vias de entrada e esconderijos",
            "Análise das condições que favorecem a presença da praga",
          ],
        },
        {
          heading: "3. Aplicação do tratamento",
          body: "Com base na inspecção, o técnico aplica o tratamento mais indicado. A Bioprev utiliza uma combinação de métodos consoante o caso: pulverização de superfícies, aplicação de gel insecticida em fendas e pontos de actividade, fumigação em espaços fechados, ou colocação de isco em pontos estratégicos. Todos os produtos utilizados são certificados e seguros para uso em espaços habitados e comerciais.",
        },
        {
          heading: "4. Orientações pós-tratamento e relatório",
          body: "Após a aplicação, o técnico fornece orientações detalhadas: tempo de afastamento do espaço (quando aplicável), medidas preventivas a adoptar e sinais a vigiar nas semanas seguintes. O cliente recebe um relatório técnico escrito com o diagnóstico, o tratamento realizado e as recomendações. Este documento é útil para registos internos e auditorias de higiene e segurança.",
        },
        {
          heading: "5. Visitas de acompanhamento",
          body: "Em infestações moderadas a graves, a Bioprev recomenda visitas de acompanhamento para avaliar a eficácia do tratamento e realizar reforços se necessário. Os nossos contratos de manutenção preventiva incluem visitas periódicas para garantir que o problema não regressa.",
        },
      ],
      closing:
        "Uma visita técnica da Bioprev é rápida, discreta e eficaz. Actuamos em residências, escritórios, restaurantes, hospitais e instalações industriais em Luanda, Benguela e Huambo. Contacte-nos para agendar a sua visita.",
    },
  },
  {
    id: "qualidade-e-compromisso-bioprev",
    title: "Qualidade certificada: o compromisso da Bioprev com os seus clientes",
    category: "news",
    categoryLabel: "Notícias e actualidades",
    date: "28 de Fevereiro de 2025",
    readTime: "4 min",
    description:
      "A qualidade não é um slogan — é uma prática diária na Bioprev. Conheça os padrões, a formação de equipas e o sistema de controlo que garantem resultados consistentes em cada serviço prestado.",
    image: "blog-innovation",
    serviceLink: "/about",
    serviceName: "Sobre a Bioprev",
    content: {
      intro:
        "Quando uma empresa contrata um serviço de controlo de pragas, limpeza ou gestão de resíduos, está a confiar nos profissionais que entram no seu espaço — e nos resultados que ficam após a sua saída. Na Bioprev, a qualidade do serviço não é uma promessa vaga: é um sistema de práticas, formação e acompanhamento que garante resultados consistentes para cada cliente, em cada visita.",
      sections: [
        {
          heading: "Formação contínua das equipas",
          body: "Todos os técnicos da Bioprev passam por formação inicial antes de efectuarem qualquer intervenção autónoma. A formação cobre identificação de pragas, manuseamento seguro de produtos químicos, técnicas de aplicação, leitura de fichas de segurança e procedimentos de emergência. A formação não é um evento único — é actualizada regularmente à medida que novos produtos e métodos são introduzidos.",
          list: [
            "Formação técnica em identificação e controlo de pragas",
            "Certificação em manuseamento de produtos fitossanitários",
            "Formação em segurança e higiene no trabalho",
            "Actualização periódica com novos métodos e produtos",
          ],
        },
        {
          heading: "Produtos certificados e seguros",
          body: "A Bioprev utiliza exclusivamente produtos registados e aprovados pelas autoridades competentes para uso em Angola. Todos os produtos têm ficha técnica de segurança disponível e são escolhidos com base na sua eficácia comprovada e no menor impacto possível para a saúde humana e o ambiente. Para espaços sensíveis — hospitais, creches, indústria alimentar — utilizamos produtos com formulações especialmente indicadas.",
        },
        {
          heading: "Relatórios e rastreabilidade",
          body: "Após cada intervenção, o cliente recebe um relatório técnico com o diagnóstico, o tratamento aplicado, os produtos utilizados (com referências e dosagens) e as recomendações para o período seguinte. Este sistema de documentação garante rastreabilidade total — fundamental para empresas com auditorias de qualidade, segurança alimentar ou certificações ISO.",
        },
        {
          heading: "Satisfação do cliente como métrica central",
          body: "A Bioprev monitoriza a satisfação dos clientes após cada intervenção. O feedback recolhido é analisado internamente para identificar oportunidades de melhoria. Clientes com contratos de manutenção têm um gestor de conta dedicado que assegura a continuidade do serviço e responde rapidamente a qualquer situação.",
        },
      ],
      closing:
        "A qualidade é o nosso compromisso mais importante. Se procura um parceiro fiável para controlo de pragas, limpeza profissional, gestão de resíduos ou jardinagem em Angola, a Bioprev está pronta para servir a sua empresa ou residência.",
    },
  },
];

export function getPostById(id: string): BlogPost | undefined {
  return blogPosts.find((p) => p.id === id);
}
