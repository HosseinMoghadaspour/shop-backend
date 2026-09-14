import { Prisma } from "../../generated/prisma/client.js";
import { MeasureUnitScalarFieldEnum } from "../../generated/prisma/internal/prismaNamespace.js";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";

import type {
  CartItem,
  RedisCart,
} from "../cart/cart.types.js";

import type {
  OrderHRequest,
  OrderResponse,
  OrderItemResponse,
  OrderDeliveryAddressRequest,
} from "./orders.types.js";

function cartKey(personId: number): string {
  return `cart:customer:${personId}`;
}


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
    // اگر JSON خراب باشد
    await redis.del(cartKey(personId));

    return null;
  }
}


async function clearCart(
  personId: number,
): Promise<void> {
  await redis.del(cartKey(personId));
}


function getJalaliDate(): string {
  return new Intl.DateTimeFormat(
    "fa-IR-u-nu-latn",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  )
    .format(new Date())
    .replaceAll("-", "/");
}


function getCurrentTime(): string {
  return new Date()
    .toTimeString()
    .slice(0, 5);
}


function getCurrentDateTime(): string {
  return new Date()
    .toISOString()
    .replace("T", " ")
    .split(".")[0]
    .replaceAll("-", "/");
}


function getProductPrice(good: {
  SalePrice: number;
  DiscountPrice: number | null;
}): number {
  const salePrice =
    Number(good.SalePrice ?? 0);

  const discountPrice =
    Number(good.DiscountPrice ?? 0);

  if (
    discountPrice > 0 &&
    discountPrice < salePrice
  ) {
    return discountPrice;
  }

  return salePrice;
}


function validateQuantity(
  quantity: number,
  minOrder: number | null,
  maxOrder: number | null,
): void {
  if (
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    throw new Error(
      "تعداد محصول نامعتبر است",
    );
  }

  if (!Number.isInteger(quantity)) {
    throw new Error(
      "تعداد محصول باید عدد صحیح باشد",
    );
  }

  if (
    minOrder !== null &&
    quantity < minOrder
  ) {
    throw new Error(
      `حداقل تعداد قابل سفارش ${minOrder} است`,
    );
  }

  if (
    maxOrder !== null &&
    quantity > maxOrder
  ) {
    throw new Error(
      `حداکثر تعداد قابل سفارش ${maxOrder} است`,
    );
  }
}


async function getNextDocNo(
  tx: Prisma.TransactionClient,
): Promise<bigint> {
  const lastOrder =
    await tx.orderH.findFirst({
      orderBy: {
        DocNo: "desc",
      },

      select: {
        DocNo: true,
      },
    });

  return lastOrder
    ? BigInt(lastOrder.DocNo) + 1n
    : 1n;
}


