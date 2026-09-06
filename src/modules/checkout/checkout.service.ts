import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";

import type {
  CartItem,
  RedisCart,
} from "../cart/cart.types.js";

import type {
  CheckoutRequest,
  CheckoutResponse,
} from "./checkout.types.js";

const CART_TTL_SECONDS = 60 * 60 * 24 * 30;

function cartKey(personId: number) {
  return `cart:customer:${personId}`;
}

/**
 * Get cart directly from Redis.
 */
async function getCart(
  personId: number,
): Promise<RedisCart | null> {
  const raw = await redis.get(
    cartKey(personId),
  );

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as RedisCart;
  } catch {
    return null;
  }
}

/**
 * Delete cart after successful checkout.
 */
async function clearCart(
  personId: number,
) {
  await redis.del(cartKey(personId));
}

/**
 * Get current product price.
 *
 * DiscountPrice is used only when:
 * - exists
 * - greater than zero
 * - lower than SalePrice
 */
function getProductPrice(good: {
  SalePrice: number;
  DiscountPrice: number | null;
}) {
  const salePrice = Number(
    good.SalePrice ?? 0,
  );

  const discountPrice =
    good.DiscountPrice !== null
      ? Number(good.DiscountPrice)
      : 0;

  if (
    discountPrice > 0 &&
    discountPrice < salePrice
  ) {
    return discountPrice;
  }

  return salePrice;
}

/**
 * Validate requested quantity.
 */
function validateQuantity(
  quantity: number,
  minOrder: number | null,
  maxOrder: number | null,
) {
  if (
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    throw new Error(
      "تعداد محصول نامعتبر است.",
    );
  }

  if (
    minOrder !== null &&
    quantity < minOrder
  ) {
    throw new Error(
      `حداقل تعداد قابل سفارش ${minOrder} است.`,
    );
  }

  if (
    maxOrder !== null &&
    quantity > maxOrder
  ) {
    throw new Error(
      `حداکثر تعداد قابل سفارش ${maxOrder} است.`,
    );
  }
}

/**
 * Get next document number.
 *
 * IMPORTANT:
 * This is intentionally kept separate because
 * the correct numbering strategy depends on the
 * ERP/database business rules.
 */
async function getNextDocNo(
  tx: any,
  financialYearId: number,
  fixWhDocType2Id: number,
) {
  const lastDocument =
    await tx.whDocH.findFirst({
      where: {
        FinancialYear_ID:
          financialYearId,

        Fix_WhDocType2_ID:
          fixWhDocType2Id,
      },

      orderBy: {
        DocNo: "desc",
      },

      select: {
        DocNo: true,
      },
    });

  return BigInt(
    lastDocument
      ? Number(lastDocument.DocNo) + 1
      : 1,
  );
}

/**
 * Checkout cart.
 */
