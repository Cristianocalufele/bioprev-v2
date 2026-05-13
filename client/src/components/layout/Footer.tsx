import { Link } from "wouter";
import { Facebook, Instagram, Linkedin } from "lucide-react";
import logoImg from "@/assets/images/logo.png";
import certificateImage from "@assets/EIC - ISO 9001 - Qualidade_Empresa Certificada.jpg";

export default function Footer() {
  return (
    <footer className="bg-white border-t-4 border-[#f2c92f]">

      {/* Tagline banner */}
      <div className="bg-[#007cc3] py-3 px-4 text-center">
        <p className="text-white text-sm font-medium tracking-wide">
          Bioprev Angola — Especialistas nacionais em controle de pragas, higiene e ambiente.
        </p>
      </div>

      {/* Main footer body */}
      <div className="container mx-auto px-6 max-w-6xl py-10">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-10">

          {/* Left — Certificate */}
          <div className="flex-shrink-0 flex items-center justify-center md:justify-start">
            <img
              src={certificateImage}
              alt="Certificado EIC ISO 9001 da Bioprev"
              className="h-24 w-auto object-contain opacity-85"
              loading="lazy"
            />
          </div>

          {/* Center — Logo + Nav links */}
          <div className="flex flex-col items-center gap-5 text-center">
            <img src={logoImg} alt="Bioprev Logo" className="h-14 object-contain" loading="lazy" />
            <p className="text-[#444] text-sm max-w-xs leading-relaxed">
              Bioprev Serviços Integrados de Controle de Pragas e Higiene Lda.
            </p>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-[#666]">
              <Link href="/"><span className="hover:text-[#007cc3] cursor-pointer">Início</span></Link>
              <Link href="/services"><span className="hover:text-[#007cc3] cursor-pointer">Serviços</span></Link>
              <Link href="/about"><span className="hover:text-[#007cc3] cursor-pointer">Sobre</span></Link>
              <Link href="/blog"><span className="hover:text-[#007cc3] cursor-pointer">Blog</span></Link>
              <Link href="/locations"><span className="hover:text-[#007cc3] cursor-pointer">Locais</span></Link>
              <Link href="/contact"><span className="hover:text-[#007cc3] cursor-pointer">Contacto</span></Link>
              <Link href="/national-accounts"><span className="hover:text-[#007cc3] cursor-pointer">Contas nacionais</span></Link>
              <Link href="/reports"><span className="hover:text-[#007cc3] cursor-pointer">Relatórios</span></Link>
              <Link href="/about/careers"><span className="hover:text-[#007cc3] cursor-pointer">Carreiras</span></Link>
            </div>
          </div>

          {/* Right — Social icons */}
          <div className="flex-shrink-0 flex flex-col items-center md:items-end gap-4">
            <div className="flex gap-4">
              <a
                href="https://www.facebook.com/bioprevcontrolodepragas"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-11 h-11 rounded-full border border-gray-300 flex items-center justify-center text-[#666] hover:border-[#007cc3] hover:text-[#007cc3] transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://www.instagram.com/bioprev_angola/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-11 h-11 rounded-full border border-gray-300 flex items-center justify-center text-[#666] hover:border-[#007cc3] hover:text-[#007cc3] transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://www.linkedin.com/company/bioprev-pres/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-11 h-11 rounded-full border border-gray-300 flex items-center justify-center text-[#666] hover:border-[#007cc3] hover:text-[#007cc3] transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
            <div className="text-xs text-[#999] text-center md:text-right leading-relaxed">
              <a href="#" className="hover:text-[#007cc3]">Declaração legal</a>
              {" · "}
              <a href="#" className="hover:text-[#007cc3]">Privacidade</a>
            </div>
          </div>

        </div>
      </div>

      {/* Copyright bar */}
      <div className="border-t border-gray-100 py-4 text-center">
        <p className="text-xs text-[#999]">
          © {new Date().getFullYear()} Bioprev Angola. Todos os direitos reservados.
        </p>
      </div>

    </footer>
  );
}
