import type { Context } from "hono";
import {
  getActivePaymentMethod,
  getPaymentMethods,
  getPaymentStatus,
  getPaymentStatuses,
  getPublicBankAccounts,
  startPayment,
  submitCardToCardReceipt,
  type CardToCardReceiptInput,
} from "./payment.service.js";
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

export async function publicBankAccounts(c: Context) {
  try {
    const accounts = await getPublicBankAccounts();

    return c.json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    console.error(
      "GET /payment/bank-accounts error:",
      error,
    );

    return c.json(
      {
        success: false,
        message: "خطا در دریافت اطلاعات حساب‌های بانکی.",
      },
      500,
    );
  }
}

export async function submitOrderPaymentReceipt(c: Context) {
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

    if (!orderIdRaw || !/^\d+$/.test(orderIdRaw)) {
      return c.json(
        {
          success: false,
          message: "شناسه سفارش نامعتبر است.",
        },
        400,
      );
    }

    const orderId = BigInt(orderIdRaw);

    if (orderId <= 0n) {
      return c.json(
        {
          success: false,
          message: "شناسه سفارش نامعتبر است.",
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

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return c.json(
        {
          success: false,
          message: "اطلاعات رسید معتبر نیست.",
        },
        400,
      );
    }

    const input = body as Record<string, unknown>;

    if (
      typeof input.bankAccountId !== "number" ||
      !Number.isInteger(input.bankAccountId) ||
      typeof input.amount !== "number" ||
      typeof input.trackingNumber !== "string" ||
      typeof input.year !== "string" ||
      typeof input.month !== "string" ||
      typeof input.day !== "string" ||
      typeof input.hour !== "string" ||
      typeof input.minute !== "string" ||
      typeof input.lastFourDigits !== "string"
    ) {
      return c.json(
        {
          success: false,
          message: "اطلاعات ارسالی رسید ناقص یا نامعتبر است.",
        },
        400,
      );
    }

    const receiptData: CardToCardReceiptInput = {
      bankAccountId: input.bankAccountId,
      amount: input.amount,
      trackingNumber: input.trackingNumber,
      year: input.year,
      month: input.month,
      day: input.day,
      hour: input.hour,
      minute: input.minute,
      lastFourDigits: input.lastFourDigits,
    };

    const result = await submitCardToCardReceipt(
      customer.RowID,
      orderId,
      receiptData,
    );

    return c.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error(
      "POST /payment/order/:orderId/receipt error:",
      error,
    );

    return c.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "ثبت رسید پرداخت با خطا مواجه شد.",
      },
      400,
    );
  }
}
