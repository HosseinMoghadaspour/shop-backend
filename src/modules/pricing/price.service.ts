import {
  findBranchPrice,
  findBranchPrices,
  findMainBranch,
  findSalePrice,
  findSalePrices,
  type BranchPriceRecord,
  type SalePriceRecord,
} from "./price.repository.js";
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

function buildPricing(
  base:{
  RowID: number;
  SalePrice: number;
  DiscountPrice: number | null;
  ConsumerPrice: number | null;
},
  branch: BranchPriceRecord | null,
  saleType: SalePriceRecord | null,
): ProductPricing {
  let salePrice = base.SalePrice;
  let consumerPrice = base.ConsumerPrice;

  if (branch?.salePrice != null && branch.salePrice > 0) {
    salePrice = branch.salePrice;
  }
  if (branch?.consumerPrice != null) {
    consumerPrice = branch.consumerPrice;
  }

  // Explicit price type has higher priority than the branch price.
  if (saleType?.salePrice != null && saleType.salePrice > 0) {
    salePrice = saleType.salePrice;
  }
  if (saleType?.consumerPrice != null) {
    consumerPrice = saleType.consumerPrice;
  }

  const discountPrice = normalizeDiscount(salePrice, base.DiscountPrice);
  const finalPrice = discountPrice ?? salePrice;
  const hasDiscount = discountPrice != null;
  const discountPercent = hasDiscount
    ? Number((((salePrice - finalPrice) / salePrice) * 100).toFixed(2))
    : null;

  return {
    salePrice,
    consumerPrice,
    discountPrice,
    finalPrice,
    hasDiscount,
    discountPercent,
    branchId: branch?.branchId ?? saleType?.branchId ?? null,
    priceType: saleType
      ? {
          id: saleType.salePriceTypeId,
          name: saleType.salePriceTypeName,
          salePrice: saleType.salePrice,
          consumerPrice: saleType.consumerPrice,
        }
      : null,
  };
}

export async function resolveProductPricing(
  product: {
    RowID: number;
    SalePrice: number;
    DiscountPrice: number | null;
    ConsumerPrice: number | null;
  },
  options: { branchId?: number; salePriceTypeId?: number } = {},
): Promise<ProductPricing> {
  const branchId = options.branchId ?? (await findMainBranch())?.id;
  const [branch, saleType] = await Promise.all([
    branchId == null ? Promise.resolve(null) : findBranchPrice(product.RowID, branchId),
    options.salePriceTypeId == null
      ? Promise.resolve(null)
      : findSalePrice(product.RowID, options.salePriceTypeId),
  ]);

  return buildPricing(product, branch, saleType);
}

export async function resolveProductsPricing(
  products: Array<{
    RowID: number;
    SalePrice: number;
    DiscountPrice: number | null;
    ConsumerPrice: number | null;
  }>,
  options: { branchId?: number; salePriceTypeId?: number } = {},
): Promise<Map<number, ProductPricing>> {
  const result = new Map<number, ProductPricing>();
  if (products.length === 0) return result;

  const branchId = options.branchId ?? (await findMainBranch())?.id;
  const [branches, saleTypes] = await Promise.all([
    branchId == null
      ? Promise.resolve<BranchPriceRecord[]>([])
      : findBranchPrices(products.map((p) => p.RowID), branchId),
    options.salePriceTypeId == null
      ? Promise.resolve<SalePriceRecord[]>([])
      : findSalePrices(products.map((p) => p.RowID), options.salePriceTypeId),
  ]);

  const branchMap = new Map(branches.map((item) => [item.goodId, item]));
  const saleTypeMap = new Map(saleTypes.map((item) => [item.goodId, item]));

  for (const product of products) {
    result.set(
      product.RowID,
      buildPricing(product, branchMap.get(product.RowID) ?? null, saleTypeMap.get(product.RowID) ?? null),
    );
  }

  return result;
}
