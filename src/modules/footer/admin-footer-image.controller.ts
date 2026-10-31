import type { Context } from "hono";

import {
  AdminFooterImageError,
  uploadAdminFooterImage,
  deleteAdminFooterImage,
} from "./admin-footer-image.service.js";

export async function uploadFooterImageForAdmin(c: Context) {
  try {
    const field = c.req.param("field");

    if (!field) {
      return c.json(
        { success: false, message: "فیلد تصویر نامعتبر است." },
        400,
      );
    }

    const form = await c.req.formData();
    const file = form.get("image");

    if (!(file instanceof File) || file.size === 0) {
      return c.json(
        { success: false, message: "یک تصویر انتخاب کنید." },
        400,
      );
    }

    const result = await uploadAdminFooterImage(field, file);

    return c.json({
      success: true,
      data: result,
      message: "تصویر با موفقیت بارگذاری شد.",
    });
  } catch (error) {
    if (error instanceof AdminFooterImageError) {
      return c.json(
        { success: false, message: error.message },
        400,
      );
    }

    console.error("Admin footer image upload failed:", error);

    return c.json(
      { success: false, message: "بارگذاری تصویر ناموفق بود." },
      500,
    );
  }
}

export async function deleteFooterImageForAdmin(c: Context) {
  try {
    const field = c.req.param("field");

    if (!field) {
      return c.json(
        { success: false, message: "فیلد تصویر نامعتبر است." },
        400,
      );
    }

    const result = await deleteAdminFooterImage(field);

    return c.json({
      success: true,
      data: result,
      message: "تصویر با موفقیت حذف شد.",
    });
  } catch (error) {
    if (error instanceof AdminFooterImageError) {
      const status = error.message === "اطلاعات فوتر پیدا نشد." ? 404 : 400;

      return c.json(
        { success: false, message: error.message },
        status,
      );
    }

    console.error("Admin footer image delete failed:", error);

    return c.json(
      { success: false, message: "حذف تصویر ناموفق بود." },
      500,
    );
  }
}
