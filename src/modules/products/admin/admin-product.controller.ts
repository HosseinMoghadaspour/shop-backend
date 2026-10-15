
import type { Context } from "hono";
import { z } from "zod";
import {
  findAdminProducts,
  updateAdminProductVisibility,
} from "./admin-product.repository.js";

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  visibility: z.enum(["all", "visible", "hidden"]).default("all"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const visibilitySchema = z.object({
  isVisible: z.boolean(),
});

export async function listAdminProducts(c: Context) {
  const parsed = listQuerySchema.safeParse(c.req.query());

  if (!parsed.success) {
    return c.json(
      {
        success: false,
        message: "پارامترهای فهرست کالا نامعتبر هستند.",
      },
      400,
    );
  }

  const result = await findAdminProducts(parsed.data);

  return c.json({
    success: true,
    data: result.items,
    pagination: result.pagination,
  });
}

export async function changeProductVisibility(c: Context) {
  const id = Number(c.req.param("id"));

  if (!Number.isSafeInteger(id) || id <= 0) {
    return c.json(
      {
        success: false,
        message: "شناسه کالا نامعتبر است.",
      },
      400,
    );
  }

  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        success: false,
        message: "بدنه درخواست JSON معتبر نیست.",
      },
      400,
    );
  }

  const parsed = visibilitySchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        success: false,
        message: "وضعیت نمایش باید true یا false باشد.",
      },
      400,
    );
  }

  const product = await updateAdminProductVisibility(
    id,
    parsed.data.isVisible,
  );

  if (!product) {
    return c.json(
      {
        success: false,
        message: "کالا پیدا نشد.",
      },
      404,
    );
  }

  return c.json({
    success: true,
    message: parsed.data.isVisible
      ? "نمایش کالا در سایت فعال شد."
      : "نمایش کالا در سایت غیرفعال شد.",
    data: {
      id: product.RowID,
      isVisible: product.IsShowInOnlineShop ?? false,
    },
  });
}
