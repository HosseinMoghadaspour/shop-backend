import { prisma } from "../../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import type {
  PaymentMethodDetailResponse,
  PaymentMethodResponse,
  PaymentStatusResponse,
} from "./payment.types.js";

export const PAYMENT_METHOD = {
  CARD_TO_CARD: 1,
  PAY_IN_PLACE: 2,
  ZARINPAL: 3,
  BEHPARDKHT: 4,
  SADAD: 5,
  PASARGAD: 6,
} as const;

export const PAYMENT_STATUS = {
  PENDING: 1,
  PAY_IN_PLACE: 2,
  PAID: 3,
  NOT_PAID: 4,
} as const;



export async function getPaymentMethods(): Promise<
  PaymentMethodResponse[]
> {
  const methods =
    await prisma.fix_OrderPaymentMethod.findMany({
      where: {
        IsActive: true,
      },

      select: {
        RowID: true,
        RowName: true,
        RowDesc: true,
        OnlinePayType: true,
      },

      orderBy: {
        RowID: "asc",
      },
    });

  return methods.map((method) => ({
    rowId: method.RowID,
    name: method.RowName,
    description: method.RowDesc,
    onlinePayType: method.OnlinePayType,
  }));
}


export async function getActivePaymentMethod(
  paymentMethodId: number,
): Promise<PaymentMethodDetailResponse> {
  if (
    !Number.isInteger(paymentMethodId) ||
    paymentMethodId <= 0
  ) {
    throw new Error("شناسه روش پرداخت نامعتبر است.");
  }

  const method =
    await prisma.fix_OrderPaymentMethod.findFirst({
      where: {
        RowID: paymentMethodId,
        IsActive: true,
      },

      select: {
        RowID: true,
        RowName: true,
        RowDesc: true,
        OnlinePayType: true,
      },
    });

  if (!method) {
    throw new Error(
      "روش پرداخت انتخاب‌شده وجود ندارد یا غیرفعال است.",
    );
  }

  return {
    rowId: method.RowID,
    name: method.RowName,
    description: method.RowDesc,
    onlinePayType: method.OnlinePayType,
    isOnline: method.OnlinePayType !== null &&
      method.OnlinePayType > 0,
  };
}

export async function getPaymentStatuses(): Promise<
  PaymentStatusResponse[]
> {
  const statuses =
    await prisma.fix_OrderPaymentConfirmationStatus.findMany({
      select: {
        RowID: true,
        RowName: true,
        RowDesc: true,
      },

      orderBy: {
        RowID: "asc",
      },
    });

  return statuses.map((status) => ({
    rowId: status.RowID,
    name: status.RowName,
    description: status.RowDesc,
  }));
}


export async function getPaymentStatus(
  statusId: number,
): Promise<PaymentStatusResponse> {
  if (
    !Number.isInteger(statusId) ||
    statusId <= 0
  ) {
    throw new Error("شناسه وضعیت پرداخت نامعتبر است.");
  }

  const status =
    await prisma.fix_OrderPaymentConfirmationStatus.findUnique({
      where: {
        RowID: statusId,
      },

      select: {
        RowID: true,
        RowName: true,
        RowDesc: true,
      },
    });

  if (!status) {
    throw new Error("وضعیت پرداخت پیدا نشد.");
  }

  return {
    rowId: status.RowID,
    name: status.RowName,
    description: status.RowDesc,
  };
}

export async function markOrderAsPaid(
  orderId: bigint,
  amount: number,
): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("مبلغ پرداخت نامعتبر است.");
  }

  const order = await prisma.orderH.findUnique({
    where: {
      RowID: orderId,
    },
    select: {
      RowID: true,
      PayablePrice: true,
      Fix_OrderPaymentConfirmationStatus_ID: true,
    },
  });

  if (!order) {
    throw new Error("سفارش پیدا نشد.");
  }

  if (
    order.Fix_OrderPaymentConfirmationStatus_ID ===
    PAYMENT_STATUS.PAID
  ) {
    return;
  }

  if (
    order.PayablePrice == null ||
    Number(order.PayablePrice) !== amount
  ) {
    throw new Error("مبلغ پرداخت با مبلغ سفارش مطابقت ندارد.");
  }

  await prisma.orderH.update({
    where: {
      RowID: orderId,
    },
    data: {
      Fix_OrderPaymentConfirmationStatus_ID:
        PAYMENT_STATUS.PAID,

      PaymentConfirmationAmount: amount,
    },
  });
}

export async function markOrderAsNotPaid(
  orderId: bigint,
): Promise<void> {
  const order = await prisma.orderH.findUnique({
    where: {
      RowID: orderId,
    },
    select: {
      RowID: true,
      Fix_OrderPaymentConfirmationStatus_ID: true,
    },
  });

  if (!order) {
    throw new Error("سفارش پیدا نشد.");
  }

  if (
    order.Fix_OrderPaymentConfirmationStatus_ID ===
    PAYMENT_STATUS.PAID
  ) {
    throw new Error(
      "سفارش قبلاً پرداخت شده و قابل تغییر نیست.",
    );
  }

  await prisma.orderH.update({
    where: {
      RowID: orderId,
    },
    data: {
      Fix_OrderPaymentConfirmationStatus_ID:
        PAYMENT_STATUS.NOT_PAID,
    },
  });
}


