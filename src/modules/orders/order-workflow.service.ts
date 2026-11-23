import { prisma } from "../../lib/prisma.js";

export const ORDER_WORKFLOW_STATUS = {
  WAITING_SHIPPING_QUOTE: 1,
  WAITING_CUSTOMER_CONFIRMATION: 2,
  WAITING_PAYMENT: 3,
  PAID: 4,
  CUSTOMER_REJECTED: 5,
  CANCELLED: 6,
} as const;

export async function setAdminShippingQuote(
  orderId: bigint,
  shippingCost: number,
  adminNote?: string,
  expiresAt?: Date,
) {
  return prisma.$transaction(async (tx) => {
    const workflow = await tx.siteOrderWorkflow.findUnique({
      where: { OrderH_ID: orderId },
      select: { Status: true },
    });
    if (!workflow) return { kind: "not-found" as const };
    if (workflow.Status !== ORDER_WORKFLOW_STATUS.WAITING_SHIPPING_QUOTE) {
      return { kind: "invalid-status" as const };
    }
    const order = await tx.orderH.findUnique({
      where: { RowID: orderId },
      select: { TotalPrice: true, DiscountPrice: true, TaxPrice: true },
    });
    if (!order) return { kind: "not-found" as const };

    const payablePrice =
      Number(order.TotalPrice ?? 0) -
      Number(order.DiscountPrice ?? 0) +
      Number(order.TaxPrice ?? 0) +
      shippingCost;

    const changed = await tx.siteOrderWorkflow.updateMany({
      where: { OrderH_ID: orderId, Status: ORDER_WORKFLOW_STATUS.WAITING_SHIPPING_QUOTE },
      data: {
        Status: ORDER_WORKFLOW_STATUS.WAITING_CUSTOMER_CONFIRMATION,
        ShippingCost: shippingCost,
        AdminNote: adminNote?.trim() || null,
        QuoteExpiresAt: expiresAt ?? null,
        UpdatedAt: new Date(),
      },
    });
    if (changed.count !== 1) return { kind: "invalid-status" as const };

    await tx.orderH.update({
      where: { RowID: orderId },
      data: { ShippingCost: shippingCost, PayablePrice: payablePrice },
    });
    return { kind: "updated" as const, payablePrice };
  });
}

export async function confirmCustomerOrderTotal(
  orderId: bigint,
  personId: number,
  accepted: boolean,
) {
  return prisma.$transaction(async (tx) => {
    const ownedOrder = await tx.orderH.findFirst({
      where: { RowID: orderId, Person_ID: personId, IsOnlineOrder: true },
      select: { RowID: true },
    });
    if (!ownedOrder) return { kind: "not-found" as const };

    const workflow = await tx.siteOrderWorkflow.findUnique({
      where: { OrderH_ID: orderId },
      select: { Status: true, QuoteExpiresAt: true },
    });
    if (!workflow) return { kind: "not-found" as const };
    if (workflow.Status !== ORDER_WORKFLOW_STATUS.WAITING_CUSTOMER_CONFIRMATION) {
      return { kind: "invalid-status" as const };
    }
    if (workflow.QuoteExpiresAt && workflow.QuoteExpiresAt.getTime() < Date.now()) {
      return { kind: "expired" as const };
    }

    const updated = await tx.siteOrderWorkflow.updateMany({
      where: {
        OrderH_ID: orderId,
        Status: ORDER_WORKFLOW_STATUS.WAITING_CUSTOMER_CONFIRMATION,
      },
      data: accepted
        ? { Status: ORDER_WORKFLOW_STATUS.WAITING_PAYMENT, CustomerAcceptedAt: new Date(), UpdatedAt: new Date() }
        : { Status: ORDER_WORKFLOW_STATUS.CUSTOMER_REJECTED, CustomerRejectedAt: new Date(), UpdatedAt: new Date() },
    });
    if (updated.count !== 1) return { kind: "invalid-status" as const };
    return { kind: accepted ? "accepted" as const : "rejected" as const };
  });
}
