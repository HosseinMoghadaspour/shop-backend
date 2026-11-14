import { randomUUID } from "node:crypto";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { resolveProductPricing } from "../pricing/price.service.js";

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


export class OrderInProgressError extends Error {
  constructor() {
    super("درخواست ثبت سفارش شما در حال پردازش است. لطفاً چند لحظه صبر کنید.");
    this.name = "OrderInProgressError";
  }
}

async function withCustomerOrderLock<T>(
  personId: number,
  callback: () => Promise<T>,
): Promise<T> {
  const lockKey = `order:lock:customer:${personId}`;
  const lockToken = randomUUID();

  // فقط یک درخواست برای هر مشتری اجازه ورود دارد.
  const acquired = await redis.set(
    lockKey,
    lockToken,
    {
      NX: true,
      EX: 300,
    },
  );

  if (acquired !== "OK") {
    throw new OrderInProgressError();
  }

  try {
    return await callback();
  } finally {
    // فقط مالک قفل اجازه آزادکردن آن را دارد.
    try {
      await redis.eval(
        `
          if redis.call("GET", KEYS[1]) == ARGV[1] then
            return redis.call("DEL", KEYS[1])
          else
            return 0
          end
        `,
        {
          keys: [lockKey],
          arguments: [lockToken],
        },
      );
    } catch (error) {
      console.error("Failed to release order lock:", error);
      // اگر آزادسازی شکست بخورد، قفل حداکثر پس از ۵ دقیقه منقضی می‌شود.
    }
  }
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

function validateQuantity(
  quantity: number,
  minOrder: number | null,
  maxOrder: number | null,
  goodId: number,
): void {
  if (
    !Number.isFinite(quantity)
  ) {
    throw new Error(
      `مقدار کالای ${goodId} نامعتبر است.`,
    );
  }

  // حداقل مقدار سفارش فروشگاه
  if (quantity < 0.5) {
    throw new Error(
      `حداقل مقدار سفارش کالای ${goodId} برابر 0.5 است.`,
    );
  }

  // مقدار باید مضرب 0.5 باشد
  const isHalfStep =
    Math.abs(
      quantity * 2 -
        Math.round(quantity * 2),
    ) < 0.000001;

  if (!isHalfStep) {
    throw new Error(
      `مقدار کالای ${goodId} باید با گام 0.5 باشد.`,
    );
  }

  // حداقل مقدار تعریف‌شده برای محصول
  if (
    minOrder !== null &&
    quantity < minOrder
  ) {
    throw new Error(
      `حداقل مقدار سفارش این کالا ${minOrder} است.`,
    );
  }

  // حداکثر مقدار تعریف‌شده برای محصول
  if (
    maxOrder !== null &&
    quantity > maxOrder
  ) {
    throw new Error(
      `حداکثر مقدار سفارش این کالا ${maxOrder} است.`,
    );
  }
}

async function getNextDocNo(
  tx: Prisma.TransactionClient,
): Promise<bigint> {
  const result = await tx.$queryRaw<
    { NextDocNo: bigint }[]
  >`
    SELECT
      ISNULL(MAX(DocNo), 0) + 1 AS NextDocNo
    FROM dbo.OrderH WITH (UPDLOCK, HOLDLOCK)
  `;

  return result[0]?.NextDocNo ?? 1n;
}

async function getNextDocNoWhDocH(
  tx: Prisma.TransactionClient,
): Promise<bigint> {
  const result = await tx.$queryRaw<
    { NextDocNo: bigint }[]
  >`
    SELECT
      ISNULL(MAX(DocNo), 0) + 1 AS NextDocNo
    FROM dbo.WhDocH WITH (UPDLOCK, HOLDLOCK)
  `;

  return result[0]?.NextDocNo ?? 1n;
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
    !Number.isInteger(data.cityId) ||
    data.cityId <= 0
  ) {
    throw new Error(
      "شهر الزامی است.",
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
    !data.Adrs?.trim()
  ) {
    throw new Error(
      "آدرس الزامی است.",
    );
  }

  // ---------------------------------------
  // Get City + County + Province
  // ---------------------------------------

  const city = await tx.city.findFirst({
    where: {
      RowID: BigInt(data.cityId),
      IsActive: true,
    },
    select: {
      RowID: true,
      RowName: true,

      County: {
        select: {
          RowID: true,
          Province_ID: true,

          Province: {
            select: {
              RowID: true,
              RowName: true,
            },
          },
        },
      },
    },
  });

  if (!city) {
    throw new Error(
      "شهر انتخاب‌شده معتبر نیست.",
    );
  }

  if (!city.County) {
    throw new Error(
      "شهر انتخاب‌شده شهرستان معتبری ندارد.",
    );
  }

  if (!city.County.Province) {
    throw new Error(
      "شهر انتخاب‌شده استان معتبری ندارد.",
    );
  }

  // ---------------------------------------
  // Create Delivery Address
  // ---------------------------------------

  const delivery =
    await tx.orderDeliveryAddress.create({
      data: {
        // Customer
        Person: {
          connect: {
            RowID: customerId,
          },
        },

        // Province
        Province: {
          connect: {
            RowID: city.County.Province.RowID,
          },
        },

        // City
        City: {
          connect: {
            RowID: city.RowID,
          },
        },

        DeliverToName:
          data.deliverToName.trim(),

        DeliverToMobileNumber:
          data.deliverToMobileNumber.trim(),

        DeliverToPhoneNumber:
          data.deliverToPhoneNumber?.trim() ||
          null,

        Adrs:
          data.Adrs.trim(),

        PostalCode:
          data.PostalCode?.trim() ||
          null,

        RowDesc:
          data.RowDesc?.trim() ||
          null,

        FDateInsert:
          getJalaliDate(),

        FTimeInsert:
          getCurrentTime(),
      },

      select: {
        RowID: true,
      },
    });

  return delivery;
}


async function getOrCreateOrderDelivery(
  tx: Prisma.TransactionClient,
  customerId: number,
  data: OrderHRequest["deliveryAddress"],
) {
  // آدرس ذخیره‌شده
  if ("addressId" in data) {
    if (
      !Number.isInteger(data.addressId) ||
      data.addressId <= 0
    ) {
      throw new Error(
        "شناسه آدرس نامعتبر است.",
      );
    }

    const address =
      await tx.orderDeliveryAddress.findFirst({
        where: {
          RowID: BigInt(data.addressId),
          Person_ID: customerId,
          IsActive: true,
        },
        select: {
          RowID: true,
        },
      });

    if (!address) {
      throw new Error(
        "آدرس انتخاب‌شده پیدا نشد یا متعلق به شما نیست.",
      );
    }

    return address;
  }

  // آدرس جدید
  return createOrderDelivery(
    tx,
    customerId,
    data,
  );
}


const orderHeaderSelect = {
  RowID: true,
  DocNo: true,
  FDate: true,
  MDate: true,
  TotalPrice: true,
  DiscountPercent: true,
  DiscountPrice: true,
  PayablePrice: true,
  TaxPercent: true,
  TaxPrice:true,
  OrderStatus: true,
} satisfies Prisma.OrderHSelect;

const orderDetailSelect = {
  OrderH_ID: true,
  Good_ID: true,
  MeasureUnit_ID: true,
  OutputValue: true,
  UnitPrice: true,
  TotalPrice: true,
  PurchaseTotalPrice: true,
  PurchaseUnitPrice: true,

  good: {
    select: {
      RowID: true,
      RowCode: true,
      RowName: true,
      RowNameEN: true,
      RowNameAlias: true,
      SalePrice: true,
      DiscountPrice: true,
      IMG_1: true,
    },
  },
} satisfies Prisma.OrderDSelect;

function serializeOrderHeader<T extends { RowID: bigint; DocNo: bigint }>(
  order: T,
) {
  return {
    ...order,
    RowID: Number(order.RowID),
    DocNo: Number(order.DocNo),
  };
}

function serializeOrderDetail<
  T extends {
    OrderH_ID: bigint;
    good: {
      RowID: number;
    } | null;
  },
>(order: T) {
  const { good, ...orderDetail } = order;

  return {
    ...orderDetail,
    OrderH_ID: Number(order.OrderH_ID),
    Good: good
      ? {
          ...good,
          RowID: Number(good.RowID),
        }
      : null,
  };
}

export async function getOrderId(id: number, personId: number) {
  const order = await prisma.orderH.findFirst({
    where: {
      RowID: id,
      Person_ID: personId,
    },
    select: orderHeaderSelect,
  });

  if (!order) {
    return { orderH: null, orderD: [] };
  }

  const details = await prisma.orderD.findMany({
    where: {
      OrderH_ID: order.RowID,
      InputValue: 0,
    },
    select: orderDetailSelect,
  });

  return {
    orderH: serializeOrderHeader(order),
    orderD: details.map(serializeOrderDetail),
  };
}

export async function getOrderIdPerson(personId: number) {
  const orders = await prisma.orderH.findMany({
    where: { Person_ID: personId },
    orderBy: { RowID: "desc" },
    select: orderHeaderSelect,
  });

  const orderIds = orders.map((order) => order.RowID);
  const details = orderIds.length === 0
    ? []
    : await prisma.orderD.findMany({
        where: {
          OrderH_ID: { in: orderIds },
          InputValue: 0,
        },
        select: orderDetailSelect,
      });

  return {
    orderH: orders.map(serializeOrderHeader),
    orderD: details.map(serializeOrderDetail),
  };
}



async function checkStockForOrder(
  tx: Prisma.TransactionClient,
  warehouseId: number,
  financialYearId: number,
  items: Array<{
    goodId: number;
    quantity: number;
  }>,
): Promise<void> {
  const sortedItems = [...items].sort(
    (a, b) => a.goodId - b.goodId,
  );

  for (const item of sortedItems) {
    const stock = await tx.$queryRaw<
      { Qty: number }[]
    >`
      SELECT
        Qty
      FROM dbo.Stock WITH (UPDLOCK, HOLDLOCK)
      WHERE WarehouseID = ${warehouseId}
        AND GoodID = ${item.goodId}
        AND FinancialYear_ID = ${financialYearId}
    `;

    const availableStock = Number(
      stock[0]?.Qty ?? 0,
    );

    if (availableStock < item.quantity) {
      throw new Error(
        `موجودی کالای ${item.goodId} کافی نیست. موجودی فعلی: ${availableStock}`,
      );
    }

  }
}

async function createOrderInternal(
  personId: number,
  data: OrderHRequest,
  idempotencyKey: string,
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


  if (!Number.isSafeInteger(data.branchId) || data.branchId <= 0) {
    throw new Error("لطفاً شعبه موردنظر را انتخاب کنید.");
  }

  if (!data.deliveryAddress) {
    throw new Error(
      "اطلاعات آدرس تحویل وارد نشده است.",
    );
  }

  if (!Number.isInteger(data.paymentMethodId) || data.paymentMethodId <= 0) {
    throw new Error("لطفاً روش پرداخت را انتخاب کنید.");
  }

  const paymentMethod = await prisma.fix_OrderPaymentMethod.findFirst({
    where: { RowID: data.paymentMethodId, IsActive: true },
    select: { RowID: true, EnName: true },
  });

  if (!paymentMethod) {
    throw new Error("روش پرداخت انتخاب‌شده معتبر یا فعال نیست.");
  }

  const deliveryCityId = "addressId" in data.deliveryAddress
    ? (await prisma.orderDeliveryAddress.findFirst({
        where: {
          RowID: BigInt(data.deliveryAddress.addressId),
          Person_ID: customer.RowID,
          IsActive: true,
        },
        select: { City_ID: true },
      }))?.City_ID
    : data.deliveryAddress.cityId;

  if (deliveryCityId == null) {
    throw new Error("آدرس انتخاب‌شده معتبر نیست یا شهر آن مشخص نشده است.");
  }

  const branchConfigs = await prisma.$queryRaw<Array<{
    Branch_ID: number;
    City_ID: number;
    Warehouse_ID: number;
  }>>(Prisma.sql`
    SELECT config.Branch_ID, config.City_ID, config.Warehouse_ID
    FROM dbo.SiteBranchConfig config
    INNER JOIN dbo.Branch branch
      ON branch.RowID = config.Branch_ID AND branch.IsActive = 1
    INNER JOIN dbo.Warehouse warehouse
      ON warehouse.RowID = config.Warehouse_ID
      AND warehouse.Branch_ID = branch.RowID
      AND warehouse.IsActive = 1
    WHERE config.Branch_ID = ${data.branchId}
      AND config.IsActive = 1
      AND config.Warehouse_ID IS NOT NULL
  `);

  const branchConfig = branchConfigs[0];
  if (!branchConfig || Number(branchConfig.City_ID) !== Number(deliveryCityId)) {
    throw new Error("شعبه انتخاب‌شده برای شهر آدرس تحویل فعال نیست یا انبار فعالی ندارد.");
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
  ConsumerPrice: true,
  MinOrderSite: true,
  MaxOrderSite: true,

  Main_MeasureUnit_ID: true,
  Default_MeasureUnit_ID: true,

  MeasureUnit_Good_Default_MeasureUnit_IDToMeasureUnit: {
    select: {
      RowID: true,
      RowName: true,
      WeightOrAmount: true,
    },
  },
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
  good.RowID,
);


    const pricing = await resolveProductPricing(good);
    const unitPrice = pricing.finalPrice;

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
      unit: good
  .MeasureUnit_Good_Default_MeasureUnit_IDToMeasureUnit
  ? {
      id:
        good
          .MeasureUnit_Good_Default_MeasureUnit_IDToMeasureUnit
          .RowID,

      name:
        good
          .MeasureUnit_Good_Default_MeasureUnit_IDToMeasureUnit
          .RowName,

      weightOrAmount:
        good
          .MeasureUnit_Good_Default_MeasureUnit_IDToMeasureUnit
          .WeightOrAmount ?? null,
    }
  : null,
      mainMeasureUnitId: good.Main_MeasureUnit_ID || 0,
      defaultMeasureUnitId: good.Default_MeasureUnit_ID || 0,

      discountPrice: pricing.discountPrice ?? 0,

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

  const appSetting = await prisma.appSettings.findFirst({
    select: { FinancialYear_ID: true },
  });

  const branchId = data.branchId;
  const financialYearId = appSetting?.FinancialYear_ID ?? 2;
  const warehouseId = Number(branchConfig.Warehouse_ID);

  if (!Number.isSafeInteger(warehouseId) || warehouseId <= 0) {
    throw new Error("انبار شعبه انتخاب‌شده معتبر نیست.");
  }

  const orderResponse =
    await prisma.$transaction(
      async (tx) => {


       const delivery =
  await getOrCreateOrderDelivery(
    tx,
    customer.RowID,
    data.deliveryAddress,
  );

  await checkStockForOrder(
    tx,
    warehouseId,
    financialYearId,
    orderItems.map((item) => ({
      goodId: item.goodId,
      quantity: item.quantity,
    })),
  );

        const docNo = await getNextDocNo(tx);

      const docNoWhdocH =await getNextDocNoWhDocH(tx)

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

    Fix_OrderPaymentMethod_ID: paymentMethod.RowID,

    Fix_OrderPaymentConfirmationStatus_ID:
      paymentMethod.EnName === "payInPlace" ? 2 : 1,

    Fix_DiscountType_ID: 1,
    UniqueIdentifierValue: idempotencyKey,
  },

  select: {
    RowID: true,
    DocNo: true,
    Person_ID: true,
    OrderDeliveryAddress_ID: true,
  },
});


       const orderD = await tx.orderD.createMany({
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

        const whDocH = await tx.whDocH.create({
          data: {
            DocNo: docNoWhdocH,
            UniqueCode: randomUUID(),
            Person_ID: customer.RowID,
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
            Branch_ID: branchId,
            DiscountPercent: 0,
            DiscountPrice: discountPrice,
            TaxPercent: 0,
            TaxPrice: taxPrice,
            PayablePrice: payablePrice,
            Fix_DiscountType_ID: 1,
            Fix_RecordStatusType_ID: 1,
            Fix_WhDocType1_ID: 1,
            Fix_WhDocType2_ID: 1,
            Warehouse_ID: warehouseId,
            RowDesc: "RowDesc" in data.deliveryAddress
              ? data.deliveryAddress.RowDesc
              : undefined,
            RowUpdateVersion:1,
            OrderH_ID: orderH.RowID,
         },
         select:{
          RowID: true
         }
        })

        const whDocD = await tx.whDocD.createMany({
          data:  orderItems.map(
              (item) => ({
                Branch_ID:
                  branchId,

                FinancialYear_ID:
                  financialYearId,

                WhDocH_ID:
                  whDocH.RowID,

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
        })

        return {

          whDocHId:
            Number(
              whDocH.RowID,
            ),

          whDocD: whDocD.count,

          orderHId:
            Number(
              orderH.RowID,
            ),

            orderD: orderD.count,

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



async function findOrderByIdempotencyKey(
  personId: number,
  idempotencyKey: string,
): Promise<OrderResponse | null> {
  const existingOrder = await prisma.orderH.findFirst({
    where: {
      Person_ID: personId,
      UniqueIdentifierValue: idempotencyKey,
    },
    select: {
      RowID: true,
      DocNo: true,
      Person_ID: true,
      OrderDeliveryAddress_ID: true,
      TotalPrice: true,
      DiscountPrice: true,
      TaxPrice: true,
      PayablePrice: true,
    },
  });

  if (!existingOrder) {
    return null;
  }

  const warehouseDocument = await prisma.whDocH.findFirst({
    where: {
      OrderH_ID: existingOrder.RowID,
    },
    select: {
      RowID: true,
    },
  });

  if (!warehouseDocument) {
    throw new Error(
      "سفارش قبلی پیدا شد اما سند انبار مرتبط با آن موجود نیست.",
    );
  }

  const [orderD, whDocD] = await Promise.all([
    prisma.orderD.count({
      where: {
        OrderH_ID: existingOrder.RowID,
      },
    }),

    prisma.whDocD.count({
      where: {
        WhDocH_ID: warehouseDocument.RowID,
      },
    }),
  ]);

  return {
    orderHId: Number(existingOrder.RowID),
    whDocHId: warehouseDocument.RowID,
    orderD,
    whDocD,
    docNo: Number(existingOrder.DocNo),
    personId: existingOrder.Person_ID!,
    deliveryAddressId: Number(
      existingOrder.OrderDeliveryAddress_ID,
    ),
    totalPrice: Number(existingOrder.TotalPrice ?? 0),
    discountPrice: Number(existingOrder.DiscountPrice ?? 0),
    taxPrice: Number(existingOrder.TaxPrice ?? 0),
    payablePrice: Number(existingOrder.PayablePrice ?? 0),
    items: [],
  };
}



export async function order(
  personId: number,
  data: OrderHRequest,
  idempotencyKey: string,
): Promise<OrderResponse> {
  if (!Number.isInteger(personId) || personId <= 0) {
    throw new Error("شناسه مشتری نامعتبر است.");
  }

  if (!idempotencyKey?.trim()) {
    throw new Error("کلید یکتای سفارش ارسال نشده است.");
  }

  try {
    return await withCustomerOrderLock(personId, async () => {
      // ابتدا بررسی می‌کنیم آیا این سفارش قبلاً ثبت شده است یا نه
      const previousOrder = await findOrderByIdempotencyKey(
        personId,
        idempotencyKey,
      );

      if (previousOrder) {
        return previousOrder;
      }

      // در صورت نبود سفارش قبلی، سفارش جدید ثبت می‌شود
      return createOrderInternal(
        personId,
        data,
        idempotencyKey,
      );
    });
  } catch (error) {
    // اگر دیتابیس خطای Unique Constraint برگرداند
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // بررسی می‌کنیم آیا سفارش با همین کلید ثبت شده است
      const previousOrder = await findOrderByIdempotencyKey(
        personId,
        idempotencyKey,
      );

      if (previousOrder) {
        return previousOrder;
      }
    }

    throw error;
  }
}
