import type { Context } from "hono";
import {
  getActivePaymentMethod,
  getPaymentMethods,
  getPaymentStatus,
  getPaymentStatuses,
} from "./payment.service.js";
import { startPayment } from "./payment.service.js";

export async function paymentMethods(c: Context) {
  try {
    const methods = await getPaymentMethods();

    return c.json({
      success: true,
      data: methods,
    });
  } catch (error) {
    console.error(
      "GET /payment/methods error:",
      error,
    );

    return c.json(
      {
        success: false,
        message: "خطا در دریافت روش‌های پرداخت.",
      },
      500,
    );
  }
}

export async function paymentMethodDetail(c: Context) {
  try {
    const id = Number(c.req.param("id"));

    if (!Number.isInteger(id) || id <= 0) {
      return c.json(
        {
          success: false,
          message: "شناسه روش پرداخت نامعتبر است.",
        },
        400,
      );
    }

    const method =
      await getActivePaymentMethod(id);

    return c.json({
      success: true,
      data: method,
    });
  } catch (error) {
    console.error(
      "GET /payment/methods/:id error:",
      error,
    );

    return c.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "روش پرداخت پیدا نشد.",
      },
      404,
    );
  }
}

export async function paymentStatuses(c: Context) {
  try {
    const statuses = await getPaymentStatuses();

    return c.json({
      success: true,
      data: statuses,
    });
  } catch (error) {
    console.error(
      "GET /payment/statuses error:",
      error,
    );

    return c.json(
      {
        success: false,
        message: "خطا در دریافت وضعیت‌های پرداخت.",
      },
      500,
    );
  }
}

export async function paymentStatusDetail(c: Context) {
  try {
    const id = Number(c.req.param("id"));

    if (!Number.isInteger(id) || id <= 0) {
      return c.json(
        {
          success: false,
          message: "شناسه وضعیت پرداخت نامعتبر است.",
        },
        400,
      );
    }

    const status = await getPaymentStatus(id);

    return c.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error(
      "GET /payment/statuses/:id error:",
      error,
    );

    return c.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "وضعیت پرداخت پیدا نشد.",
      },
      404,
    );
  }
}

export async function startOrderPayment(c: Context) {
  try {
    const customer = c.get("customer");

    if (!customer) {
      return c.json(
        {
          success: false,
          message: "احراز هویت مشتری انجام نشده است.",
        },
        401,
      );
    }

    const orderIdRaw = c.req.param("orderId");

    if (!orderIdRaw) {
      return c.json(
        {
          success: false,
          message: "شناسه سفارش ارسال نشده است.",
        },
        400,
      );
    }

    let orderId: bigint;

    try {
      orderId = BigInt(orderIdRaw);
    } catch {
      return c.json(
        {
          success: false,
          message: "شناسه سفارش نامعتبر است.",
        },
        400,
      );
    }

    const result = await startPayment(
      customer.RowID,
      orderId,
    );

    return c.json({
      success: true,
      message: "درخواست پرداخت با موفقیت ایجاد شد.",
      data: result,
    });
  } catch (error) {
    console.error(
      "POST /payment/order/:orderId error:",
      error,
    );

    return c.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "خطا در شروع پرداخت.",
      },
      400,
    );
  }
}