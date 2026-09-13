import type { Context } from "hono";

import {
  order,
  orderDeliveryAddress,
} from "./orders.service.js";

import type {
  OrderDeliveryAddressRequest,
  OrderHRequest,
} from "./orders.types.js";
import { success } from "zod";

export async function orderController(
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

  const body = await c.req.json<OrderHRequest>();
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
      await order(
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

export async function orderDeliveryAddressController(c: Context) {
  try {
    const customer = c.get("customer") as
      | {
          RowID: number;
        }
      | undefined;

    if (!customer?.RowID) {
      return c.json(
        {
          success: false,
          message: "احراز هویت مشتری انجام نشده است.",
        },
        401,
      );
    }

    const body =
      await c.req.json<OrderDeliveryAddressRequest>().catch(() => null);

    if (!body) {
      return c.json(
        {
          success: false,
          message: "اطلاعات درخواست نامعتبر است.",
        },
        400,
      );
    }

    const result = await orderDeliveryAddress(
      customer.RowID,
      body,
    );

    return c.json(
      {
        success: true,
        message: "آدرس تحویل با موفقیت ثبت شد.",
        data: result,
      },
      200,
    );
  } catch (error) {
    console.error("Order delivery address error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "خطا در ثبت آدرس تحویل.";

    return c.json(
      {
        success: false,
        message,
      },
      400,
    );
  }
}