export async function createOrderDelivery(
  tx: Prisma.TransactionClient,
  customerId: number,
  data: OrderDeliveryAddressRequest,
) {
  // ---------------------------------------
  // Validation
  // ---------------------------------------

  if (
    !Number.isInteger(customerId) ||
    customerId <= 0
  ) {
    throw new Error(
      "شناسه مشتری نامعتبر است.",
    );
  }

  if (
    !Number.isInteger(data.provinceId) ||
    data.provinceId <= 0
  ) {
    throw new Error(
      "استان الزامی است.",
    );
  }

  if (
    !data.deliverToName?.trim()
  ) {
    throw new Error(
      "نام تحویل گیرنده الزامی است.",
    );
  }

  if (
    !data.deliverToMobileNumber?.trim()
  ) {
    throw new Error(
      "شماره موبایل تحویل گیرنده الزامی است.",
    );
  }

  if (
    !data.City?.trim()
  ) {
    throw new Error(
      "شهر الزامی است.",
    );
  }

  if (
    !data.Adrs?.trim()
  ) {
    throw new Error(
      "آدرس الزامی است.",
    );
  }

  // ---------------------------------------
  // Create Delivery Address
  // ---------------------------------------

  const delivery =
    await tx.orderDeliveryAddress.create({
      data: {

        /*
         * چون Prisma فیلد Person_ID را
         * به صورت مستقیم برای create قبول نمی‌کند،
         * از relation استفاده می‌کنیم.
         */
        Person: {
          connect: {
            RowID: customerId,
          },
        },

        /*
         * برای Province هم اگر Prisma همین
         * ساختار relation را دارد، باید connect کنیم.
         *
         * اگر Province_ID در مدل create قابل قبول بود،
         * همین قسمت را نگه دار.
         */
        Province: {
          connect: {
            RowID: data.provinceId,
          },
        },

        DeliverToName:
          data.deliverToName.trim(),

        DeliverToMobileNumber:
          data.deliverToMobileNumber.trim(),

        DeliverToPhoneNumber:
          data.deliverToPhoneNumber?.trim() ||
          null,

        City:
          data.City.trim(),

        Adrs:
          data.Adrs.trim(),

        PostalCode:
          data.PostalCode?.trim() ||
          null,

        RowDesc:
          data.RowDesc?.trim() ||
          null,

        FDateInsert:
          data.FDateInset,

        FTimeInsert:
          data.FTimeInsert,
      },

      select: {
        RowID: true,
      },
    });

  return delivery;
}