export async function checkout(
  personId: number,
  data: CheckoutRequest,
): Promise<CheckoutResponse> {
  if (!personId) {
    throw new Error(
      "شناسه مشتری نامعتبر است.",
    );
  }

  if (
    !Number.isInteger(
      data.financialYearId,
    ) ||
    data.financialYearId <= 0
  ) {
    throw new Error(
      "سال مالی نامعتبر است.",
    );
  }

  if (
    !Number.isInteger(
      data.warehouseId,
    ) ||
    data.warehouseId <= 0
  ) {
    throw new Error(
      "انبار نامعتبر است.",
    );
  }

  if (
    !Number.isInteger(
      data.fixWhDocType1Id,
    ) ||
    data.fixWhDocType1Id <= 0
  ) {
    throw new Error(
      "نوع سند انبار نامعتبر است.",
    );
  }

  if (
    !Number.isInteger(
      data.fixWhDocType2Id,
    ) ||
    data.fixWhDocType2Id <= 0
  ) {
    throw new Error(
      "نوع دوم سند انبار نامعتبر است.",
    );
  }

  /**
   * Make sure customer exists and is active.
   */
  const customer =
    await prisma.person.findFirst({
      where: {
        RowID: personId,
        IsActive: true,
      },

      select: {
        RowID: true,
        MobileNumber: true,
      },
    });

  if (!customer) {
    throw new Error(
      "مشتری پیدا نشد یا غیرفعال است.",
    );
  }

  /**
   * Read cart.
   */
  const cart = await getCart(personId);

  if (
    !cart ||
    !cart.items ||
    cart.items.length === 0
  ) {
    throw new Error(
      "سبد خرید خالی است.",
    );
  }

  /**
   * Prevent duplicate Good IDs.
   */
  const uniqueItems = new Map<
    number,
    CartItem
  >();

  for (const item of cart.items) {
    if (
      !Number.isInteger(item.goodId) ||
      item.goodId <= 0
    ) {
      throw new Error(
        "محصول نامعتبر در سبد خرید وجود دارد.",
      );
    }

    const existing =
      uniqueItems.get(item.goodId);

    if (existing) {
      existing.quantity += item.quantity;
    } else {
      uniqueItems.set(
        item.goodId,
        {
          ...item,
        },
      );
    }
  }

  const items = [...uniqueItems.values()];

  /**
   * Get products from database.
   *
   * NEVER trust price stored in Redis.
   */
  const goods =
    await prisma.good.findMany({
      where: {
        RowID: {
          in: items.map(
            (item) => item.goodId,
          ),
        },

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
      },
    });

  /**
   * Make lookup map.
   */
  const goodsMap = new Map(
    goods.map((good) => [
      good.RowID,
      good,
    ]),
  );

  /**
   * Validate every cart item.
   */
  const checkoutItems: Array<{
    goodId: number;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }> = [];

  let totalPrice = 0;

  for (const item of items) {
    const good = goodsMap.get(
      item.goodId,
    );

    if (!good) {
      throw new Error(
        `محصول ${item.goodId} دیگر قابل سفارش نیست.`,
      );
    }

    const minOrder =
      good.MinOrderSite !== null
        ? Number(good.MinOrderSite)
        : null;

    const maxOrder =
      good.MaxOrderSite !== null
        ? Number(good.MaxOrderSite)
        : null;

    validateQuantity(
      item.quantity,
      minOrder,
      maxOrder,
    );

    const unitPrice =
      getProductPrice(good);

    if (
      !Number.isFinite(unitPrice) ||
      unitPrice < 0
    ) {
      throw new Error(
        `قیمت محصول ${good.RowName} نامعتبر است.`,
      );
    }

    const itemTotal =
      unitPrice * item.quantity;

    checkoutItems.push({
      goodId: good.RowID,
      quantity: item.quantity,
      unitPrice,
      totalPrice: itemTotal,
    });

    totalPrice += itemTotal;
  }

  /**
   * At this stage we have:
   *
   * totalPrice
   * discount = 0
   * tax = 0
   * payable = totalPrice
   *
   * Later we can plug the project's
   * pricing/tax engine here.
   */
  const discountPrice = 0;
  const taxPrice = 0;

  const payablePrice =
    totalPrice -
    discountPrice +
    taxPrice;

  /**
   * Create WhDocH + WhDocD
   * in ONE transaction.
   */
  const result =
    await prisma.$transaction(
      async (tx) => {
        /**
         * Generate document number.
         */
        const docNo =
          await getNextDocNo(
            tx,
            data.financialYearId,
            data.fixWhDocType2Id,
          );

        /**
         * Create document header.
         */
        const whDocH =
          await tx.whDocH.create({
            data: {
              Branch_ID:
                data.branchId ?? null,

              FinancialYear_ID:
                data.financialYearId,

              /**
               * Default status from DB schema.
               */
              Fix_RecordStatusType_ID: 1,

              Fix_WhDocType1_ID:
                data.fixWhDocType1Id,

              Fix_WhDocType2_ID:
                data.fixWhDocType2Id,

              Warehouse_ID:
                data.warehouseId,

              Person_ID:
                personId,

              DocNo: docNo,

              /**
               * TODO:
               * Replace with Jalali date from
               * the project's date utility.
               */
              FDate:
                new Date()
                  .toISOString()
                  .slice(0, 10),

              MDate: new Date(),

              DiscountPercent: 0,

              DiscountPrice:
                discountPrice,

              TaxPercent: 0,

              TaxPrice:
                taxPrice,

              TotalPrice:
                totalPrice,

              PayablePrice:
                payablePrice,

              TotalDiscountPriceItems:
                discountPrice,

              TotalTaxPriceItems:
                taxPrice,

              DefinedBySystem: false,

              IsSettled: false,

              IsSend: 0,

              DeliveryType_ID:
                data.deliveryTypeId ??
                null,

              CustomerAddress:
                data.customerAddress ??
                null,

              RowDesc:
                data.rowDesc ?? null,

              InsertServerDateTime:
                new Date(),
            },

            select: {
              RowID: true,
              DocNo: true,
            },
          });

        /**
         * Create WhDocD rows.
         */
        await tx.whDocD.createMany({
          data: checkoutItems.map(
            (item, index) => ({
              Branch_ID:
                data.branchId ?? null,

              FinancialYear_ID:
                data.financialYearId,

              WhDocH_ID:
                whDocH.RowID,

              Good_ID:
                item.goodId,

              /**
               * Since this is a sale/outgoing
               * document, OutputValue is used.
               */
              InputValue: 0,

              CalculatedInputValue: 0,

              OutputValue:
                item.quantity,

              CalculatedOutputValue:
                item.quantity,

              UnitPrice:
                item.unitPrice,

              TotalPrice:
                item.totalPrice,

              SaleUnitPrice:
                item.unitPrice,

              UnitPriceFinal:
                item.unitPrice,

              FinalSaleUnitPrice:
                item.unitPrice,

              DiscountPercent: 0,

              DiscountPrice: 0,

              TaxPercent: 0,

              TaxPrice: 0,

              SortInDocH:
                BigInt(index + 1),

              IsSend: 0,
            }),
          ),
        });

        return {
          whDocHId:
            whDocH.RowID,

          docNo:
            Number(whDocH.DocNo),
        };
      },
    );

  /**
   * Only clear cart AFTER the database
   * transaction has successfully committed.
   */
  await clearCart(personId);

  return {
    whDocHId:
      result.whDocHId,

    docNo:
      result.docNo,

    personId,

    totalPrice,

    discountPrice,

    taxPrice,

    payablePrice,

    items: checkoutItems,
  };
}
