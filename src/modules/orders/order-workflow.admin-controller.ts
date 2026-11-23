import type { Context } from "hono";
import { setAdminShippingQuote } from "./order-workflow.service.js";

export async function setAdminShippingQuoteController(c: Context) {
  const rawId = c.req.param("id") || "";
  if (!/^\d+$/.test(rawId) || BigInt(rawId) <= 0n) {
    return c.json({ success: false, message: "شناسه سفارش نامعتبر است." }, 400);
  }
  let body: { shippingCost?: unknown; adminNote?: unknown; expiresAt?: unknown };
  try { body = await c.req.json(); } catch {
    return c.json({ success: false, message: "بدنه درخواست معتبر نیست." }, 400);
  }
  if (typeof body.shippingCost !== "number" || !Number.isFinite(body.shippingCost) || body.shippingCost < 0) {
    return c.json({ success: false, message: "هزینه ارسال باید عددی معتبر و غیرمنفی باشد." }, 400);
  }
  if (body.adminNote !== undefined &&
      (typeof body.adminNote !== "string" || body.adminNote.trim().length > 500)) {
    return c.json({ success: false, message: "توضیح مدیر حداکثر باید ۵۰۰ نویسه باشد." }, 400);
  }
  let expiresAt: Date | undefined;
  if (body.expiresAt !== undefined) {
    if (typeof body.expiresAt !== "string" || !Number.isFinite(Date.parse(body.expiresAt))) {
      return c.json({ success: false, message: "زمان انقضای پیشنهاد معتبر نیست." }, 400);
    }
    expiresAt = new Date(body.expiresAt);
    if (expiresAt.getTime() <= Date.now()) {
      return c.json({ success: false, message: "زمان انقضا باید در آینده باشد." }, 400);
    }
  }
  try {
    const result = await setAdminShippingQuote(
      BigInt(rawId),
      body.shippingCost,
      typeof body.adminNote === "string" ? body.adminNote : undefined,
      expiresAt,
    );
    if (result.kind === "not-found") return c.json({ success: false, message: "سفارش پیدا نشد." }, 404);
    if (result.kind === "invalid-status") return c.json({ success: false, message: "این سفارش در انتظار تعیین هزینه ارسال نیست." }, 409);
    return c.json({ success: true, message: "هزینه ارسال ثبت شد و برای تأیید به مشتری ارسال شد.", data: { payablePrice: result.payablePrice, workflowStatus: 2 } });
  } catch (error) {
    console.error("Set shipping quote error:", error);
    return c.json({ success: false, message: "ثبت هزینه ارسال ناموفق بود." }, 500);
  }
}