function getPaymentMethodType(
  enName: string | null,
): "CARD_TO_CARD" | "PAY_IN_PLACE" | "GATEWAY" {
  switch (enName) {
    case "CardToCard":
      return "CARD_TO_CARD";

    case "payInPlace":
      return "PAY_IN_PLACE";

    case "ZarinPal":
    case "BehPardkht":
    case "Sadad":
    case "Pasargad":
      return "GATEWAY";

    default:
      throw new Error(
        "روش پرداخت پشتیبانی نمی‌شود.",
      );
  }
}

export async function startPayment(
  customerId: number,
  orderId: bigint,
) {
  if (!Number.isInteger(customerId) || customerId <= 0) {
    throw new Error("شناسه مشتری نامعتبر است.");
  }

  const order = await prisma.orderH.findFirst({
    where: {
      RowID: orderId,
      Person_ID: customerId,
    },

    select: {
      RowID: true,
      Person_ID: true,
      PayablePrice: true,
      Fix_OrderPaymentMethod_ID: true,
      Fix_OrderPaymentConfirmationStatus_ID: true,

      Fix_OrderPaymentMethod: {
        select: {
          RowID: true,
          RowName: true,
          EnName: true,
          IsActive: true,
          OnlinePayType: true,
          Address: true,
        },
      },

      Fix_OrderPaymentConfirmationStatus: {
        select: {
          RowID: true,
          RowName: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error(
      "سفارش پیدا نشد یا متعلق به این مشتری نیست.",
    );
  }

  if (!order.Fix_OrderPaymentMethod_ID) {
    throw new Error(
      "روش پرداخت برای این سفارش مشخص نشده است.",
    );
  }

  if (!order.Fix_OrderPaymentMethod) {
    throw new Error(
      "روش پرداخت سفارش پیدا نشد.",
    );
  }

  if (!order.Fix_OrderPaymentMethod.IsActive) {
    throw new Error(
      "روش پرداخت انتخاب‌شده غیرفعال است.",
    );
  }

  if (
    order.PayablePrice == null ||
    Number(order.PayablePrice) <= 0
  ) {
    throw new Error(
      "مبلغ قابل پرداخت سفارش نامعتبر است.",
    );
  }

  if (
    order.Fix_OrderPaymentConfirmationStatus_ID ===
    PAYMENT_STATUS.PAID
  ) {
    throw new Error(
      "این سفارش قبلاً پرداخت شده است.",
    );
  }

  const methodType = getPaymentMethodType(
    order.Fix_OrderPaymentMethod.EnName,
  );

  /*
   * پرداخت در محل
   */
  if (methodType === "PAY_IN_PLACE") {
    const updatedOrder = await prisma.orderH.update({
      where: {
        RowID: order.RowID,
      },

      data: {
        Fix_OrderPaymentConfirmationStatus_ID:
          PAYMENT_STATUS.PAY_IN_PLACE,
      },

      select: {
        RowID: true,
        Fix_OrderPaymentConfirmationStatus_ID: true,

        Fix_OrderPaymentConfirmationStatus: {
          select: {
            RowID: true,
            RowName: true,
          },
        },
      },
    });

    return {
      orderId: updatedOrder.RowID.toString(),

      paymentMethodId:
        order.Fix_OrderPaymentMethod.RowID,

      paymentMethodName:
        order.Fix_OrderPaymentMethod.RowName,

      paymentMethodType: methodType,

      paymentStatusId:
        updatedOrder
          .Fix_OrderPaymentConfirmationStatus_ID!,

      paymentStatusName:
        updatedOrder
          .Fix_OrderPaymentConfirmationStatus
          ?.RowName ?? "پرداخت در محل",

      payableAmount:
        Number(order.PayablePrice),

      message:
        "سفارش با روش پرداخت در محل ثبت شد.",
    };
  }

  /*
   * کارت به کارت
   */
  if (methodType === "CARD_TO_CARD") {
    return {
      orderId: order.RowID.toString(),

      paymentMethodId:
        order.Fix_OrderPaymentMethod.RowID,

      paymentMethodName:
        order.Fix_OrderPaymentMethod.RowName,

      paymentMethodType: methodType,

      paymentStatusId:
        PAYMENT_STATUS.PENDING,

      paymentStatusName:
        "در انتظار پرداخت",

      payableAmount:
        Number(order.PayablePrice),

      message:
        "اطلاعات پرداخت کارت به کارت را مشاهده کنید.",
    };
  }

  /*
   * درگاه اینترنتی
   */
  return {
    orderId: order.RowID.toString(),

    paymentMethodId:
      order.Fix_OrderPaymentMethod.RowID,

    paymentMethodName:
      order.Fix_OrderPaymentMethod.RowName,

    paymentMethodType: methodType,

    paymentStatusId:
      PAYMENT_STATUS.PENDING,

    paymentStatusName:
      "در انتظار پرداخت",

    payableAmount:
      Number(order.PayablePrice),

    message:
      "درخواست پرداخت اینترنتی آماده ارسال به درگاه است.",
  };
}