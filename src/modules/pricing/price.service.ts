import type { ProductPricing } from "./price.types.js";
import { findBranchPrices } from "./price.repository.js";

type ProductPriceBase = {
  RowID: number;
  SalePrice: number;
  DiscountPrice: number | null;
  ConsumerPrice: number | null;
};

type PricingOptions = {
  branchId?: number;
  /** Retained for API compatibility; storefront pricing does not use price-type IDs. */
  salePriceTypeId?: number;
};

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

function buildPricing(
  base: ProductPriceBase,
  values: {
    salePrice: number;
    consumerPrice: number | null;
    branchId: number | null;
  },
): ProductPricing {
  const salePrice = values.salePrice;
  const consumerPrice = values.consumerPrice;
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
    branchId: values.branchId,
    priceType: null,
  };
}

/**
 * Storefront products are selected by branchId.
 * A branch-specific GoodBranchPrice overrides the regular Good price when
 * a valid branch price exists. Otherwise the product's own SalePrice is used.
 * This deliberately has no dependency on SalePriceType or SiteBranchConfig.SalePriceType_ID.
 */
export async function resolveProductsPricing(
  products: ProductPriceBase[],
  options: PricingOptions = {},
): Promise<Map<number, ProductPricing>> {
  if (products.length === 0) return new Map();

  const branchId =
    options.branchId != null && Number.isSafeInteger(options.branchId) && options.branchId > 0
      ? options.branchId
      : null;

  const branchPrices = branchId == null
    ? []
    : await findBranchPrices(
        products.map((product) => product.RowID),
        branchId,
      );
  const branchPricesByGoodId = new Map(
    branchPrices.map((row) => [row.goodId, row]),
  );

  const result = new Map<number, ProductPricing>();
  for (const product of products) {
    const branchPrice = branchPricesByGoodId.get(product.RowID);
    const branchSalePrice =
      branchPrice?.salePrice != null &&
      Number.isFinite(branchPrice.salePrice) &&
      branchPrice.salePrice > 0
        ? branchPrice.salePrice
        : null;

    const salePrice = branchSalePrice ?? Number(product.SalePrice ?? 0);
    const consumerPrice =
      branchPrice?.consumerPrice != null &&
      Number.isFinite(branchPrice.consumerPrice)
        ? branchPrice.consumerPrice
        : product.ConsumerPrice == null
          ? null
          : Number(product.ConsumerPrice);

    result.set(
      product.RowID,
      buildPricing(product, {
        salePrice,
        consumerPrice,
        branchId,
      }),
    );
  }

  return result;
}

export async function resolveProductPricing(
  product: ProductPriceBase,
  options: PricingOptions = {},
): Promise<ProductPricing> {
  const pricing = await resolveProductsPricing([product], options);
  return pricing.get(product.RowID)!;
}
