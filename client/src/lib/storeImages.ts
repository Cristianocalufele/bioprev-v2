import type { StoreProduct } from "@shared/store";
import storeHeroImg from "@/assets/images/store_hero_equipment_1795612259252.jpg";
import estacaoImg from "@/assets/images/product_estacao_monitorizacao_1795612260086.jpg";
import armadilhaImg from "@/assets/images/product_armadilha_monitorizacao_1795612259680.jpg";
import pulverizadorImg from "@/assets/images/product_pulverizador_manual_1795612261116.jpg";
import utensilioImg from "@/assets/images/product_utensilio_limpeza_1795612261651.jpg";
import luvasImg from "@/assets/images/product_luvas_protecao_1795612261099.jpg";
import oculosImg from "@/assets/images/product_oculos_protecao_1795612264528.jpg";

export const storeHeroImage = storeHeroImg;

const defaultProductImagesBySlug: Record<string, string> = {
  "estacao-monitorizacao": estacaoImg,
  "armadilha-monitorizacao": armadilhaImg,
  "pulverizador-manual": pulverizadorImg,
  "utensilio-limpeza": utensilioImg,
  "luvas-protecao": luvasImg,
  "oculos-protecao": oculosImg,
};

export function resolveProductImage(product: Pick<StoreProduct, "slug" | "imageUrl">): string | null {
  if (product.imageUrl) {
    return product.imageUrl;
  }
  return defaultProductImagesBySlug[product.slug] ?? null;
}
