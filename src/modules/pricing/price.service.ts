import type { ProductPricing } from "./price.types.js";

function normalizeDiscount(salePrice: number, discountPrice: number | null) {
  if (
    discountPrice == null ||
    !Number.isFinite(discountPrice) ||
    discountPrice <= 0 ||
    discountPrice >= salePrice
  ) {
    return null;
  }
  return discountPrice;
}

/**
 * Storefront catalog pricing is global. Branch selection affects availability
 * only; branch-specific ERP price rows are intentionally not applied here.
 */
function buildGlobalPricing(base: {
  RowID: number;
  SalePrice: number;
  DiscountPrice: number | null;
  ConsumerPrice: number | null;
}): ProductPricing {
  const salePrice = Number(base.SalePrice ?? 0);
  const consumerPrice = Number(base.ConsumerPrice ?? 0);
  const discountPrice = normalizeDiscount(
    salePrice,
    base.DiscountPrice == null ? null : Number(base.DiscountPrice),
  );
  const finalPrice = discountPrice ?? salePrice;
  const hasDiscount = discountPrice !== null;

  return {
    salePrice,
    consumerPrice,
    discountPrice,
    finalPrice,
    hasDiscount,
    discountPercent: hasDiscount
      ? Number((((salePrice - finalPrice) / salePrice) * 100).toFixed(2))
      : null,
    branchId: null,
    priceType: null,
  };
}

export async function resolveProductPricing(product: {
  RowID: number;
  SalePrice: number;
  DiscountPrice: number | null;
  ConsumerPrice: number | null;
}, _options: { branchId?: number; salePriceTypeId?: number } = {}): Promise<ProductPricing> {
  return buildGlobalPricing(product);
}

export async function resolveProductsPricing(
  products: Array<{
    RowID: number;
    SalePrice: number;
    DiscountPrice: number | null;
    ConsumerPrice: number | null;
  }>,
  _options: { branchId?: number; salePriceTypeId?: number } = {},
): Promise<Map<number, ProductPricing>> {
  return new Map(products.map((product) => [
    product.RowID,
    buildGlobalPricing(product),
  ]));
}
