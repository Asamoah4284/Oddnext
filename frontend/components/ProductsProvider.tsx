"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_SLIP_PRODUCTS,
  DEFAULT_VIP_PRODUCT,
  type ProductId,
  type ProductItem,
  type SlipProductId,
} from "@/lib/products";
import { apiFetch } from "@/lib/api";

export type SlipProductItem = ProductItem & { id: SlipProductId };

interface ProductsContextValue {
  products: ProductItem[];
  slipProducts: SlipProductItem[];
  vipProduct: ProductItem;
  getProduct: (id: string) => ProductItem | undefined;
  refreshProducts: () => Promise<void>;
  setProductList: (products: ProductItem[]) => void;
  loading: boolean;
}

const defaultProducts: ProductItem[] = [
  ...DEFAULT_SLIP_PRODUCTS.map((p) => ({
    id: p.id,
    label: p.label,
    priceGhs: p.priceGhs,
    priceNgn: p.priceNgn,
  })),
  {
    id: DEFAULT_VIP_PRODUCT.id,
    label: DEFAULT_VIP_PRODUCT.label,
    priceGhs: DEFAULT_VIP_PRODUCT.priceGhs,
    priceNgn: DEFAULT_VIP_PRODUCT.priceNgn,
  },
];

const ProductsContext = createContext<ProductsContextValue>({
  products: defaultProducts,
  slipProducts: defaultProducts.filter((p): p is SlipProductItem => p.id !== "vip"),
  vipProduct: defaultProducts.find((p) => p.id === "vip")!,
  getProduct: (id: string) => defaultProducts.find((p) => p.id === id),
  refreshProducts: async () => {},
  setProductList: () => {},
  loading: false,
});

export function ProductsProvider({
  children,
  initialProducts,
}: {
  children: React.ReactNode;
  initialProducts?: ProductItem[];
}) {
  const [products, setProducts] = useState<ProductItem[]>(() => {
    if (initialProducts && initialProducts.length > 0) {
      return initialProducts;
    }
    return defaultProducts;
  });
  const [loading, setLoading] = useState(false);

  const refreshProducts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<{ products: ProductItem[] }>("/api/products", {
        cache: "no-store",
      });
      if (Array.isArray(data.products) && data.products.length > 0) {
        setProducts(data.products);
      }
    } catch (err) {
      // Keep existing or default products on error
      console.warn("Could not fetch latest products, using fallback:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProducts();
  }, [refreshProducts]);

  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      setProducts(initialProducts);
    }
  }, [initialProducts]);

  const slipProducts = useMemo(
    () => products.filter((p): p is SlipProductItem => p.id !== "vip"),
    [products]
  );

  const vipProduct = useMemo(
    () => products.find((p) => p.id === "vip") ?? defaultProducts.find((p) => p.id === "vip")!,
    [products]
  );

  const getProductById = useCallback(
    (id: string) => products.find((p) => p.id === id) ?? defaultProducts.find((p) => p.id === id),
    [products]
  );

  return (
    <ProductsContext.Provider
      value={{
        products,
        slipProducts,
        vipProduct,
        getProduct: getProductById,
        refreshProducts,
        setProductList: setProducts,
        loading,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  return useContext(ProductsContext);
}
