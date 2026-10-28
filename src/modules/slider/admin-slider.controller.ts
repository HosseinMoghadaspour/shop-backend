import type { Context } from "hono";
import {
  AdminSliderError,
  createAdminSlider,
  deleteAdminSlider,
  listAdminSliders,
  updateAdminSlider,
  uploadAdminSliderImage,
} from "./admin-slider.service.js";

function parseId(value: string | undefined): bigint | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  try { return BigInt(value); } catch { return null; }
}

function readText(value: unknown, max: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new AdminSliderError("فیلد متنی معتبر نیست.");
  const text = value.trim();
  if (text.length > max) throw new AdminSliderError("یکی از فیلدها بیش از حد طولانی است.");
  return text || null;
}

function parsePayload(body: Record<string, unknown>) {
  if (body.Status !== undefined && typeof body.Status !== "boolean") {
    throw new AdminSliderError("وضعیت اسلایدر معتبر نیست.");
  }
  const buttonColor = readText(body.ButtonColor, 7);
  if (buttonColor !== null && !/^#[0-9a-fA-F]{6}$/.test(buttonColor)) {
    throw new AdminSliderError("رنگ دکمه باید یک کد رنگ معتبر مثل #0F766E باشد.");
  }
  return {
    DescImage: readText(body.DescImage, 2000),
    Description: readText(body.Description, 10000),
    DescBut: readText(body.DescBut, 100),
    ButtonColor: buttonColor,
    UrlSend: readText(body.UrlSend, 2000),
    Status: body.Status === true,
  };
}

export async function listSlidersForAdmin(c: Context) {
  const rows = await listAdminSliders();
  return c.json({ success: true, data: rows.map(row => ({ ...row, RowID: row.RowID.toString() })) });
}

export async function createSliderForAdmin(c: Context) {
  try {
    const body = await c.req.json<Record<string, unknown>>();
    const slider = await createAdminSlider(parsePayload(body));
    return c.json({ success: true, data: { ...slider, RowID: slider.RowID.toString() } }, 201);
  } catch (error) {
    if (error instanceof AdminSliderError || error instanceof SyntaxError) {
      return c.json({ success: false, message: error instanceof Error ? error.message : "درخواست نامعتبر است." }, 400);
    }
    console.error("Admin slider create failed:", error);
    return c.json({ success: false, message: "ساخت اسلایدر ناموفق بود." }, 500);
  }
}

export async function updateSliderForAdmin(c: Context) {
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ success: false, message: "شناسه اسلایدر نامعتبر است." }, 400);
  try {
    const body = await c.req.json<Record<string, unknown>>();
    const slider = await updateAdminSlider(id, parsePayload(body));
    if (!slider) return c.json({ success: false, message: "اسلایدر پیدا نشد." }, 404);
    return c.json({ success: true, data: { ...slider, RowID: slider.RowID.toString() } });
  } catch (error) {
    if (error instanceof AdminSliderError || error instanceof SyntaxError) {
      return c.json({ success: false, message: error instanceof Error ? error.message : "درخواست نامعتبر است." }, 400);
    }
    console.error("Admin slider update failed:", error);
    return c.json({ success: false, message: "ویرایش اسلایدر ناموفق بود." }, 500);
  }
}

export async function uploadSliderImageForAdmin(c: Context) {
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ success: false, message: "شناسه اسلایدر نامعتبر است." }, 400);
  try {
    const form = await c.req.formData();
    const file = form.get("image");
    if (!(file instanceof File) || file.size === 0) {
      return c.json({ success: false, message: "یک تصویر انتخاب کنید." }, 400);
    }
    const result = await uploadAdminSliderImage(id, file);
    return c.json({ success: true, data: { ...result, RowID: result.RowID.toString() } });
  } catch (error) {
    if (error instanceof AdminSliderError) {
      const status = error.message === "اسلایدر پیدا نشد." ? 404 : 400;
      return c.json({ success: false, message: error.message }, status);
    }
    console.error("Admin slider image upload failed:", error);
    return c.json({ success: false, message: "بارگذاری تصویر اسلایدر ناموفق بود." }, 500);
  }
}

export async function deleteSliderForAdmin(c: Context) {
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ success: false, message: "شناسه اسلایدر نامعتبر است." }, 400);
  const deleted = await deleteAdminSlider(id);
  if (!deleted) return c.json({ success: false, message: "اسلایدر پیدا نشد." }, 404);
  return c.json({ success: true, message: "اسلایدر حذف شد." });
}
