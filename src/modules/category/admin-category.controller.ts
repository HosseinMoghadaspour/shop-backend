import type { Context } from "hono";
import {
  findAdminCategories,
  updateCategoryDisplayOrder,
  updateCategoryIcon,
  updateCategoryVisibility,
  type AdminCategoryVisibility,
} from "./admin-category.repository.js";

function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function listAdminCategories(c: Context) {
  const search = c.req.query("search")?.trim().slice(0, 100) || undefined;
  const rawVisibility = c.req.query("visibility") ?? "all";
  const visibility: AdminCategoryVisibility =
    rawVisibility === "visible" || rawVisibility === "hidden"
      ? rawVisibility
      : "all";
  const page = positiveInt(c.req.query("page"), 1);
  const limit = Math.min(positiveInt(c.req.query("limit"), 20), 100);

  const result = await findAdminCategories({ search, visibility, page, limit });
  return c.json({ success: true, data: result.items, pagination: result.pagination });
}

export async function changeCategoryVisibility(c: Context) {
  const id = positiveInt(c.req.param("id"), 0);
  if (!id) {
    return c.json({ success: false, message: "شناسه دسته‌بندی نامعتبر است." }, 400);
  }

  let body: { isVisible?: unknown };
  try {
    body = await c.req.json<{ isVisible?: unknown }>();
  } catch {
    return c.json({ success: false, message: "بدنه درخواست معتبر نیست." }, 400);
  }

  if (typeof body.isVisible !== "boolean") {
    return c.json({ success: false, message: "وضعیت نمایش باید مشخص باشد." }, 400);
  }

  const result = await updateCategoryVisibility(id, body.isVisible);
  if (result.kind === "not-found") {
    return c.json({ success: false, message: "دسته‌بندی پیدا نشد." }, 404);
  }
  if (result.kind === "inactive") {
    return c.json({
      success: false,
      message: "دسته‌بندی در حسابداری غیرفعال است و نمی‌تواند در سایت نمایش داده شود.",
    }, 409);
  }

  return c.json({ success: true, data: result.category });
}

export async function changeCategoryDisplayOrder(c: Context) {
  const id = positiveInt(c.req.param("id"), 0);
  if (!id) {
    return c.json({ success: false, message: "شناسه دسته‌بندی نامعتبر است." }, 400);
  }

  let body: { sortOrder?: unknown };
  try {
    body = await c.req.json<{ sortOrder?: unknown }>();
  } catch {
    return c.json({ success: false, message: "بدنه درخواست معتبر نیست." }, 400);
  }

  if (
    typeof body.sortOrder !== "number" ||
    !Number.isInteger(body.sortOrder) ||
    body.sortOrder < 0 ||
    body.sortOrder > 999999
  ) {
    return c.json({
      success: false,
      message: "ترتیب نمایش باید عدد صحیح بین صفر تا ۹۹۹۹۹۹ باشد.",
    }, 400);
  }

  const category = await updateCategoryDisplayOrder(id, body.sortOrder);
  if (!category) {
    return c.json({ success: false, message: "دسته‌بندی پیدا نشد." }, 404);
  }

  return c.json({ success: true, data: category });
}

const ALLOWED_CATEGORY_ICONS = new Set([
  "ShoppingBasket", "Sprout", "Leaf", "Flower2", "Trees", "Carrot",
  "Apple", "Cherry", "Wheat", "Milk", "Fish", "Coffee", "Cake",
  "Cookie", "Utensils", "CookingPot", "CupSoda", "Package", "Shirt",
  "Smartphone", "Monitor", "BookOpen", "PawPrint", "Dumbbell", "Bike",
  "Baby", "Heart", "Gift", "House", "ClipboardList", "Stethoscope",
]);

export async function changeCategoryIcon(c: Context) {
  const id = positiveInt(c.req.param("id"), 0);
  if (!id) {
    return c.json({ success: false, message: "شناسه دسته‌بندی نامعتبر است." }, 400);
  }

  let body: { iconName?: unknown };
  try {
    body = await c.req.json<{ iconName?: unknown }>();
  } catch {
    return c.json({ success: false, message: "بدنه درخواست معتبر نیست." }, 400);
  }

  const iconName = body.iconName;
  if (iconName !== null && (typeof iconName !== "string" || !ALLOWED_CATEGORY_ICONS.has(iconName))) {
    return c.json({ success: false, message: "آیکون انتخاب‌شده معتبر نیست." }, 400);
  }

  const category = await updateCategoryIcon(id, iconName as string | null);
  if (!category) {
    return c.json({ success: false, message: "دسته‌بندی پیدا نشد." }, 404);
  }

  return c.json({ success: true, data: category });
}
