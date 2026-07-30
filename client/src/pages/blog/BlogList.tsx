import { Link } from "wouter";
import { ArrowRight, ChevronRight, Mail, CheckCircle2, Loader2, Clock } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEOHead, { breadcrumbSchema } from "@/components/SEOHead";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { blogPosts } from "@/data/blogData";

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

type BlogPageVariant = "all" | "news" | "tips";

function BlogListPage({ variant = "all" }: { variant?: BlogPageVariant }) {
  const [email, setEmail] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const newsletterMutation = useMutation({
    mutationFn: async (emailValue: string) => {
      const res = await apiRequest("POST", "/api/newsletter", { email: emailValue });
      return res.json();
    },
    onSuccess: (data) => {
      setSuccessMessage(data.message);
      setEmail("");
    },
  });

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSuccessMessage("");
    newsletterMutation.mutate(email.trim());
  };

  const pageTitle =
    variant === "news" ? "Últimas notícias" : variant === "tips" ? "Dicas de prevenção" : "Blog";
  const pageDescription =
    variant === "news"
      ? "Últimas notícias da Bioprev Angola — novidades, inovação e actualidades sobre controle de pragas, higiene e serviços profissionais."
      : variant === "tips"
      ? "Dicas de prevenção da Bioprev Angola — orientações práticas para evitar pragas, proteger espaços e manter ambientes seguros."
      : "Blog Bioprev Angola — artigos, notícias e dicas sobre controle de pragas, limpeza profissional, gestão de resíduos e jardinagem em Angola.";
  const canonical =
    variant === "news" ? "/blog/ultimas-noticias" : variant === "tips" ? "/blog/dicas-prevencao" : "/blog";
  const visiblePosts =
    variant === "all" ? blogPosts : blogPosts.filter((post) => post.category === variant);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <SEOHead
        title={pageTitle}
        description={pageDescription}
        canonical={canonical}
        keywords="blog controle pragas Angola, artigos desinfestação, dicas pragas, limpeza profissional Angola, notícias Bioprev"
        type="blog"
        structuredData={breadcrumbSchema([
          { name: "Início", url: "/" },
          { name: "Blog", url: "/blog" },
          ...(variant === "all" ? [] : [{ name: pageTitle, url: canonical }]),
        ])}
      />
      <Header />

      <main className="flex-grow">
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 py-4 flex items-center text-sm text-[#0077c0] font-bold">
          <Link href="/" className="hover:underline">Início</Link>
          <ChevronRight className="w-4 h-4 mx-1 text-gray-500" />
          <span className="text-gray-600 font-normal">Blog</span>
          {variant !== "all" && (
            <>
              <ChevronRight className="w-4 h-4 mx-1 text-gray-500" />
              <span className="text-gray-600 font-normal">{pageTitle}</span>
            </>
          )}
        </div>

        {/* Main Title */}
        <div className="container mx-auto px-4 pt-4 pb-16 max-w-6xl">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#f2c92f] text-center mb-4 tracking-tight">
            {pageTitle}
          </h1>
          <p className="text-center text-[#666666] text-sm sm:text-base max-w-2xl mx-auto mb-10 sm:mb-14">
            {variant === "all"
              ? "Artigos, dicas e actualidades sobre os serviços e temas da Bioprev Angola."
              : pageDescription}
          </p>

          {/* Featured post (first) */}
          {visiblePosts.length > 0 && (
            <Link href={`/blog/${visiblePosts[0].id}`}>
              <div className="group relative overflow-hidden rounded-sm cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 h-[340px] sm:h-[400px] border-t-4 border-[#f2c92f] bg-gray-900 mb-6 sm:mb-8">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-50"
                  style={{ backgroundImage: `url(${imageMap[visiblePosts[0].image]})` }}
                />
                <div className="relative h-full p-6 sm:p-10 flex flex-col justify-end z-10">
                  <span className="inline-block bg-[#f2c92f] text-[#001d3d] text-xs font-bold uppercase tracking-wider px-3 py-1 mb-3 self-start">
                    {visiblePosts[0].categoryLabel}
                  </span>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
                    {visiblePosts[0].title}
                  </h2>
                  <p className="text-white/80 text-sm sm:text-base leading-relaxed mb-5 max-w-2xl line-clamp-2">
                    {visiblePosts[0].description}
                  </p>
                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center gap-1.5 text-white/60 text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      {visiblePosts[0].readTime} de leitura
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-white font-semibold text-sm group-hover:gap-3 transition-all">
                      Ler artigo <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Remaining posts grid */}
          {visiblePosts.length > 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
              {visiblePosts.slice(1).map((post) => (
                <Link key={post.id} href={`/blog/${post.id}`}>
                  <div className="group flex flex-col h-full overflow-hidden rounded-sm border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer bg-white">
                    {/* Image */}
                    <div className="relative h-[180px] overflow-hidden bg-gray-900">
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105 opacity-80"
                        style={{ backgroundImage: `url(${imageMap[post.image]})` }}
                      />
                      <div className="absolute top-3 left-3">
                        <span className="inline-block bg-[#f2c92f] text-[#001d3d] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
                          {post.categoryLabel}
                        </span>
                      </div>
                    </div>
                    {/* Content */}
                    <div className="flex flex-col flex-grow p-5 border-t-4 border-[#f2c92f]">
                      <h3 className="text-base sm:text-[17px] font-bold text-[#333333] mb-2 leading-snug group-hover:text-[#007cc3] transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-[#666666] text-sm leading-relaxed line-clamp-3 flex-grow mb-4">
                        {post.description}
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="flex items-center gap-1.5 text-[#999] text-xs">
                          <Clock className="w-3.5 h-3.5" />
                          {post.readTime}
                        </span>
                        <span className="flex items-center gap-1 text-[#007cc3] text-sm font-semibold group-hover:gap-2 transition-all">
                          Ler <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {visiblePosts.length === 0 && (
            <p className="text-center text-[#666666] py-16">Nenhum artigo encontrado nesta categoria.</p>
          )}
        </div>

        {/* Newsletter */}
        <section className="py-14 sm:py-18 md:py-24 bg-[#001d3d]">
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl text-center">
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-full bg-[#f2c92f]/20 flex items-center justify-center">
                <Mail className="w-7 h-7 text-[#f2c92f]" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-[36px] font-medium text-white mb-4 leading-tight">
              Subscreva a nossa newsletter
            </h2>
            <p className="text-white/70 text-sm sm:text-base mb-8 sm:mb-10 leading-relaxed max-w-xl mx-auto">
              Receba os nossos artigos, dicas e novidades sobre controle de pragas, limpeza e serviços ambientais directamente no seu email.
            </p>

            {successMessage ? (
              <div
                className="flex items-center justify-center gap-3 bg-green-500/20 border border-green-500/30 rounded-sm px-6 py-4 max-w-md mx-auto"
                data-testid="text-newsletter-success"
              >
                <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                <p className="text-green-300 text-sm sm:text-base">{successMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Insira o seu email"
                  required
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm sm:text-base focus:outline-none focus:border-[#f2c92f] transition-colors"
                  data-testid="input-newsletter-email"
                />
                <button
                  type="submit"
                  disabled={newsletterMutation.isPending}
                  className="px-6 sm:px-8 py-3 bg-[#f2c92f] text-[#001d3d] font-bold text-sm sm:text-base hover:bg-[#f2c92f]/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shrink-0"
                  data-testid="button-newsletter-submit"
                >
                  {newsletterMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      A subscrever...
                    </>
                  ) : (
                    "Subscrever"
                  )}
                </button>
              </form>
            )}

            {newsletterMutation.isError && (
              <p className="text-red-400 text-sm mt-4" data-testid="text-newsletter-error">
                {(newsletterMutation.error as any)?.message || "Erro ao processar. Tente novamente."}
              </p>
            )}

            <p className="text-white/40 text-xs mt-6">
              Ao subscrever, concorda em receber comunicações da Bioprev. Pode cancelar a qualquer momento.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default function BlogList() {
  return <BlogListPage />;
}

export function BlogLatestNews() {
  return <BlogListPage variant="news" />;
}

export function BlogPreventionTips() {
  return <BlogListPage variant="tips" />;
}
