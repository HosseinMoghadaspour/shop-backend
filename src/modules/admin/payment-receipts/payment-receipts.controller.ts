import type { Context } from "hono";

import {
  getPendingPaymentReceipts,
  approvePaymentReceipt,
  rejectPaymentReceipt,
} from "./payment-receipts.service.js";

function parseOrderId(value: string): bigint | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  try {
    const id = BigInt(value);
    return id > 0n ? id : null;
  } catch {
    return null;
  }
}

export async function listPendingPaymentReceipts(c: Context) {
  try {
    const receipts = await getPendingPaymentReceipts();

    return c.json({
      success: true,
      data: receipts,
    });
  } catch (error) {
    console.error("List payment receipts error:", error);

    return c.json(
      {
        success: false,
        message: "دریافت رسیدهای پرداخت ناموفق بود.",
      },
      500,
    );
  }
}

export async function approvePaymentReceiptForAdmin(c: Context) {
  const orderId = parseOrderId(c.req.param("orderId") || "");

  if (orderId === null) {
    return c.json(
      {
        success: false,
        message: "شناسه سفارش نامعتبر است.",
      },
      400,
    );
  }

  try {
    const result = await approvePaymentReceipt(orderId);

    return c.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error("Approve payment receipt error:", error);

    return c.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "تأیید رسید پرداخت ناموفق بود.",
      },
      400,
    );
  }
}

export async function rejectPaymentReceiptForAdmin(c: Context) {
  const orderId = parseOrderId(c.req.param("orderId") || "");

  if (orderId === null) {
    return c.json(
      {
        success: false,
        message: "شناسه سفارش نامعتبر است.",
      },
      400,
    );
  }

  try {
    const result = await rejectPaymentReceipt(orderId);

    return c.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error("Reject payment receipt error:", error);

    return c.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "رد رسید پرداخت ناموفق بود.",
      },
      400,
    );
  }
}
