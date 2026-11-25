import { useEffect, useState } from "react";
import { Brush, ClipboardList, Hand, Shield, SprayCan, Target, type LucideIcon } from "lucide-react";
import type { StoreProduct } from "@shared/store";
import { resolveProductImage } from "@/lib/storeImages";

function productIcon(product: Pick<StoreProduct, "categorySlug" | "slug">): LucideIcon {
  const category = product.categorySlug.toLocaleLowerCase("pt");
  if (category.includes("limpeza")) return product.slug.includes("pulverizador") ? SprayCan : Brush;
  if (category.includes("protec") || category.includes("prote")) return product.slug.includes("luvas") ? Hand : Shield;
  return product.slug.includes("armadilha") ? ClipboardList : Target;
}

export function ProductVisual({
  product,
  alt,
  overrideSrc,
  className = "h-full w-full object-cover",
}: {
  product: Pick<StoreProduct, "slug" | "imageUrl" | "categorySlug" | "name" | "categoryName">;
  alt: string;
  overrideSrc?: string | null;
  className?: string;
}) {
  const src = overrideSrc ?? resolveProductImage(product);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const Icon = productIcon(product);

  useEffect(() => {
    setFailedSrc(null);
  }, [src]);

  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(src)}
        className={className}
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2.5 bg-gradient-to-br from-[#f4f7f9] to-[#e6eff5] p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center border border-[#d2e2ec] bg-white text-[#007cc3]">
        <Icon className="h-6 w-6" strokeWidth={1.4} aria-hidden="true" />
      </div>
      <span className="text-xs font-medium text-[#5d6d77]">{product.categoryName}</span>
    </div>
  );
}
