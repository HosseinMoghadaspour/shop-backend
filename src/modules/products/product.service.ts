import {
  findProductByCode,
  findProductById,
  findProducts,
  getAmazingProducts as findAmazingProducts,
  getNewProducts as findNewProducts,
  type ProductFilters,
} from "./product.repository.js";

export async function getProducts(filters: ProductFilters) {
  const result = await findProducts(filters);
  return {
    items: result.items,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / filters.limit),
    },
  };
}

export function getProductById(id: number, options: Pick<ProductFilters, "branchId" | "salePriceTypeId"> = {}) {
  return findProductById(id, options);
}

export function getProductByCode(code: string, options: Pick<ProductFilters, "branchId" | "salePriceTypeId"> = {}) {
  return findProductByCode(code, options);
}

export function getAmazingProducts(limit = 12, options: Pick<ProductFilters, "branchId" | "salePriceTypeId"> = {}) {
  return findAmazingProducts(limit, options);
}

export function getNewProducts(limit = 12, options: Pick<ProductFilters, "branchId" | "salePriceTypeId"> = {}) {
  return findNewProducts(limit, options);
}
