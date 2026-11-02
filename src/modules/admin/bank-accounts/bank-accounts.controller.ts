import type { Context } from "hono";
import { getBankAccountsForAdmin } from "./bank-accounts.service.js";

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
