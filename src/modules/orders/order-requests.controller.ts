import type { Context } from "hono";
import {
  createCustomerOrderRequest,
  findAdminOrderRequests,
  findCustomerOrderRequests,
  ORDER_REQUEST_STATUS,
  ORDER_REQUEST_TYPE,
  updateAdminOrderRequest,
} from "./order-requests.repository.js";

function positiveInt(value: string | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function createOrderRequestController(c: Context) {
  const customer = c.get("customer") as { RowID: number } | undefined;
  const orderId = positiveInt(c.req.param("id"));
  if (!customer?.RowID) return c.json({ success: false, message: "احراز هویت مشتری انجام نشده است." }, 401);
  if (!orderId) return c.json({ success: false, message: "شناسه سفارش نامعتبر است." }, 400);

  let body: { requestType?: unknown; message?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, message: "بدنه درخواست معتبر نیست." }, 400);
  }

  const requestType = body.requestType;
  if (
    requestType !== ORDER_REQUEST_TYPE.CANCELLATION &&
    requestType !== ORDER_REQUEST_TYPE.SUPPORT
  ) {
    return c.json({ success: false, message: "نوع درخواست معتبر نیست." }, 400);
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (requestType === ORDER_REQUEST_TYPE.SUPPORT && !message) {
    return c.json({ success: false, message: "شرح درخواست پشتیبانی الزامی است." }, 400);
  }
  if (message.length > 1000) {
    return c.json({ success: false, message: "شرح درخواست نباید بیشتر از ۱۰۰۰ نویسه باشد." }, 400);
  }

  try {
    const result = await createCustomerOrderRequest(orderId, customer.RowID, requestType, message);
    if (result.kind === "order-not-found") return c.json({ success: false, message: "سفارش پیدا نشد." }, 404);
    if (result.kind === "duplicate-cancellation") {
      return c.json({ success: false, message: "برای این سفارش درخواست لغو باز وجود دارد." }, 409);
    }
    return c.json({
      success: true,
      message: requestType === ORDER_REQUEST_TYPE.CANCELLATION
        ? "درخواست لغو برای بررسی مدیر ثبت شد."
        : "درخواست پشتیبانی ثبت شد.",
      data: {
        ...result.request,
        id: Number(result.request.RowID),
        orderId: Number(result.request.OrderH_ID),
      },
    }, 201);
  } catch (error) {
    console.error("Create order request error:", error);
    return c.json({ success: false, message: "ثبت درخواست با خطا مواجه شد." }, 500);
  }
}

export async function listCustomerOrderRequestsController(c: Context) {
  const customer = c.get("customer") as { RowID: number } | undefined;
  const orderId = positiveInt(c.req.param("id"));
  if (!customer?.RowID) return c.json({ success: false, message: "احراز هویت مشتری انجام نشده است." }, 401);
  if (!orderId) return c.json({ success: false, message: "شناسه سفارش نامعتبر است." }, 400);

  const data = await findCustomerOrderRequests(orderId, customer.RowID);
  if (!data) return c.json({ success: false, message: "سفارش پیدا نشد." }, 404);
  return c.json({
    success: true,
    data: data.map((item) => ({ ...item, id: Number(item.RowID) })),
  });
}

export async function listAdminOrderRequestsController(c: Context) {
  const page = positiveInt(c.req.query("page"), 1);
  const limit = Math.min(positiveInt(c.req.query("limit"), 20), 100);
  const rawStatus = c.req.query("status");
  const status = rawStatus === undefined ? undefined : Number(rawStatus);
  if (status !== undefined && ![1, 2, 3, 4].includes(status)) {
    return c.json({ success: false, message: "فیلتر وضعیت نامعتبر است." }, 400);
  }
  const result = await findAdminOrderRequests(page, limit, status);
  return c.json({ success: true, data: result.items, pagination: result.pagination });
}

export async function updateAdminOrderRequestController(c: Context) {
  const requestId = positiveInt(c.req.param("id"));
  if (!requestId) return c.json({ success: false, message: "شناسه درخواست نامعتبر است." }, 400);

  let body: { status?: unknown; adminResponse?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, message: "بدنه درخواست معتبر نیست." }, 400);
  }
  if (
    !Number.isInteger(body.status) ||
    ![1, 2, 3, 4].includes(Number(body.status))
  ) {
    return c.json({ success: false, message: "وضعیت انتخاب‌شده معتبر نیست." }, 400);
  }
  if (body.adminResponse !== undefined &&
      (typeof body.adminResponse !== "string" || body.adminResponse.trim().length > 1000)) {
    return c.json({ success: false, message: "پاسخ مدیر حداکثر باید ۱۰۰۰ نویسه باشد." }, 400);
  }

  const updated = await updateAdminOrderRequest(
    requestId,
    Number(body.status),
    body.adminResponse === undefined ? undefined : body.adminResponse.trim(),
  );
  if (!updated) return c.json({ success: false, message: "درخواست پیدا نشد." }, 404);
  return c.json({ success: true, message: "درخواست به‌روزرسانی شد." });
}

export const orderRequestStatusOptions = ORDER_REQUEST_STATUS;
