
import type { Context } from "hono";
import {
  deleteProductImage,
  ProductImageError,
  setDefaultProductImage,
  uploadProductImages,
} from "./product-image.service.js";

function parsePositiveId(value: string | undefined): number | null {
  if (!value) return null;

  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function parseImageId(value: string | undefined): bigint | null {
  if (!value || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  try {
    return BigInt(value);
  } catch {
    return null;
  }
}
export async function uploadImages(c: Context) {
  const productId = parsePositiveId(c.req.param("id"));

  if (!productId) {
    return c.json({ success: false, message: "شناسه کالا نامعتبر است." }, 400);
  }

  try {
    const form = await c.req.formData();
    const entries = form.getAll("images");

    if (!entries.every((entry) => entry instanceof File)) {
      return c.json({
        success: false,
        message: "فایل‌های ارسال‌شده معتبر نیستند.",
      }, 400);
    }

    const files = entries.filter(
      (entry): entry is File => entry instanceof File && entry.size > 0,
    );

    const images = await uploadProductImages(productId, files);

    return c.json({
      success: true,
      message: "تصاویر با موفقیت بارگذاری شدند.",
      data: images,
    }, 201);
  } catch (error) {
    if (error instanceof ProductImageError) {
      const status = error.message === "کالا پیدا نشد." ? 404 : 400;
      return c.json({ success: false, message: error.message }, status);
    }

    console.error("Product image upload failed:", error);

    return c.json({
      success: false,
      message: "خطا هنگام بارگذاری تصاویر.",
    }, 500);
  }
}

export async function makeDefaultImage(c: Context) {
  const productId = parsePositiveId(c.req.param("id"));
  const imageId = parseImageId(c.req.param("imageId"));

  if (!productId || !imageId) {
    return c.json({ success: false, message: "شناسه نامعتبر است." }, 400);
  }

  const updated = await setDefaultProductImage(productId, imageId);

  if (!updated) {
    return c.json({
      success: false,
      message: "تصویر متعلق به این کالا نیست یا پیدا نشد.",
    }, 404);
  }

  return c.json({
    success: true,
    message: "تصویر پیش‌فرض تغییر کرد.",
  });
}

export async function removeImage(c: Context) {
  const productId = parsePositiveId(c.req.param("id"));
  const imageId = parseImageId(c.req.param("imageId"));

  if (!productId || !imageId) {
    return c.json({ success: false, message: "شناسه نامعتبر است." }, 400);
  }

  const deleted = await deleteProductImage(productId, imageId);

  if (!deleted) {
    return c.json({
      success: false,
      message: "تصویر پیدا نشد.",
    }, 404);
  }

  return c.json({
    success: true,
    message: "تصویر حذف شد.",
  });
}
