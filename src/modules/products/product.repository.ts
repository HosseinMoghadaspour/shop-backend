import { prisma } from "../../lib/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import type { Product } from "./product.types.js";
import { findProductImages } from "./product-image.repository.js";
import { resolveProductsPricing, resolveProductPricing } from "../pricing/price.service.js";

export interface ProductFilters {
  search?: string;
  categoryId?: number;
  brandId?: number;
  producerId?: number;
  minPrice?: number;
  maxPrice?: number;
  isSpecialSale?: boolean;
  amazingSale?: boolean;
  branchId?: number;
  salePriceTypeId?: number;
  page: number;
  limit: number;
}

const productSelect = {
  RowID: true,
  GoodCategory_ID: true,
  RowCode: true,
  RowName: true,
  RowNameEN: true,
  RowNameAlias: true,
  SalePrice: true,
  DiscountPrice: true,
  ConsumerPrice: true,
  IsActive: true,
  RowDesc: true,
  FirstStock: true,
  OrderPoint: true,
  IsHasSize: true,
  Producers_ID: true,
  BrandID: true,
  IsShowInOnlineShop: true,
  BriefDescription: true,
  FullDescription: true,
  IsSpecialSale: true,
  AmazingSale: true,
  MinOrderSite: true,
  MaxOrderSite: true,
  MinSiteShow: true,
  width: true,
  height: true,
  Length: true,
  Weight: true,
  ShowInCofferMenu: true,
  InsertServerDateTime: true,
  UpdateServerDateTime: true,
  MDate: true,
} as const;

type ProductRow = Prisma.GoodGetPayload<{ select: typeof productSelect }>;

type PublicProductBase = Omit<Product, "images" | "pricing">;