export async function order(
  personId: number,
  data: OrderHRequest,
): Promise<OrderResponse> {


  if (
    !Number.isInteger(personId) ||
    personId <= 0
  ) {
    throw new Error(
      "شناسه مشتری نامعتبر است",
    );
  }

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
      "مشتری پیدا نشد یا غیر فعال است",
    );
  }

 
  if (!data.deliveryAddress) {
    throw new Error(
      "اطلاعات آدرس تحویل وارد نشده است.",
    );
  }

 
  const cart =
    await getCart(personId);

  if (
    !cart ||
    !Array.isArray(cart.items) ||
    cart.items.length === 0
  ) {
    throw new Error(
      "سبد خرید خالی است",
    );
  }

  const uniqueItems =
    new Map<number, CartItem>();

  for (const item of cart.items) {

    if (
      !Number.isInteger(item.goodId) ||
      item.goodId <= 0
    ) {
      throw new Error(
        "محصول نامعتبر در سبد خرید وجود دارد",
      );
    }

    if (
      !Number.isFinite(item.quantity) ||
      item.quantity <= 0
    ) {
      throw new Error(
        "تعداد محصول در سبد خرید نامعتبر است",
      );
    }

    if (
      !Number.isInteger(item.quantity)
    ) {
      throw new Error(
        "تعداد محصول باید عدد صحیح باشد",
      );
    }

    const existing =
      uniqueItems.get(
        item.goodId,
      );

    if (existing) {
      existing.quantity +=
        item.quantity;
    } else {
      uniqueItems.set(
        item.goodId,
        {
          ...item,
        },
      );
    }
  }

  const items =
    Array.from(
      uniqueItems.values(),
    );

  
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
        Main_MeasureUnit_ID: true,
        Default_MeasureUnit_ID: true
      },
    });

 
  const goodsMap =
    new Map(
      goods.map(
        (good) => [
          Number(good.RowID),
          good,
        ],
      ),
    );

  
  const orderItems: OrderItemResponse[] =
    [];

  let totalPrice = 0;

  for (const item of items) {

    const good =
      goodsMap.get(item.goodId);

    if (!good) {
      throw new Error(
        `محصول با شناسه ${item.goodId} پیدا نشد یا غیر فعال است`,
      );
    }

    const minOrder =
      good.MinOrderSite !== null
        ? Number(
            good.MinOrderSite,
          )
        : null;

    const maxOrder =
      good.MaxOrderSite !== null
        ? Number(
            good.MaxOrderSite,
          )
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
        `قیمت محصول ${good.RowName} نامعتبر است`,
      );
    }

    const itemTotalPrice =
      unitPrice *
      item.quantity;

    totalPrice +=
      itemTotalPrice;

    orderItems.push({
      goodId:
        Number(good.RowID),

      goodCode:
        good.RowCode,

      goodName:
        good.RowName,

      quantity:
        item.quantity,

      unitPrice:
        unitPrice,

      mainMeasureUnitId: good.Main_MeasureUnit_ID || 0,
      defaultMeasureUnitId: good.Default_MeasureUnit_ID || 0,

      discountPrice:
        Number(
          good.DiscountPrice ?? 0,
        ),

      totalPrice:
        itemTotalPrice,
    });
  }

  const discountPrice = 0;

  const taxPrice = 0;

  const payablePrice =
    totalPrice -
    discountPrice +
    taxPrice;

  const appSetting =
    await prisma.appSettings.findFirst({
      select: {
        Branch_ID: true,
        FinancialYear_ID: true,
      },
    });

  const branchId =
    appSetting?.Branch_ID ?? 1;

  const financialYearId =
    appSetting?.FinancialYear_ID ?? 2;

 
  const orderResponse =
    await prisma.$transaction(
      async (tx) => {

    
        const delivery =
          await createOrderDelivery(
            tx,
            customer.RowID,
            data.deliveryAddress,
          );

        const docNo =
          await getNextDocNo(tx);

       const orderH = await tx.orderH.create({
  data: {
    DocNo: docNo,

    Person_ID: customer.RowID,

    OrderDeliveryAddress_ID: delivery.RowID,

    MDate: new Date(),

    FDate: getJalaliDate(),

    FDateInsert: getJalaliDate(),

    FTimeInsert: getCurrentTime(),

    TotalPrice: totalPrice,

    FinancialYear_ID: financialYearId,

    TotalDiscountPriceItems: 0,

    TotalTaxPriceItems: 0,

    TotalIncreasePrice: 1,

    TotalDecreasePrice: 0,

    ShippingCost: 0,

    OrderStatus: true,

    Branch_ID: branchId,

    DiscountPercent: 0,

    DiscountPrice: discountPrice,

    TaxPercent: 0,

    TaxPrice: taxPrice,

    PayablePrice: payablePrice,

    IsOnlineOrder: true,

    Fix_DiscountType_ID: 1,
  },

  select: {
    RowID: true,
    DocNo: true,
    Person_ID: true,
    OrderDeliveryAddress_ID: true,
  },
});

 
        await tx.orderD.createMany({
          data:
            orderItems.map(
              (item) => ({
                Branch_ID:
                  branchId,

                FinancialYear_ID:
                  financialYearId,

                OrderH_ID:
                  orderH.RowID,

                Good_ID:
                  item.goodId,

                InputValue:
                  0,

                CalculatedInputValue:
                  0,

                OutputValue:
                  item.quantity,

                CalculatedOutputValue:
                  item.quantity,

                UnitPrice:
                  item.unitPrice,

                TotalPrice:
                  item.totalPrice,
                DiscountPrice: 0,
                DiscountPercent:0,
                PurchaseUnitPrice: item.unitPrice,
                PurchaseTotalPrice: item.totalPrice,
                TaxPercent:0,
                TaxPrice: 0,
                SaleUnitPrice: item.unitPrice,
                MeasureUnit_ID : item.defaultMeasureUnitId,
                Main_MeasureUnit_ID : item.mainMeasureUnitId,
                Fix_DiscountType_ID:2
              }),
            ),
        });


        return {
          orderHId:
            Number(
              orderH.RowID,
            ),

          docNo:
            Number(
              orderH.DocNo,
            ),

          personId:
            customer.RowID,

          deliveryAddressId:
            Number(
              delivery.RowID,
            ),

          totalPrice,

          discountPrice,

          taxPrice,

          payablePrice,

          items:
            orderItems,
        };
      },
    );

  await clearCart(personId);

  return orderResponse;
}
