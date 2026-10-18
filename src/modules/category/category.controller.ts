import type { Context } from "hono";
import {
  getCategoryById,
  getCategoryTree
} from "./category.service.js";

export async function listCategories(c: Context) {
  const categories = await getCategoryTree();

  return c.json({
    success: true,
    data: categories
  });
}

export async function showCategory(c: Context) {
  const id = Number(c.req.param("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return c.json(
      {
        success: false,
        error: {
          code: "INVALID_CATEGORY_ID",
          message: "شناسه دسته‌بندی نامعتبر است"
        }
      },
      400
    );
  }

  const category = await getCategoryById(id);

  if (!category) {
    return c.json(
      {
        success: false,
        error: {
          code: "CATEGORY_NOT_FOUND",
          message: "دسته‌بندی پیدا نشد"
        }
      },
      404
    );
  }

  return c.json({
    success: true,
    data: category
  });
}