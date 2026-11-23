import type { Context } from "hono";
import { confirmCustomerOrderTotal } from "./order-workflow.service.js";

export async function confirmCustomerOrderTotalController(c: Context) {
  const customer = c.get("customer") as { RowID: number } | undefined;
  const id = c.req.param("id");
  if (!customer?.RowID) return c.json({ success: false, message: "احراز هویت مشتری انجام نشده است." }, 401);
  if (!id || !/^\d+$/.test(id) || BigInt(id) <= 0n) {
    return c.json({ success: false, message: "شناسه سفارش نامعتبر است." }, 400);
  }
  let body: { accepted?: unknown };
  try { body = await c.req.json(); } catch {
    return c.json({ success: false, message: "بدنه درخواست معتبر نیست." }, 400);
  }
  if (typeof body.accepted !== "boolean") {
    return c.json({ success: false, message: "وضعیت تأیید مبلغ باید مشخص شود." }, 400);
  }
  try {
    const result = await confirmCustomerOrderTotal(BigInt(id), customer.RowID, body.accepted);
    if (result.kind === "not-found") return c.json({ success: false, message: "سفارش پیدا نشد." }, 404);
    if (result.kind === "expired") return c.json({ success: false, message: "مهلت تأیید مبلغ سفارش به پایان رسیده است." }, 409);
    if (result.kind === "invalid-status") return c.json({ success: false, message: "این سفارش در انتظار تأیید مبلغ نیست." }, 409);
    return c.json({
      success: true,
      message: result.kind === "accepted"
        ? "مبلغ نهایی سفارش تأیید شد؛ اکنون می‌توانید پرداخت را انجام دهید."
        : "مبلغ نهایی سفارش رد شد.",
      data: { workflowStatus: result.kind === "accepted" ? 3 : 5 },
    });
  } catch (error) {
    console.error("Confirm order total error:", error);
    return c.json({ success: false, message: "ثبت پاسخ شما با خطا مواجه شد." }, 500);
  }
}
