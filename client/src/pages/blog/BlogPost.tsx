import { Link, useParams } from "wouter";
import { ChevronRight, Clock, ArrowRight, ArrowLeft } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEOHead, { breadcrumbSchema, articleSchema } from "@/components/SEOHead";
import { getPostById, blogPosts } from "@/data/blogData";

// Static image map — Vite requires static imports
import imgBlogFruitFlies from "@/assets/images/blog-fruit-flies.jpg";
import imgBlogFoodSafety from "@/assets/images/blog-food-safety.jpg";
import imgBlogIndustry from "@/assets/images/blog-industry.jpg";
import imgBlogInnovation from "@/assets/images/blog-innovation.jpg";
import imgServiceLimpeza from "@/assets/images/service-limpeza-hero.jpg";
import imgServiceResiduos from "@/assets/images/service-residuos-hero.jpg";
import imgServiceJardinagem from "@/assets/images/service-jardinagem-hero.jpg";
import imgServiceDesinf from "@/assets/images/service-desinfestacao-hero.jpg";

const imageMap: Record<string, string> = {
  "blog-fruit-flies": imgBlogFruitFlies,
  "blog-food-safety": imgBlogFoodSafety,
  "blog-industry": imgBlogIndustry,
  "blog-innovation": imgBlogInnovation,
  "service-limpeza-hero": imgServiceLimpeza,
  "service-residuos-hero": imgServiceResiduos,
  "service-jardinagem-hero": imgServiceJardinagem,
  "service-desinfestacao-hero": imgServiceDesinf,
};

