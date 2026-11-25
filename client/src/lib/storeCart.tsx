import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { StoreProduct } from "@shared/store";

export type CartItemEntry = {
  productId: string;
  quantity: number;
  productSnapshot: Pick<
    StoreProduct,
    "id" | "name" | "slug" | "sku" | "categoryName" | "categorySlug" | "priceAoa" | "unitLabel" | "imageUrl" | "stockStatus"
  >;
};

type StoreCartContextValue = {
  items: CartItemEntry[];
  totalItems: number;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  addItem: (product: StoreProduct, quantity?: number, openAfter?: boolean) => void;
  setItemQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const STORAGE_KEY = "bioprev_store_cart_v1";

const StoreCartContext = createContext<StoreCartContextValue | null>(null);

function readInitialCart(): CartItemEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is CartItemEntry =>
        Boolean(
          entry &&
            typeof entry.productId === "string" &&
            typeof entry.quantity === "number" &&
            entry.quantity >= 1 &&
            entry.productSnapshot &&
            typeof entry.productSnapshot.name === "string",
        ),
    );
  } catch {
    return [];
  }
}

export function StoreCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItemEntry[]>(readInitialCart);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage quota errors
    }
  }, [items]);

  const addItem = (product: StoreProduct, quantity = 1, openAfter = true) => {
    const safeQty = Math.max(1, Math.min(10000, Math.trunc(quantity) || 1));
    const snapshot: CartItemEntry["productSnapshot"] = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      categoryName: product.categoryName,
      categorySlug: product.categorySlug,
      priceAoa: product.priceAoa,
      unitLabel: product.unitLabel,
      imageUrl: product.imageUrl,
      stockStatus: product.stockStatus,
    };

    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: Math.min(10000, item.quantity + safeQty), productSnapshot: snapshot }
            : item,
        );
      }
      return [...current, { productId: product.id, quantity: safeQty, productSnapshot: snapshot }];
    });

    if (openAfter) setDrawerOpen(true);
  };

  const setItemQuantity = (productId: string, quantity: number) => {
    const safeQty = Math.max(1, Math.min(10000, Math.trunc(quantity) || 1));
    setItems((current) =>
      current.map((item) => (item.productId === productId ? { ...item, quantity: safeQty } : item)),
    );
  };

  const removeItem = (productId: string) => {
    setItems((current) => current.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const value = useMemo<StoreCartContextValue>(
    () => ({
      items,
      totalItems,
      drawerOpen,
      setDrawerOpen,
      addItem,
      setItemQuantity,
      removeItem,
      clearCart,
    }),
    [drawerOpen, items, totalItems],
  );

  return <StoreCartContext.Provider value={value}>{children}</StoreCartContext.Provider>;
}

export function useStoreCart() {
  const ctx = useContext(StoreCartContext);
  if (!ctx) {
    throw new Error("useStoreCart must be used within StoreCartProvider");
  }
  return ctx;
}
