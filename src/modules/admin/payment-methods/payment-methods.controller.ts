
import type { Context } from "hono";

import {
  getPaymentMethodsForAdmin,
  updatePaymentMethodStatus,
} from "./payment-methods.service.js";

export async function listPaymentMethodsForAdmin(c: Context) {
  try {
    const methods = await getPaymentMethodsForAdmin();

    return c.json({
      success: true,
      data: methods,
    });
  } catch (error) {
    console.error("Admin payment methods list error:", error);

    return c.json(
      {
        success: false,
        message: "خطا در دریافت روش‌های پرداخت.",
      },
      500,
    );
  }
}

export async function updatePaymentMethodStatusForAdmin(c: Context) {
  try {
    const id = Number(c.req.param("id"));

    if (!Number.isInteger(id) || id <= 0) {
      return c.json(
        {
          success: false,
          message: "شناسه روش پرداخت معتبر نیست.",
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
          message: "اطلاعات ارسالی معتبر نیست.",
        },
        400,
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body) ||
      typeof (body as Record<string, unknown>).isActive !== "boolean"
    ) {
      return c.json(
        {
          success: false,
          message: "وضعیت فعال‌بودن باید به‌صورت true یا false ارسال شود.",
        },
        400,
      );
    }

    const result = await updatePaymentMethodStatus(
      id,
      (body as { isActive: boolean }).isActive,
    );

    return c.json({
      success: true,
      message: result.isActive
        ? "روش پرداخت فعال شد."
        : "روش پرداخت غیرفعال شد.",
      data: result,
    });
  } catch (error) {
    console.error("Admin payment method update error:", error);

    return c.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "خطا در تغییر وضعیت روش پرداخت.",
      },
      400,
    );
  }
}
