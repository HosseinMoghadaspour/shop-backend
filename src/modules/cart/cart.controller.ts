import type { Context } from "hono";

import {
  addToCart,
  clearCart,
  getCart,
  removeFromCart,
  updateCartItem,
} from "./cart.service.js";

function getCustomerId(c: Context) {
  const customer = c.get("customer") as
    | { RowID: number }
    | undefined;

  if (!customer?.RowID) {
    throw new Error("Customer authentication is required.");
  }

  return customer.RowID;
}

function parsePositiveNumber(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

  return number;
}

export async function getMyCart(c: Context) {
  const personId = getCustomerId(c);

  const cart = await getCart(personId);

  return c.json({
    success: true,
    cart,
  });
}

export async function addItem(c: Context) {
  const personId = getCustomerId(c);

  const body = await c.req
    .json<{
      goodId?: number;
      quantity?: number;
    }>()
    .catch(() => ({
      goodId: undefined,
      quantity: undefined,
    }));

  const goodId = Number(body.goodId);
  const quantity = parsePositiveNumber(body.quantity);

  if (
    !Number.isInteger(goodId) ||
    goodId <= 0
  ) {
    return c.json(
      {
        success: false,
        message: "شناسه محصول نامعتبر است.",
      },
      400,
    );
  }

  if (quantity === null) {
    return c.json(
      {
        success: false,
        message: "تعداد محصول نامعتبر است.",
      },
      400,
    );
  }

  try {
    const cart = await addToCart(
      personId,
      goodId,
      quantity,
    );

    return c.json({
      success: true,
      message: "محصول به سبد خرید اضافه شد.",
      cart,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "خطا در افزودن محصول.",
      },
      400,
    );
  }
}

export async function updateItem(c: Context) {
  const personId = getCustomerId(c);

  const goodId = Number(
    c.req.param("goodId"),
  );

  if (!Number.isInteger(goodId) || goodId <= 0) {
    return c.json(
      {
        success: false,
        message: "شناسه محصول نامعتبر است.",
      },
      400,
    );
  }

  const body = await c.req
    .json<{
      quantity?: number;
    }>()
    .catch(() => ({
      quantity: undefined,
    }));

  const quantity = parsePositiveNumber(
    body.quantity,
  );

  if (quantity === null) {
    return c.json(
      {
        success: false,
        message: "تعداد محصول نامعتبر است.",
      },
      400,
    );
  }

  try {
    const cart = await updateCartItem(
      personId,
      goodId,
      quantity,
    );

    return c.json({
      success: true,
      message: "تعداد محصول بروزرسانی شد.",
      cart,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "خطا در بروزرسانی سبد خرید.",
      },
      400,
    );
  }
}

export async function removeItem(c: Context) {
  const personId = getCustomerId(c);

  const goodId = Number(
    c.req.param("goodId"),
  );

  if (!Number.isInteger(goodId) || goodId <= 0) {
    return c.json(
      {
        success: false,
        message: "شناسه محصول نامعتبر است.",
      },
      400,
    );
  }

  const cart = await removeFromCart(
    personId,
    goodId,
  );

  return c.json({
    success: true,
    message: "محصول از سبد خرید حذف شد.",
    cart,
  });
}

export async function clearMyCart(c: Context) {
  const personId = getCustomerId(c);

  const cart = await clearCart(personId);

  return c.json({
    success: true,
    message: "سبد خرید خالی شد.",
    cart,
  });
}