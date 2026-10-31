
import type { Context } from "hono";
import {
  getAdminFooter,
  updateAdminFooter,
  type FooterUpdateInput,
} from "./admin-footer.service.js";

const editableFields = [
  "AboutText",
  "Address",
  "Phone1",
  "Phone2",
  "InstagramHandle",
  "TelegramHandle",
  "WhatsAppHandle",
  "EtaHandle",
  "Rubikahandle",
  "LogoImageUrl",
  "EnamadImageUrl",
  "ReziImageUrl",
  "SamandehiUrl",
  "DragahUrl",
  "LinkContactUs",
  "LinkAboutUs",
  "LinkFAQ",
  "LinkArticles",
  "Copyright",
  "SiteIcon",
  "SiteName",
] as const;

function parseFooterPayload(
  body: Record<string, unknown>,
): FooterUpdateInput {
  const result: FooterUpdateInput = {};

  for (const key of Object.keys(body)) {
    if (!editableFields.includes(key as typeof editableFields[number])) {
      throw new Error(`فیلد غیرمجاز: ${key}`);
    }

    const value = body[key];

    if (value !== null && typeof value !== "string") {
      throw new Error(`مقدار فیلد ${key} معتبر نیست.`);
    }

    if (typeof value === "string" && value.length > 10000) {
      throw new Error(`مقدار فیلد ${key} بیش از حد طولانی است.`);
    }

    result[key as keyof FooterUpdateInput] =
      typeof value === "string" ? value.trim() || null : null;
  }

  if (Object.keys(result).length === 0) {
    throw new Error("حداقل یک فیلد برای ذخیره ارسال کنید.");
  }

  return result;
}

export async function getFooterForAdmin(c: Context) {
  try {
    const footer = await getAdminFooter();

    return c.json({
      success: true,
      data: footer,
    });
  } catch (error) {
    console.error("Admin footer fetch failed:", error);

    return c.json(
      {
        success: false,
        message: "دریافت اطلاعات فوتر ناموفق بود.",
      },
      500,
    );
  }
}

export async function updateFooterForAdmin(c: Context) {
  try {
    const body = await c.req.json<Record<string, unknown>>();
    const data = parseFooterPayload(body);

    const footer = await updateAdminFooter(data);

    return c.json({
      success: true,
      message: "اطلاعات فوتر با موفقیت ذخیره شد.",
      data: footer,
    });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof Error &&
      error.message.startsWith("فیلد") ||
      error instanceof Error &&
      error.message.startsWith("مقدار") ||
      error instanceof Error &&
      error.message.startsWith("حداقل")) {
      return c.json(
        {
          success: false,
          message: error.message,
        },
        400,
      );
    }

    console.error("Admin footer update failed:", error);

    return c.json(
      {
        success: false,
        message: "ذخیره اطلاعات فوتر ناموفق بود.",
      },
      500,
    );
  }
}
