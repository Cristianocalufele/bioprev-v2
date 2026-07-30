import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  type?: string;
  image?: string;
  keywords?: string;
  noindex?: boolean;
  structuredData?: object | object[];
}

const SITE_NAME = "Bioprev Angola";
const DEFAULT_IMAGE = "/opengraph.jpg";
export const BASE_URL = "https://bioprevangola.com";

export default function SEOHead({
  title,
  description,
  canonical,
  type = "website",
  image,
  keywords,
  noindex = false,
  structuredData,
}: SEOHeadProps) {
  const fullTitle =
    title === "Início"
      ? `${SITE_NAME} — Controle de Pragas, Limpeza e Higiene em Angola`
      : `${title} | ${SITE_NAME}`;
  const ogImage = image ? `${BASE_URL}${image}` : `${BASE_URL}${DEFAULT_IMAGE}`;
  const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : undefined;

  const structuredDataArray = structuredData
    ? Array.isArray(structuredData)
      ? structuredData
      : [structuredData]
    : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      )}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={`${SITE_NAME} — ${title}`} />
      <meta property="og:locale" content="pt_AO" />
      <meta property="og:site_name" content={SITE_NAME} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      {/* Twitter / X */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={`${SITE_NAME} — ${title}`} />

      {/* Geo meta tags */}
      <meta name="geo.region" content="AO-LUA" />
      <meta name="geo.placename" content="Luanda, Angola" />
      <meta name="geo.position" content="-8.8368;13.2343" />
      <meta name="ICBM" content="-8.8368, 13.2343" />

      {/* Authorship & language */}
      <meta name="author" content="Bioprev Angola" />
      <meta name="copyright" content="Bioprev Angola" />
      <meta name="language" content="pt-AO" />

      {/* Structured Data */}
      {structuredDataArray.map((data, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
}

/* ─── Organization ─────────────────────────────────────────────── */
export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${BASE_URL}/#organization`,
  name: "Bioprev Angola",
  legalName: "Bioprev — Prestação de Serviços",
  url: BASE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${BASE_URL}/favicon.png`,
    width: 200,
    height: 60,
  },
  image: `${BASE_URL}/opengraph.jpg`,
  description:
    "Empresa angolana líder em controle de pragas, desinfestação, fumigação, limpeza profissional, recolha de resíduos, fornecimento de água e jardinagem. Fundada em 2010, presente em Luanda, Benguela e Huambo.",
  foundingDate: "2010",
  foundingLocation: {
    "@type": "Place",
    name: "Luanda, Angola",
  },
  numberOfEmployees: {
    "@type": "QuantitativeValue",
    minValue: 50,
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+244-928-737-888",
      contactType: "customer service",
      areaServed: "AO",
      availableLanguage: "Portuguese",
      contactOption: "TollFree",
    },
    {
      "@type": "ContactPoint",
      telephone: "+244-947-059-109",
      contactType: "sales",
      areaServed: "AO",
      availableLanguage: "Portuguese",
    },
  ],
  address: {
    "@type": "PostalAddress",
    streetAddress: "Rua do Clube Hípico, S/N, Benfica",
    addressLocality: "Luanda",
    addressRegion: "Luanda",
    addressCountry: "AO",
  },
  email: "geral@bioprev.com",
  telephone: "+244-928-737-888",
  areaServed: [
    { "@type": "City", name: "Luanda" },
    { "@type": "City", name: "Benguela" },
    { "@type": "City", name: "Huambo" },
    { "@type": "Country", name: "Angola" },
  ],
  knowsAbout: [
    "Controle de Pragas",
    "Desinfestação",
    "Fumigação",
    "Desratização",
    "Desbaratização",
    "Pulverização",
    "Limpeza Profissional",
    "Limpeza Industrial",
    "Recolha de Resíduos",
    "Tratamento de Água",
    "Jardinagem",
    "Higiene Ambiental",
  ],
  sameAs: [
    "https://wa.me/244928737888",
    "https://wa.me/244947059109",
  ],
};

/* ─── WebSite ───────────────────────────────────────────────────── */
export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${BASE_URL}/#website`,
  name: "Bioprev Angola",
  alternateName: "Bioprev",
  url: BASE_URL,
  description:
    "Site oficial da Bioprev Angola — empresa de controle de pragas, limpeza, desinfestação e gestão de resíduos em Angola.",
  inLanguage: "pt-AO",
  publisher: {
    "@type": "Organization",
    "@id": `${BASE_URL}/#organization`,
    name: "Bioprev Angola",
  },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BASE_URL}/blog?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

/* ─── LocalBusiness (Luanda HQ) ─────────────────────────────────── */
export const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "ProfessionalService"],
  "@id": `${BASE_URL}/#business`,
  name: "Bioprev Angola",
  alternateName: "Bioprev",
  image: `${BASE_URL}/opengraph.jpg`,
  logo: `${BASE_URL}/favicon.png`,
  url: BASE_URL,
  telephone: "+244-928-737-888",
  email: "geral@bioprev.com",
  description:
    "Empresa angolana especializada em controle de pragas, desinfestação, fumigação, limpeza profissional, recolha de resíduos, fornecimento de água e jardinagem. Presente em Luanda, Benguela e Huambo desde 2010.",
  slogan: "Os especialistas nacionais em controle de pragas",
  foundingDate: "2010",
  currenciesAccepted: "AOA",
  paymentAccepted: "Transferência Bancária, Numerário",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Rua do Clube Hípico, S/N, Benfica",
    addressLocality: "Luanda",
    addressRegion: "Luanda",
    postalCode: "",
    addressCountry: "AO",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: -8.8368,
    longitude: 13.2343,
  },
  areaServed: [
    { "@type": "City", name: "Luanda" },
    { "@type": "City", name: "Benguela" },
    { "@type": "City", name: "Huambo" },
    { "@type": "Country", name: "Angola" },
  ],
  priceRange: "$$",
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Saturday"],
      opens: "08:00",
      closes: "13:00",
    },
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Serviços Bioprev Angola",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Desinfestação Geral",
          url: `${BASE_URL}/services/disinfestation`,
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Limpeza Profissional",
          url: `${BASE_URL}/services/cleaning`,
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Recolha de Resíduos",
          url: `${BASE_URL}/services/waste`,
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Tratamento de Água",
          url: `${BASE_URL}/services/water`,
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Jardinagem",
          url: `${BASE_URL}/services/gardening`,
        },
      },
    ],
  },
  parentOrganization: {
    "@type": "Organization",
    "@id": `${BASE_URL}/#organization`,
  },
};

