import {
  findProductByCode,
  findProductById,
  findProducts,
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