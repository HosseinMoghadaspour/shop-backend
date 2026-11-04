import type { Context } from "hono";
import { createAddressForPerson } from "./locations.service.js";

export async function createMyDeliveryAddress(c: Context) {
  const customer = c.get("customer") as { RowID: number } | undefined;
  if (!customer?.RowID) {
    return c.json({ success: false, message: "احراز هویت انجام نشده است." }, 401);
  }

  const body = await c.req.json().catch(() => null) as {
    cityId?: number;
    deliverToName?: string;
    deliverToMobileNumber?: string;
    deliverToPhoneNumber?: string;
    Adrs?: string;
    PostalCode?: string;
    RowDesc?: string;
    latitude?: number | null;
    longitude?: number | null;
  } | null;

  if (!body || !Number.isSafeInteger(body.cityId) || !body.cityId ||
      typeof body.deliverToName !== "string" ||
      typeof body.deliverToMobileNumber !== "string" ||
      typeof body.Adrs !== "string") {
    return c.json({ success: false, message: "اطلاعات آدرس کامل نیست." }, 400);
  }

  try {
    const saved = await createAddressForPerson(customer.RowID, {
      cityId: body.cityId,
      deliverToName: body.deliverToName,
      deliverToMobileNumber: body.deliverToMobileNumber,
      deliverToPhoneNumber: body.deliverToPhoneNumber,
      Adrs: body.Adrs,
      PostalCode: body.PostalCode,
      RowDesc: body.RowDesc,
      latitude: body.latitude == null ? null : Number(body.latitude),
      longitude: body.longitude == null ? null : Number(body.longitude),
    });
    return c.json({ success: true, data: { id: Number(saved.RowID) } }, 201);
  } catch (error) {
    return c.json({
      success: false,
      message: error instanceof Error ? error.message : "ثبت آدرس انجام نشد.",
    }, 400);
  }
}
