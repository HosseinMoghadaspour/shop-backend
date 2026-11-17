import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

export const ORDER_REQUEST_TYPE = {
  CANCELLATION: 1,
  SUPPORT: 2,
} as const;

export const ORDER_REQUEST_STATUS = {
  PENDING: 1,
  IN_PROGRESS: 2,
  RESOLVED: 3,
  REJECTED: 4,
} as const;

export async function createCustomerOrderRequest(
  orderId: number,
  personId: number,
  requestType: number,
  message: string,
) {
  const order = await prisma.orderH.findFirst({
    where: {
      RowID: BigInt(orderId),
      Person_ID: personId,
      IsOnlineOrder: true,
    },
    select: { RowID: true },
  });
  if (!order) return { kind: "order-not-found" as const };

  try {
    const request = await prisma.siteOrderRequest.create({
      data: {
        OrderH_ID: order.RowID,
        Person_ID: personId,
        RequestType: requestType,
        Message: message,
      },
      select: {
        RowID: true,
        OrderH_ID: true,
        RequestType: true,
        Message: true,
        Status: true,
        CreatedAt: true,
      },
    });
    return { kind: "created" as const, request };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      requestType === ORDER_REQUEST_TYPE.CANCELLATION
    ) {
      return { kind: "duplicate-cancellation" as const };
    }
    throw error;
  }
}

export async function findCustomerOrderRequests(orderId: number, personId: number) {
  const order = await prisma.orderH.findFirst({
    where: {
      RowID: BigInt(orderId),
      Person_ID: personId,
      IsOnlineOrder: true,
    },
    select: { RowID: true },
  });
  if (!order) return null;

  return prisma.siteOrderRequest.findMany({
    where: { OrderH_ID: order.RowID, Person_ID: personId },
    orderBy: { CreatedAt: "desc" },
    select: {
      RowID: true,
      RequestType: true,
      Message: true,
      Status: true,
      AdminResponse: true,
      CreatedAt: true,
      UpdatedAt: true,
    },
  });
}

export async function findAdminOrderRequests(page: number, limit: number, status?: number) {
  const where: Prisma.SiteOrderRequestWhereInput = status
    ? { Status: status }
    : {};
  const [items, total] = await Promise.all([
    prisma.siteOrderRequest.findMany({
      where,
      orderBy: { CreatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        RowID: true,
        OrderH_ID: true,
        Person_ID: true,
        RequestType: true,
        Message: true,
        Status: true,
        AdminResponse: true,
        CreatedAt: true,
        UpdatedAt: true,
        Person: { select: { RowName: true, MobileNumber: true } },
        OrderH: { select: { DocNo: true, FDate: true, PayablePrice: true } },
      },
    }),
    prisma.siteOrderRequest.count({ where }),
  ]);

  return {
    items: items.map((item) => ({
      id: Number(item.RowID),
      orderId: Number(item.OrderH_ID),
      orderDocNo: Number(item.OrderH.DocNo),
      orderDate: item.OrderH.FDate,
      payablePrice: item.OrderH.PayablePrice,
      customerId: item.Person_ID,
      customerName: item.Person?.RowName ?? null,
      customerMobile: item.Person?.MobileNumber ?? null,
      requestType: item.RequestType,
      message: item.Message,
      status: item.Status,
      adminResponse: item.AdminResponse,
      createdAt: item.CreatedAt,
      updatedAt: item.UpdatedAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function updateAdminOrderRequest(
  requestId: number,
  status: number,
  adminResponse?: string,
) {
  const existing = await prisma.siteOrderRequest.findUnique({
    where: { RowID: BigInt(requestId) },
    select: { RowID: true },
  });
  if (!existing) return false;

  await prisma.siteOrderRequest.update({
    where: { RowID: existing.RowID },
    data: {
      Status: status,
      ...(adminResponse !== undefined ? { AdminResponse: adminResponse } : {}),
      UpdatedAt: new Date(),
    },
  });
  return true;
}
