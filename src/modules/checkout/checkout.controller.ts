import type { Context } from "hono";

import {
  checkout,
} from "./checkout.service.js";

import type {
  CheckoutRequest,
} from "./checkout.types.js";

export async function checkoutController(
  c: Context,
) {
  try {
    const customer = c.get(
      "customer",
    ) as {
      RowID: number;
    } | undefined;

    if (!customer?.RowID) {
      return c.json(
        {
          success: false,
          message:
            "احراز هویت مشتری انجام نشده است.",
        },
        401,
      );
    }

    const body =
      await c.req
        .json<CheckoutRequest>()
        .catch(
          () =>
            null,
        );

    if (!body) {
      return c.json(
        {
          success: false,
          message:
            "اطلاعات درخواست نامعتبر است.",
        },
        400,
      );
    }

    const result =
      await checkout(
        customer.RowID,
        body,
      );

    return c.json(
      {
        success: true,

        message:
          "سفارش با موفقیت ثبت شد.",

        data: result,
      },
      201,
    );
  } catch (error) {
    console.error(
      "Checkout error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "خطا در ثبت سفارش.";

    return c.json(
      {
        success: false,
        message,
      },
      400,
    );
  }
}

