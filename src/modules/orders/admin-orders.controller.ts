import type { Context } from "hono";
import {
  findAdminOrderById,
  findAdminOrders,
  updateAdminOrderStatuses,
} from "./admin-orders.repository.js";

function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function listAdminOrders(c: Context) {
  const page = positiveInt(c.req.query("page"), 1);
  const limit = Math.min(positiveInt(c.req.query("limit"), 20), 100);
  const search = c.req.query("search")?.trim().slice(0, 30) || undefined;
  const result = await findAdminOrders(page, limit, search);
  return c.json({ success: true, data: result.items, statuses: result.statuses, pagination: result.pagination });
}

export async function showAdminOrder(c: Context) {
  const id = positiveInt(c.req.param("id"), 0);
  if (!id) return c.json({ success: false, message: "شناسه سفارش نامعتبر است." }, 400);
  const order = await findAdminOrderById(id);
  if (!order) return c.json({ success: false, message: "سفارش پیدا نشد." }, 404);
  return c.json({ success: true, data: order });
}

export async function changeAdminOrderStatuses(c: Context) {
  const id = positiveInt(c.req.param("id"), 0);
  if (!id) return c.json({ success: false, message: "شناسه سفارش نامعتبر است." }, 400);

  let body: { deliveryStatusId?: unknown; paymentStatusId?: unknown; sendStatusId?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, message: "بدنه درخواست معتبر نیست." }, 400);
  }

  const hasDelivery = body.deliveryStatusId !== undefined;
  const hasPayment = body.paymentStatusId !== undefined;
  const hasSend = body.sendStatusId !== undefined;
  if (!hasDelivery && !hasPayment && !hasSend) {
    return c.json({ success: false, message: "حداقل یک وضعیت برای به‌روزرسانی لازم است." }, 400);
  }
  if (hasDelivery && (!Number.isInteger(body.deliveryStatusId) || Number(body.deliveryStatusId) <= 0)) {
    return c.json({ success: false, message: "وضعیت ارسال نامعتبر است." }, 400);
  }
  if (hasSend && (!Number.isInteger(body.sendStatusId) || Number(body.sendStatusId) <= 0)) {
    return c.json({ success: false, message: "مرحله سفارش نامعتبر است." }, 400);
  }
  if (hasPayment && (!Number.isInteger(body.paymentStatusId) || Number(body.paymentStatusId) <= 0)) {
    return c.json({ success: false, message: "وضعیت پرداخت نامعتبر است." }, 400);
  }

  const result = await updateAdminOrderStatuses(
    id,
    hasDelivery ? Number(body.deliveryStatusId) : undefined,
    hasPayment ? Number(body.paymentStatusId) : undefined,
    hasSend ? Number(body.sendStatusId) : undefined,
  );
  if (result.kind === "not-found") return c.json({ success: false, message: "سفارش پیدا نشد." }, 404);
  if (result.kind === "invalid-delivery-status") return c.json({ success: false, message: "وضعیت ارسال انتخاب‌شده معتبر نیست." }, 400);
  if (result.kind === "invalid-send-status") return c.json({ success: false, message: "مرحله انتخاب‌شده در جدول Fix_OrderSendMethod وجود ندارد." }, 400);
  if (result.kind === "invalid-payment-status") return c.json({ success: false, message: "وضعیت پرداخت انتخاب‌شده معتبر نیست." }, 400);
  return c.json({ success: true, message: "وضعیت سفارش به‌روزرسانی شد." });
}
