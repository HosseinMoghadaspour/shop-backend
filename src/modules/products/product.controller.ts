import type { Context } from "hono";
import {
  getProductByCode,
  getProductById,
  getProducts
} from "./product.service.js";
import { productQuerySchema } from "./product.schema.js";

export async function listProducts(c: Context) {
  const query = c.req.query();

  const parsed = productQuerySchema.safeParse(query);

  if (!parsed.success) {
    return c.json(
      {
        success: false,
        error: {
          code: "INVALID_QUERY",
          message: "پارامترهای ورودی نامعتبر هستند",
          details: parsed.error.flatten()
        }
      },
      400
    );
  }

  const result = await getProducts(parsed.data);

  return c.json({
    success: true,
    data: result.items,
    pagination: result.pagination
  });
}

export async function showProduct(c: Context) {
  const id = Number(c.req.param("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return c.json(
      {
        success: false,
        error: {
          code: "INVALID_PRODUCT_ID",
          message: "شناسه کالا نامعتبر است"
        }
      },
      400
    );
  }

  const product = await getProductById(id);

  if (!product) {
    return c.json(
      {
        success: false,
        error: {
          code: "PRODUCT_NOT_FOUND",
          message: "کالا پیدا نشد"
        }
      },
      404
    );
  }

  return c.json({
    success: true,
    data: product
  });
}

export async function showProductByCode(c: Context) {
  const code = c.req.param("code");

  if (!code) {
    return c.json(
      {
        success: false,
        error: {
          code: "INVALID_PRODUCT_CODE",
          message: "کد کالا وارد نشده است"
        }
      },
      400
    );
  }

  const product = await getProductByCode(code);

  if (!product) {
    return c.json(
      {
        success: false,
        error: {
          code: "PRODUCT_NOT_FOUND",
          message: "کالا پیدا نشد"
        }
      },
      404
    );
  }

  return c.json({
    success: true,
    data: product
  });
}