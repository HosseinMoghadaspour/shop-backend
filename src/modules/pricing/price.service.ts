import type { ProductPricing } from "./price.types.js";
import {
  findBranchSalePriceType,
  findMainBranch,
  findSalePrices,
} from "./price.repository.js";

type ProductPriceBase = {
  RowID: number;
  SalePrice: number;
  DiscountPrice: number | null;
  ConsumerPrice: number | null;
};

type PricingOptions = {
  branchId?: number;
  /** Kept for API compatibility. The authoritative value is always read from SiteBranchConfig. */
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
    priceType: ProductPricing["priceType"];
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
    priceType: values.priceType,
  };
}

function buildGlobalPricing(base: ProductPriceBase): ProductPricing {
  return buildPricing(base, {
    salePrice: Number(base.SalePrice ?? 0),
    consumerPrice: base.ConsumerPrice == null ? null : Number(base.ConsumerPrice),
    branchId: null,
    priceType: null,
  });
}

/**
 * Resolve storefront prices from the sale-price type configured for the selected
 * branch. The client-provided salePriceTypeId is deliberately not trusted.
 */
export async function resolveProductsPricing(
  products: ProductPriceBase[],
  options: PricingOptions = {},
): Promise<Map<number, ProductPricing>> {
  if (products.length === 0) return new Map();

  let branchId = options.branchId;
  if (branchId == null) {
    branchId = (await findMainBranch())?.id;
  }

  // Legacy fallback is retained only when no online-store branch is configured.
  if (branchId == null) {
    return new Map(products.map((product) => [
      product.RowID,
      buildGlobalPricing(product),
    ]));
  }

  const salePriceTypeId = await findBranchSalePriceType(branchId);
  if (salePriceTypeId == null) {
    throw new Error(
      `نوع قیمت فروش برای شعبه ${branchId} در تنظیمات فروشگاه تعریف نشده است.`,
    );
  }

  const rows = await findSalePrices(
    products.map((product) => product.RowID),
    salePriceTypeId,
  );
  const pricesByGoodId = new Map(rows.map((row) => [row.goodId, row]));

  const result = new Map<number, ProductPricing>();
  for (const product of products) {
    const row = pricesByGoodId.get(product.RowID);
    if (!row || row.salePrice == null || !Number.isFinite(row.salePrice)) {
      throw new Error(
        `قیمت کالا با شناسه ${product.RowID} برای نوع قیمت شعبه انتخاب‌شده تعریف نشده است.`,
      );
    }

    if (row.branchId != null && row.branchId !== branchId) {
      throw new Error(
        `نوع قیمت کالا ${product.RowID} متعلق به شعبه انتخاب‌شده نیست.`,
      );
    }

    result.set(product.RowID, buildPricing(product, {
      salePrice: Number(row.salePrice),
      consumerPrice: row.consumerPrice == null
        ? (product.ConsumerPrice == null ? null : Number(product.ConsumerPrice))
        : Number(row.consumerPrice),
      branchId,
      priceType: {
        id: row.salePriceTypeId,
        name: row.salePriceTypeName,
        salePrice: Number(row.salePrice),
        consumerPrice: row.consumerPrice == null ? null : Number(row.consumerPrice),
      },
    }));
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
