import type { Context } from "hono";
import {
  getAmazingProducts,
  getNewProducts,
  getProductByCode,
  getProductById,
  getProducts,
} from "./product.service.js";
import { productLimitSchema, productQuerySchema } from "./product.schema.js";

function priceOptions(c: Context) {
  const branchId = c.req.query("branchId");
  const salePriceTypeId = c.req.query("salePriceTypeId");
  return {
    branchId: branchId ? Number(branchId) : undefined,
    salePriceTypeId: salePriceTypeId ? Number(salePriceTypeId) : undefined,
  };
}

export async function listProducts(c: Context) {
  const parsed = productQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ success: false, error: { code: "INVALID_QUERY", message: "پارامترهای ورودی نامعتبر هستند", details: parsed.error.flatten() } }, 400);
  }
  const result = await getProducts(parsed.data);
  return c.json({ success: true, data: result.items, pagination: result.pagination });
}

export async function showProduct(c: Context) {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return c.json({ success: false, error: { code: "INVALID_PRODUCT_ID", message: "شناسه کالا نامعتبر است" } }, 400);
  }
  const product = await getProductById(id, priceOptions(c));
  if (!product) {
    return c.json({ success: false, error: { code: "PRODUCT_NOT_FOUND", message: "کالا پیدا نشد" } }, 404);
  }
  return c.json({ success: true, data: product });
}

export async function showProductByCode(c: Context) {
  const code = c.req.param("code");
  if (!code) {
    return c.json({ success: false, error: { code: "INVALID_PRODUCT_CODE", message: "کد کالا وارد نشده است" } }, 400);
  }
  const product = await getProductByCode(code, priceOptions(c));
  if (!product) {
    return c.json({ success: false, error: { code: "PRODUCT_NOT_FOUND", message: "کالا پیدا نشد" } }, 404);
  }
  return c.json({ success: true, data: product });
}

export async function listAmazingProducts(c: Context) {
  const parsed = productLimitSchema.safeParse(c.req.query("limit") ?? 12);
  if (!parsed.success) return c.json({ success: false, error: { code: "INVALID_LIMIT", message: "مقدار limit نامعتبر است" } }, 400);
  return c.json({ success: true, data: await getAmazingProducts(parsed.data, priceOptions(c)) });
}

export async function listNewProducts(c: Context) {
  const parsed = productLimitSchema.safeParse(c.req.query("limit") ?? 12);
  if (!parsed.success) return c.json({ success: false, error: { code: "INVALID_LIMIT", message: "مقدار limit نامعتبر است" } }, 400);
  return c.json({ success: true, data: await getNewProducts(parsed.data, priceOptions(c)) });
}
