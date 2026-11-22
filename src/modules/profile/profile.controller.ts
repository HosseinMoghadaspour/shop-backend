import type { Context } from "hono";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";

const profileSchema = z.object({
  fullName: z.string().trim().min(3, "نام و نام خانوادگی را کامل وارد کنید.").max(100),
  phoneNumber: z.string().trim().max(200).optional().or(z.literal("")),
  email: z.string().trim().email("ایمیل معتبر نیست.").max(200).optional().or(z.literal("")),
  nationalCode: z.string().trim().max(200).optional().or(z.literal("")),
});

function getCustomerId(c: Context): number | null {
  const customer = c.get("customer") as { RowID?: number } | undefined;
  return Number.isSafeInteger(customer?.RowID) && Number(customer?.RowID) > 0
    ? Number(customer!.RowID)
    : null;
}

function serialize(person: {
  RowID: number;
  RowName: string;
  MobileNumber: string | null;
  MobileForSMS: string | null;
  PhoneNumber: string | null;
  Email: string | null;
  NationalCode: string | null;
}) {
  const mobile = person.MobileNumber || person.MobileForSMS || null;
  return {
    id: person.RowID,
    fullName: person.RowName === "مشتری" ? "" : person.RowName,
    mobile,
    phoneNumber: person.PhoneNumber ?? "",
    email: person.Email ?? "",
    nationalCode: person.NationalCode ?? "",
    isComplete: Boolean(person.RowName?.trim() && person.RowName !== "مشتری" && mobile),
  };
}

export async function getMyProfile(c: Context) {
  const customerId = getCustomerId(c);
  if (!customerId) return c.json({ success: false, message: "احراز هویت انجام نشده است." }, 401);

  const person = await prisma.person.findFirst({
    where: { RowID: customerId, IsActive: true },
    select: {
      RowID: true,
      RowName: true,
      MobileNumber: true,
      MobileForSMS: true,
      PhoneNumber: true,
      Email: true,
      NationalCode: true,
    },
  });
  if (!person) return c.json({ success: false, message: "حساب کاربری پیدا نشد." }, 404);
  return c.json({ success: true, data: serialize(person) });
}

export async function updateMyProfile(c: Context) {
  const customerId = getCustomerId(c);
  if (!customerId) return c.json({ success: false, message: "احراز هویت انجام نشده است." }, 401);

  const body = await c.req.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({
      success: false,
      message: parsed.error.issues[0]?.message ?? "اطلاعات حساب کاربری معتبر نیست.",
    }, 400);
  }

  const existing = await prisma.person.findFirst({
    where: { RowID: customerId, IsActive: true },
    select: { RowID: true },
  });
  if (!existing) return c.json({ success: false, message: "حساب کاربری پیدا نشد." }, 404);

  const person = await prisma.person.update({
    where: { RowID: customerId },
    data: {
      RowName: parsed.data.fullName,
      PhoneNumber: parsed.data.phoneNumber || null,
      Email: parsed.data.email || null,
      NationalCode: parsed.data.nationalCode || null,
      IsRegisteredOnline: true,
    },
    select: {
      RowID: true,
      RowName: true,
      MobileNumber: true,
      MobileForSMS: true,
      PhoneNumber: true,
      Email: true,
      NationalCode: true,
    },
  });
  return c.json({ success: true, message: "اطلاعات حساب کاربری ذخیره شد.", data: serialize(person) });
}
