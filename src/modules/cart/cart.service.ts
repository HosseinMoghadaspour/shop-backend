import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import type {
  CartItem,
  CartItemResponse,
  CartResponse,
  RedisCart,
} from "./cart.types.js";

const CART_TTL_SECONDS = 60 * 60 * 24 * 30;

function cartKey(personId: number) {
  return `cart:customer:${personId}`;
}

async function getRawCart(personId: number): Promise<RedisCart> {
  const raw = await redis.get(cartKey(personId));

  if (!raw) {
    return {
      personId,
      items: [],
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    const cart = JSON.parse(raw) as RedisCart;

    if (
      !cart ||
      cart.personId !== personId ||
      !Array.isArray(cart.items)
    ) {
      return {
        personId,
        items: [],
        updatedAt: new Date().toISOString(),
      };
    }

    return cart;
  } catch {
    await redis.del(cartKey(personId));

    return {
      personId,
      items: [],
      updatedAt: new Date().toISOString(),
    };
  }
}

async function saveCart(cart: RedisCart) {
  cart.updatedAt = new Date().toISOString();

  await redis.set(
    cartKey(cart.personId),
    JSON.stringify(cart),
    {
      EX: CART_TTL_SECONDS,
    },
  );
}

async function getGood(goodId: number) {
  return prisma.good.findFirst({
    where: {
      RowID: goodId,
      IsActive: true,
      IsShowInOnlineShop: true,
    },

    select: {
      RowID: true,
      RowCode: true,
      RowName: true,

      SalePrice: true,
      DiscountPrice: true,

      MinOrderSite: true,
      MaxOrderSite: true,

      IsActive: true,
      IsShowInOnlineShop: true,

      IMG_1: true,

      GoodImagesWeb: {
        where: {
          DefaultImage: true,
        },
        select: {
          ImageUrl: true,
        },
        take: 1,
      },
    },
  });
}

function getGoodPrice(good: {
  SalePrice: number;
  DiscountPrice: number | null;
}) {
  if (
    good.DiscountPrice !== null &&
    good.DiscountPrice > 0 &&
    good.DiscountPrice < good.SalePrice
  ) {
    return good.DiscountPrice;
  }

  return good.SalePrice;
}

function validateQuantity(
  quantity: number,
  good: {
    MinOrderSite: unknown;
    MaxOrderSite: unknown;
  },
) {
  if (!Number.isFinite(quantity)) {
    throw new Error("تعداد محصول نامعتبر است.");
  }

  if (quantity <= 0) {
    throw new Error("تعداد محصول باید بیشتر از صفر باشد.");
  }

  if (
    good.MinOrderSite !== null &&
    Number(good.MinOrderSite) > 0 &&
    quantity < Number(good.MinOrderSite)
  ) {
    throw new Error(
      `حداقل تعداد سفارش این محصول ${Number(
        good.MinOrderSite,
      )} است.`,
    );
  }

  if (
    good.MaxOrderSite !== null &&
    Number(good.MaxOrderSite) > 0 &&
    quantity > Number(good.MaxOrderSite)
  ) {
    throw new Error(
      `حداکثر تعداد سفارش این محصول ${Number(
        good.MaxOrderSite,
      )} است.`,
    );
  }
}

async function buildCartResponse(
  cart: RedisCart,
): Promise<CartResponse> {
  if (cart.items.length === 0) {
    return {
      personId: cart.personId,
      items: [],
      itemsCount: 0,
      totalQuantity: 0,
      subtotal: 0,
    };
  }

  const goodIds = cart.items.map((item) => item.goodId);

  const goods = await prisma.good.findMany({
    where: {
      RowID: {
        in: goodIds,
      },
    },

    select: {
      RowID: true,
      RowCode: true,
      RowName: true,

      SalePrice: true,
      DiscountPrice: true,

      MinOrderSite: true,
      MaxOrderSite: true,

      IsActive: true,
      IsShowInOnlineShop: true,

      GoodImagesWeb: {
        where: {
          DefaultImage: true,
        },
        select: {
          ImageUrl: true,
        },
        take: 1,
      },
    },
  });

  const goodsMap = new Map(
    goods.map((good) => [good.RowID, good]),
  );

  const responseItems: CartItemResponse[] = [];

  for (const item of cart.items) {
    const good = goodsMap.get(item.goodId);

    /*
     * Product may have been deleted/deactivated
     * after being added to cart.
     */
    if (
      !good ||
      !good.IsActive ||
      !good.IsShowInOnlineShop
    ) {
      continue;
    }

    const unitPrice = getGoodPrice(good);

    responseItems.push({
      goodId: good.RowID,
      rowCode: good.RowCode,
      rowName: good.RowName,

      imageUrl:
        good.GoodImagesWeb[0]?.ImageUrl ?? null,

      quantity: item.quantity,

      unitPrice,

      totalPrice:
        unitPrice * item.quantity,

      minOrder:
        good.MinOrderSite === null
          ? null
          : Number(good.MinOrderSite),

      maxOrder:
        good.MaxOrderSite === null
          ? null
          : Number(good.MaxOrderSite),

      isActive: good.IsActive,
      isShowInOnlineShop:
        good.IsShowInOnlineShop,
    });
  }

  const subtotal = responseItems.reduce(
    (sum, item) => sum + item.totalPrice,
    0,
  );

  const totalQuantity = responseItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  return {
    personId: cart.personId,

    items: responseItems,

    itemsCount: responseItems.length,

    totalQuantity,

    subtotal,
  };
}

export async function getCart(personId: number) {
  const cart = await getRawCart(personId);

  return buildCartResponse(cart);
}

export async function addToCart(
  personId: number,
  goodId: number,
  quantity: number,
) {
  if (!Number.isInteger(goodId) || goodId <= 0) {
    throw new Error("شناسه محصول نامعتبر است.");
  }

  const good = await getGood(goodId);

  if (!good) {
    throw new Error(
      "محصول وجود ندارد یا در فروشگاه فعال نیست.",
    );
  }

  const cart = await getRawCart(personId);

  const existingItem = cart.items.find(
    (item) => item.goodId === goodId,
  );

  const newQuantity =
    (existingItem?.quantity ?? 0) + quantity;

  validateQuantity(newQuantity, good);

  if (existingItem) {
    existingItem.quantity = newQuantity;
  } else {
    cart.items.push({
      goodId,
      quantity,
      addedAt: new Date().toISOString(),
    });
  }

  await saveCart(cart);

  return buildCartResponse(cart);
}

export async function updateCartItem(
  personId: number,
  goodId: number,
  quantity: number,
) {
  const good = await getGood(goodId);

  if (!good) {
    throw new Error(
      "محصول وجود ندارد یا در فروشگاه فعال نیست.",
    );
  }

  validateQuantity(quantity, good);

  const cart = await getRawCart(personId);

  const item = cart.items.find(
    (item) => item.goodId === goodId,
  );

  if (!item) {
    throw new Error(
      "این محصول در سبد خرید وجود ندارد.",
    );
  }

  item.quantity = quantity;

  await saveCart(cart);

  return buildCartResponse(cart);
}

export async function removeFromCart(
  personId: number,
  goodId: number,
) {
  const cart = await getRawCart(personId);

  cart.items = cart.items.filter(
    (item) => item.goodId !== goodId,
  );

  await saveCart(cart);

  return buildCartResponse(cart);
}

export async function clearCart(personId: number) {
  await redis.del(cartKey(personId));

  return {
    personId,
    items: [],
    itemsCount: 0,
    totalQuantity: 0,
    subtotal: 0,
  };
}