function decimalToNumber(value: unknown): number | null {
  if (value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function mapProduct(product: ProductRow): PublicProductBase {
  return {
    id: product.RowID,
    code: product.RowCode,
    name: product.RowName,
    nameEn: product.RowNameEN,
    alias: product.RowNameAlias,
    categoryId: product.GoodCategory_ID,
    brandId: product.BrandID,
    producerId: product.Producers_ID == null ? null : Number(product.Producers_ID),
    salePrice: Number(product.SalePrice),
    discountPrice: decimalToNumber(product.DiscountPrice),
    consumerPrice: decimalToNumber(product.ConsumerPrice),
    isActive: product.IsActive,
    isShowInOnlineShop: product.IsShowInOnlineShop ?? false,
    briefDescription: product.BriefDescription,
    fullDescription: product.FullDescription,
    description: product.RowDesc,
    isSpecialSale: product.IsSpecialSale ?? false,
    amazingSale: product.AmazingSale ?? false,
    minOrder: decimalToNumber(product.MinOrderSite),
    maxOrder: decimalToNumber(product.MaxOrderSite),
    minShow: decimalToNumber(product.MinSiteShow),
    stock: Number(product.FirstStock ?? 0),
    orderPoint: product.OrderPoint == null ? null : Number(product.OrderPoint),
    isHasSize: product.IsHasSize ?? false,
    width: product.width == null ? null : Number(product.width),
    height: product.height == null ? null : Number(product.height),
    length: product.Length == null ? null : Number(product.Length),
    weight: product.Weight == null ? null : Number(product.Weight),
    showInCofferMenu: product.ShowInCofferMenu ?? false,
    createdAt: product.InsertServerDateTime,
    updatedAt: product.UpdateServerDateTime,
  };
}

function buildProductWhere(filters: ProductFilters): Prisma.GoodWhereInput {
  return {
    IsActive: true,
    IsShowInOnlineShop: true,
    ...(filters.search
      ? {
          OR: [
            { RowName: { contains: filters.search } },
            { RowCode: { contains: filters.search } },
            { RowNameAlias: { contains: filters.search } },
            { SiteName: { contains: filters.search } },
          ],
        }
      : {}),
    ...(filters.categoryId !== undefined ? { GoodCategory_ID: filters.categoryId } : {}),
    ...(filters.brandId !== undefined ? { BrandID: filters.brandId } : {}),
    ...(filters.producerId !== undefined ? { Producers_ID: BigInt(filters.producerId) } : {}),
    ...(filters.isSpecialSale !== undefined ? { IsSpecialSale: filters.isSpecialSale } : {}),
    ...(filters.amazingSale !== undefined ? { AmazingSale: filters.amazingSale } : {}),
  };
}

function priceMatches(price: number, filters: ProductFilters) {
  if (filters.minPrice !== undefined && price < filters.minPrice) return false;
  if (filters.maxPrice !== undefined && price > filters.maxPrice) return false;
  return true;
}

async function loadProducts(where: Prisma.GoodWhereInput, filters: ProductFilters) {
  const skip = (filters.page - 1) * filters.limit;
  const pricingOptions: Pick<ProductFilters, "branchId" | "salePriceTypeId"> = filters;
  const needsPriceFiltering = filters.minPrice !== undefined || filters.maxPrice !== undefined;

  if (!needsPriceFiltering) {
    const [items, total] = await Promise.all([
      prisma.good.findMany({
        where,
        select: productSelect,
        orderBy: { RowID: "desc" },
        skip,
        take: filters.limit,
      }),
      prisma.good.count({ where }),
    ]);
    const pricing = await resolveProductsPricing(items, pricingOptions);
    return { items, total, pricing };
  }

  // Resolve prices before pagination so min/max filters use the actual final store price.
  // This path is intentionally separate because Prisma cannot express the computed price
  // (branch override + discount) in a normal findMany where clause.
  const candidates = await prisma.good.findMany({
    where,
    select: productSelect,
    orderBy: { RowID: "desc" },
  });
  const pricing = await resolveProductsPricing(candidates, pricingOptions);
  const filtered = candidates.filter((item) =>
    priceMatches(pricing.get(item.RowID)!.finalPrice, filters),
  );

  return {
    items: filtered.slice(skip, skip + filters.limit),
    total: filtered.length,
    pricing,
  };
}

export async function findProducts(filters: ProductFilters) {
  const where = buildProductWhere(filters);
  const result = await loadProducts(where, filters);

  return {
    items: result.items.map((item) => ({
      ...mapProduct(item),
      pricing: result.pricing.get(item.RowID)!,
      images: [],
    })),
    total: result.total,
  } satisfies { items: Product[]; total: number };
}

export async function findProductById(
  id: number,
  options: Pick<ProductFilters, "branchId" | "salePriceTypeId"> = {},
): Promise<Product | null> {
  const product = await prisma.good.findFirst({
    where: { RowID: id, IsActive: true, IsShowInOnlineShop: true },
    select: productSelect,
  });
  if (!product) return null;

  const [images, pricing] = await Promise.all([
    findProductImages(id),
    resolveProductPricing(product, options),
  ]);

  return { ...mapProduct(product), pricing, images };
}

export async function findProductByCode(
  code: string,
  options: Pick<ProductFilters, "branchId" | "salePriceTypeId"> = {},
): Promise<Product | null> {
  const product = await prisma.good.findFirst({
    where: { RowCode: code, IsActive: true, IsShowInOnlineShop: true },
    select: productSelect,
  });
  if (!product) return null;

  const [images, pricing] = await Promise.all([
    findProductImages(product.RowID),
    resolveProductPricing(product, options),
  ]);

  return { ...mapProduct(product), pricing, images };
}

export async function getAmazingProducts(limit = 12, options: Pick<ProductFilters, "branchId" | "salePriceTypeId"> = {}) {
  const products = await prisma.good.findMany({
    where: { IsActive: true, IsShowInOnlineShop: true, AmazingSale: true },
    select: productSelect,
    orderBy: { RowID: "desc" },
    take: limit,
  });
  const pricing = await resolveProductsPricing(products, options);
  return products.map((product) => ({ ...mapProduct(product), pricing: pricing.get(product.RowID)!, images: [] }));
}

export async function getNewProducts(limit = 12, options: Pick<ProductFilters, "branchId" | "salePriceTypeId"> = {}) {
  const products = await prisma.good.findMany({
    where: { IsActive: true, IsShowInOnlineShop: true, MDate: { not: null } },
    select: productSelect,
    orderBy: [{ MDate: "desc" }, { RowID: "desc" }],
    take: limit,
  });
  const pricing = await resolveProductsPricing(products, options);
  return products.map((product) => ({ ...mapProduct(product), pricing: pricing.get(product.RowID)!, images: [] }));
}
