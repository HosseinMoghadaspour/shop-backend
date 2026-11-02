import type { Context } from "hono";
import { z } from "zod";
import {
  getBankAccountsForAdmin,
  updateAdminBankAccount,
  BankAccountAdminError,
} from "./bank-accounts.service.js";


const updateBankAccountSchema = z.object({
  OnlineShop_IsShow: z.boolean().optional(),

  OnlineShop_BankName: z.string()
    .trim()
    .max(50)
    .nullable()
    .optional(),

  OnlineShop_AccountNumber: z.string()
    .trim()
    .max(50)
    .nullable()
    .optional(),

  OnlineShop_CardNumber: z.string()
    .trim()
    .max(50)
    .nullable()
    .optional(),

  OnlineShop_AccountOwnerName: z.string()
    .trim()
    .max(50)
    .nullable()
    .optional(),
}).strict();

export async function listAdminBankAccounts(c: Context) {
  try {
    const accounts = await getBankAccountsForAdmin();

    return c.json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    console.error("Admin bank accounts error:", error);

    return c.json(
      {
        success: false,
        message: "دریافت حساب‌های بانکی ناموفق بود.",
      },
      500
    );
  }
}

export async function updateBankAccountForAdmin(c: Context) {
  const id = Number(c.req.param("id"));

  if (!Number.isSafeInteger(id) || id <= 0) {
    return c.json(
      {
        success: false,
        message: "شناسه حساب بانکی نامعتبر است.",
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

  const parsed = updateBankAccountSchema.safeParse(body);

  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    return c.json(
      {
        success: false,
        message: "اطلاعات ارسالی معتبر نیست یا تغییری ارسال نشده است.",
      },
      400,
    );
  }

  try {
    const data = Object.fromEntries(
      Object.entries(parsed.data).map(([key, value]) => [
        key,
        value === "" ? null : value,
      ]),
    );

    const account = await updateAdminBankAccount(
      id,
      data,
    );

    return c.json({
      success: true,
      message: "اطلاعات حساب بانکی با موفقیت ذخیره شد.",
      data: account,
    });
  } catch (error) {
    if (error instanceof BankAccountAdminError) {
      const status =
        error.code === "NOT_FOUND" ? 404 :
        error.code === "INACTIVE" ? 409 :
        400;

      return c.json(
        {
          success: false,
          message: error.message,
        },
        status,
      );
    }

    console.error("Admin bank account update error:", error);

    return c.json(
      {
        success: false,
        message: "ویرایش حساب بانکی ناموفق بود.",
      },
      500,
    );
  }
}
