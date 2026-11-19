import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

export async function findAdminOrders(page: number, limit: number, search?: string) {
  const numericSearch = search && /^\d+$/.test(search) ? BigInt(search) : undefined;
  const where: Prisma.OrderHWhereInput = numericSearch ? { DocNo: numericSearch } : {};
  const [orders, total, deliveryStatuses, paymentStatuses, sendStatuses] = await Promise.all([
    prisma.orderH.findMany({
      where,
      orderBy: { RowID: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        RowID: true,
        DocNo: true,
        FDate: true,
        TotalPrice: true,
        DiscountPrice: true,
        TaxPrice: true,
        PayablePrice: true,
        Person_ID: true,
        Fix_OrderDeliveryStatus_ID: true,
        Fix_OrderSendID: true,
        Fix_OrderPaymentConfirmationStatus_ID: true,
        Fix_OrderPaymentMethod_ID: true,
        OrderStatus: true,
        Person: { select: { RowID: true, MobileNumber: true } },
        Fix_OrderDeliveryStatus: { select: { RowID: true, RowName: true } },
        Fix_OrderSendMethod: { select: { RowID: true, RowName: true } },
        Fix_OrderPaymentConfirmationStatus: { select: { RowID: true, RowName: true } },
        Fix_OrderPaymentMethod: { select: { RowID: true, RowName: true } },
      },
    }),
    prisma.orderH.count({ where }),
    prisma.fix_OrderDeliveryStatus.findMany({
      orderBy: { RowID: "asc" },
      select: { RowID: true, RowName: true, RowDesc: true },
    }),
    prisma.fix_OrderPaymentConfirmationStatus.findMany({
      orderBy: { RowID: "asc" },
      select: { RowID: true, RowName: true, RowDesc: true },
    }),
    prisma.fix_OrderSendMethod.findMany({
      orderBy: { RowID: "asc" },
      select: { RowID: true, RowName: true },
    }),
  ]);

  return {
    items: orders.map((order) => ({
      id: Number(order.RowID),
      docNo: Number(order.DocNo),
      date: order.FDate,
      totalPrice: order.TotalPrice,
      discountPrice: order.DiscountPrice,
      taxPrice: order.TaxPrice,
      payablePrice: order.PayablePrice,
      customerId: order.Person_ID,
      customerMobile: order.Person?.MobileNumber ?? null,
      deliveryStatusId: order.Fix_OrderDeliveryStatus_ID,
      deliveryStatusName: order.Fix_OrderDeliveryStatus?.RowName ?? "نامشخص",
      sendStatusId: order.Fix_OrderSendID,
      sendStatusName: order.Fix_OrderSendMethod?.RowName ?? "نامشخص",
      paymentStatusId: order.Fix_OrderPaymentConfirmationStatus_ID,
      paymentStatusName: order.Fix_OrderPaymentConfirmationStatus?.RowName ?? "نامشخص",
      paymentMethodName: order.Fix_OrderPaymentMethod?.RowName ?? "نامشخص",
      orderStatus: order.OrderStatus,
    })),
    statuses: {
      delivery: deliveryStatuses,
      send: sendStatuses,
      payment: paymentStatuses,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function findAdminOrderById(id: number) {
  const order = await prisma.orderH.findUnique({
    where: { RowID: BigInt(id) },
    select: {
      RowID: true,
      DocNo: true,
      FDate: true,
      TotalPrice: true,
      DiscountPrice: true,
      TaxPrice: true,
      PayablePrice: true,
      ShippingCost: true,
      OrderStatus: true,
      RowDesc: true,
      Person_ID: true,
      OrderDeliveryAddress_ID: true,
      Fix_OrderDeliveryStatus_ID: true,
      Fix_OrderSendID: true,
      Fix_OrderPaymentConfirmationStatus_ID: true,
      Fix_OrderPaymentMethod_ID: true,
      Person: { select: { RowID: true, MobileNumber: true } },
      OrderDeliveryAddress: {
        select: {
          RowID: true,
          Adrs: true,
          DeliverToName: true,
          DeliverToMobileNumber: true,
          PostalCode: true,
        },
      },
      Fix_OrderDeliveryStatus: { select: { RowID: true, RowName: true } },
      Fix_OrderSendMethod: { select: { RowID: true, RowName: true } },
      Fix_OrderPaymentConfirmationStatus: { select: { RowID: true, RowName: true } },
      Fix_OrderPaymentMethod: { select: { RowID: true, RowName: true } },
      orderDetails: {
        where: { InputValue: 0 },
        select: {
          RowID: true,
          Good_ID: true,
          OutputValue: true,
          UnitPrice: true,
          TotalPrice: true,
          good: { select: { RowCode: true, RowName: true } },
        },
      },
    },
  });

  if (!order) return null;
  return {
    id: Number(order.RowID),
    docNo: Number(order.DocNo),
    date: order.FDate,
    totalPrice: order.TotalPrice,
    discountPrice: order.DiscountPrice,
    taxPrice: order.TaxPrice,
    payablePrice: order.PayablePrice,
    orderStatus: order.OrderStatus,
    shippingCost: order.ShippingCost,
    note: order.RowDesc,
    customerId: order.Person_ID,
    customerMobile: order.Person?.MobileNumber ?? null,
    address: order.OrderDeliveryAddress ? {
      recipient: order.OrderDeliveryAddress.DeliverToName,
      mobile: order.OrderDeliveryAddress.DeliverToMobileNumber,
      postalCode: order.OrderDeliveryAddress.PostalCode,
      address: order.OrderDeliveryAddress.Adrs,
    } : null,
    deliveryStatusId: order.Fix_OrderDeliveryStatus_ID,
    deliveryStatusName: order.Fix_OrderDeliveryStatus?.RowName ?? "نامشخص",
    sendStatusId: order.Fix_OrderSendID,
    sendStatusName: order.Fix_OrderSendMethod?.RowName ?? "نامشخص",
    paymentStatusId: order.Fix_OrderPaymentConfirmationStatus_ID,
    paymentStatusName: order.Fix_OrderPaymentConfirmationStatus?.RowName ?? "نامشخص",
    paymentMethodName: order.Fix_OrderPaymentMethod?.RowName ?? "نامشخص",
    items: order.orderDetails.map((item) => ({
      id: Number(item.RowID),
      goodId: item.Good_ID,
      code: item.good.RowCode,
      name: item.good.RowName,
      quantity: item.OutputValue,
      unitPrice: item.UnitPrice,
      totalPrice: item.TotalPrice,
    })),
  };
}

export async function updateAdminOrderStatuses(
  id: number,
  deliveryStatusId?: number,
  paymentStatusId?: number,
  sendStatusId?: number,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.orderH.findUnique({
      where: { RowID: BigInt(id) },
      select: { RowID: true },
    });
    if (!order) return { kind: "not-found" as const };

    if (deliveryStatusId !== undefined) {
      const status = await tx.fix_OrderDeliveryStatus.findUnique({
        where: { RowID: deliveryStatusId },
        select: { RowID: true },
      });
      if (!status) return { kind: "invalid-delivery-status" as const };
    }
    if (sendStatusId !== undefined) {
      const status = await tx.fix_OrderSendMethod.findUnique({
        where: { RowID: sendStatusId },
        select: { RowID: true },
      });
      if (!status) return { kind: "invalid-send-status" as const };
    }

    if (paymentStatusId !== undefined) {
      const status = await tx.fix_OrderPaymentConfirmationStatus.findUnique({
        where: { RowID: paymentStatusId },
        select: { RowID: true },
      });
      if (!status) return { kind: "invalid-payment-status" as const };
    }

    await tx.orderH.update({
      where: { RowID: BigInt(id) },
      data: {
        ...(deliveryStatusId !== undefined
          ? { Fix_OrderDeliveryStatus_ID: deliveryStatusId }
          : {}),
        ...(paymentStatusId !== undefined
          ? { Fix_OrderPaymentConfirmationStatus_ID: paymentStatusId }
          : {}),
        ...(sendStatusId !== undefined
          ? { Fix_OrderSendID: sendStatusId }
          : {}),
        UpdateServerDateTime: new Date(),
      },
    });
    return { kind: "updated" as const };
  });
}
