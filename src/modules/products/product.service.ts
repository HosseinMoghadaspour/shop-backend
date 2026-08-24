import {
  findProductByCode,
  findProductById,
  findProducts,
  getAmazingProducts as findAmazingProducts,
  getNewProducts as findNewProducts,
  type ProductFilters
} from "./product.repository.js";

export async function getProducts(filters: ProductFilters) {
  const result = await findProducts(filters);

  return {
    items: result.items,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / filters.limit)
    }
  };
}

export async function getProductById(id: number) {
  return findProductById(id);
}

export async function getProductByCode(code: string) {
  return findProductByCode(code);
}

export async function getAmazingProducts(limit = 12) {
  return findAmazingProducts(limit);
}

export async function getNewProducts(limit = 12) {
  return findNewProducts(limit);
}