/* ─── Branch: Benguela ──────────────────────────────────────────── */
export const benguelaBranchSchema = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "ProfessionalService"],
  "@id": `${BASE_URL}/#business-benguela`,
  name: "Bioprev Angola — Benguela",
  url: `${BASE_URL}/locations`,
  telephone: "+244-927-375-940",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Rua do Compão",
    addressLocality: "Benguela",
    addressRegion: "Benguela",
    addressCountry: "AO",
  },
  parentOrganization: {
    "@type": "Organization",
    "@id": `${BASE_URL}/#organization`,
  },
};

/* ─── Branch: Huambo ────────────────────────────────────────────── */
export const huamboBranchSchema = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "ProfessionalService"],
  "@id": `${BASE_URL}/#business-huambo`,
  name: "Bioprev Angola — Huambo",
  url: `${BASE_URL}/locations`,
  telephone: "+244-912-289-858",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Huambo",
    addressRegion: "Huambo",
    addressCountry: "AO",
  },
  parentOrganization: {
    "@type": "Organization",
    "@id": `${BASE_URL}/#organization`,
  },
};

/* ─── Breadcrumb ────────────────────────────────────────────────── */
export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${BASE_URL}${item.url}`,
    })),
  };
}

/* ─── Service ───────────────────────────────────────────────────── */
export function serviceSchema(name: string, description: string, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url: `${BASE_URL}${url}`,
    provider: {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      name: "Bioprev Angola",
    },
    areaServed: [
      { "@type": "City", name: "Luanda" },
      { "@type": "City", name: "Benguela" },
      { "@type": "City", name: "Huambo" },
    ],
    serviceType: "Controle de Pragas e Higiene Ambiental",
    termsOfService: `${BASE_URL}/about`,
  };
}

/* ─── FAQ ───────────────────────────────────────────────────────── */
export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/* ─── Article (for blog posts) ──────────────────────────────────── */
export function articleSchema({
  headline,
  description,
  datePublished,
  url,
  about,
}: {
  headline: string;
  description: string;
  datePublished: string;
  url: string;
  about: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    datePublished,
    dateModified: datePublished,
    url: `${BASE_URL}${url}`,
    inLanguage: "pt-AO",
    author: {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      name: "Bioprev Angola",
    },
    publisher: {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      name: "Bioprev Angola",
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/favicon.png`,
      },
    },
    image: {
      "@type": "ImageObject",
      url: `${BASE_URL}/opengraph.jpg`,
      width: 1200,
      height: 630,
    },
    about: {
      "@type": "Thing",
      name: about,
    },
    mentions: [
      {
        "@type": "Organization",
        "@id": `${BASE_URL}/#organization`,
        name: "Bioprev Angola",
      },
      {
        "@type": "Place",
        name: "Angola",
      },
    ],
    isPartOf: {
      "@type": "Blog",
      name: "Blog Bioprev Angola",
      url: `${BASE_URL}/blog`,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}${url}`,
    },
  };
}