export default function BlogPost() {
  const { id } = useParams();
  const post = id ? getPostById(id) : undefined;

  // Related posts — up to 2 posts from the same category, excluding current
  const related = post
    ? blogPosts.filter((p) => p.id !== post.id && p.category === post.category).slice(0, 2)
    : [];

  if (!post) {
    return (
      <div className="min-h-screen bg-white flex flex-col font-sans">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center px-4">
            <h1 className="text-2xl font-bold text-[#333333] mb-4">Artigo não encontrado</h1>
            <p className="text-[#666666] mb-8">Este artigo não existe ou foi removido.</p>
            <Link
              href="/blog"
              className="inline-block border-2 border-[#007cc3] text-[#007cc3] hover:bg-[#007cc3] hover:text-white px-8 py-3 font-medium transition-all"
            >
              Ver todos os artigos
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const heroImage = imageMap[post.image] ?? imgBlogFruitFlies;

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <SEOHead
        title={post.title}
        description={post.description}
        canonical={`/blog/${post.id}`}
        keywords={`blog Bioprev Angola, ${post.categoryLabel}, controle pragas Angola`}
        type="article"
        structuredData={[
          breadcrumbSchema([
            { name: "Início", url: "/" },
            { name: "Blog", url: "/blog" },
            { name: post.categoryLabel, url: "/blog" },
            { name: post.title, url: `/blog/${post.id}` },
          ]),
          articleSchema({
            headline: post.title,
            description: post.description,
            datePublished: post.date,
            url: `/blog/${post.id}`,
            about: post.serviceName,
          }),
        ]}
      />
      <Header />

      <main className="flex-grow">
        {/* Hero */}
        <div className="relative h-[280px] sm:h-[360px] md:h-[440px] w-full bg-[#001d3d] overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-50"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#001d3d]/80 via-transparent to-transparent" />

          <div className="relative z-10 h-full container mx-auto px-4 sm:px-6 flex flex-col">
            {/* Breadcrumb */}
            <nav className="py-4 flex items-center flex-wrap gap-1 text-sm text-white/80 font-medium mb-auto">
              <Link href="/" className="hover:underline">Início</Link>
              <ChevronRight className="w-4 h-4" />
              <Link href="/blog" className="hover:underline">Blog</Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-white/60 truncate max-w-[200px] sm:max-w-xs">{post.title}</span>
            </nav>

            {/* Title area */}
            <div className="mb-8 sm:mb-12 max-w-3xl">
              <span className="inline-block bg-[#f2c92f] text-[#001d3d] text-xs font-bold uppercase tracking-wider px-3 py-1 mb-3">
                {post.categoryLabel}
              </span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-4">
                {post.title}
              </h1>
              <div className="flex items-center gap-4 text-white/60 text-sm">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {post.readTime} de leitura
                </span>
                <span>·</span>
                <span>{post.date}</span>
              </div>
            </div>
          </div>

          {/* Decorative curve */}
          <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-20">
            <svg
              className="relative block w-full h-[40px] sm:h-[50px]"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 1200 120"
              preserveAspectRatio="none"
            >
              <path
                d="M600,112.77C268.63,112.77,0,65.52,0,7.23V120H1200V7.23C1200,65.52,931.37,112.77,600,112.77Z"
                className="fill-white"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-16 max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
            {/* Article */}
            <article className="lg:w-2/3">
              {/* Intro */}
              <p className="text-base sm:text-lg leading-relaxed text-[#444444] font-medium mb-8 sm:mb-10 border-l-4 border-[#f2c92f] pl-5">
                {post.content.intro}
              </p>

              {/* Sections */}
              <div className="space-y-8 sm:space-y-10">
                {post.content.sections.map((section, idx) => (
                  <div key={idx}>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#001d3d] mb-3 sm:mb-4 leading-snug">
                      {section.heading}
                    </h2>
                    <p className="text-[#555555] text-sm sm:text-base leading-relaxed mb-4">
                      {section.body}
                    </p>
                    {section.list && (
                      <ul className="space-y-2 mt-4">
                        {section.list.map((item, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm sm:text-base text-[#555555]">
                            <span className="mt-1.5 w-2 h-2 rounded-full bg-[#f2c92f] flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>

              {/* Closing */}
              <div className="mt-10 sm:mt-12 bg-[#f8f9fa] border-t-4 border-[#007cc3] p-6 sm:p-8">
                <p className="text-[#444444] text-sm sm:text-base leading-relaxed mb-5">
                  {post.content.closing}
                </p>
                <Link
                  href={post.serviceLink}
                  className="inline-flex items-center gap-2 text-[#007cc3] font-semibold text-sm sm:text-base hover:gap-3 transition-all"
                >
                  Ver serviço de {post.serviceName} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Back link */}
              <div className="mt-8">
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 text-[#666666] text-sm hover:text-[#007cc3] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar ao blog
                </Link>
              </div>
            </article>

            {/* Sidebar */}
            <aside className="lg:w-1/3 space-y-6">
              {/* CTA Card */}
              <div className="bg-[#001d3d] p-6 sm:p-8 text-center">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-3 leading-snug">
                  Precisa de {post.serviceName}?
                </h3>
                <p className="text-white/70 text-sm mb-6 leading-relaxed">
                  A Bioprev actua em Luanda, Benguela e Huambo com equipas especializadas e produtos certificados.
                </p>
                <Link
                  href="/contact"
                  className="inline-block w-full bg-[#f2c92f] text-[#001d3d] font-bold py-3 px-6 text-sm hover:bg-[#f2c92f]/90 transition-colors text-center"
                >
                  Solicitar orçamento
                </Link>
                <Link
                  href={post.serviceLink}
                  className="inline-block w-full mt-3 border border-white/30 text-white/80 font-medium py-3 px-6 text-sm hover:bg-white/10 transition-colors text-center"
                >
                  Saber mais sobre o serviço
                </Link>
              </div>

              {/* Related articles */}
              {related.length > 0 && (
                <div className="border border-gray-100 p-5 sm:p-6">
                  <h4 className="text-sm font-bold text-[#333333] uppercase tracking-wider mb-4 border-b border-gray-100 pb-3">
                    Artigos relacionados
                  </h4>
                  <div className="space-y-4">
                    {related.map((rel) => (
                      <Link key={rel.id} href={`/blog/${rel.id}`}>
                        <div className="flex gap-3 group cursor-pointer py-2">
                          <div
                            className="w-16 h-16 flex-shrink-0 bg-cover bg-center rounded-sm"
                            style={{ backgroundImage: `url(${imageMap[rel.image]})` }}
                          />
                          <div>
                            <p className="text-sm font-semibold text-[#333333] leading-snug group-hover:text-[#007cc3] transition-colors line-clamp-2">
                              {rel.title}
                            </p>
                            <span className="text-xs text-[#999] flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" /> {rel.readTime}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Services quick links */}
              <div className="bg-[#f8f9fa] p-5 sm:p-6">
                <h4 className="text-sm font-bold text-[#333333] uppercase tracking-wider mb-4">
                  Os nossos serviços
                </h4>
                <div className="space-y-2">
                  {[
                    { label: "Desinfestação Geral", href: "/services/disinfestation" },
                    { label: "Limpeza Profissional", href: "/services/cleaning" },
                    { label: "Recolha de Resíduos", href: "/services/waste" },
                    { label: "Jardinagem", href: "/services/gardening" },
                    { label: "Tratamento de Água", href: "/services/water" },
                  ].map((s) => (
                    <Link key={s.href} href={s.href}>
                      <div className="flex items-center justify-between py-2 border-b border-gray-200 text-sm text-[#555555] hover:text-[#007cc3] transition-colors cursor-pointer">
                        {s.label}
                        <ChevronRight className="w-4 h-4 text-[#007cc3]" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
