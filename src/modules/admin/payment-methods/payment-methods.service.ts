
import { prisma } from "../../../lib/prisma.js";

export async function getPaymentMethodsForAdmin() {
  const methods = await prisma.fix_OrderPaymentMethod.findMany({
    select: {
      RowID: true,
      RowName: true,
      RowDesc: true,
      IsActive: true,
      EnName: true,
      OnlinePayType: true,
    },
    orderBy: {
      RowID: "asc",
    },
  });

  return methods.map((method) => ({
    id: method.RowID,
    name: method.RowName,
    description: method.RowDesc,
    isActive: method.IsActive === true,
    enName: method.EnName,
    onlinePayType: method.OnlinePayType,
  }));
}

export async function updatePaymentMethodStatus(
  id: number,
  isActive: boolean,
) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("شناسه روش پرداخت معتبر نیست.");
  }

  const method = await prisma.fix_OrderPaymentMethod.findUnique({
    where: {
      RowID: id,
    },
    select: {
      RowID: true,
    },
  });

  if (!method) {
    throw new Error("روش پرداخت پیدا نشد.");
  }

  const updated = await prisma.fix_OrderPaymentMethod.update({
    where: {
      RowID: id,
    },
    data: {
      IsActive: isActive,
    },
    select: {
      RowID: true,
      RowName: true,
      IsActive: true,
    },
  });

  return {
    id: updated.RowID,
    name: updated.RowName,
    isActive: updated.IsActive === true,
  };
}
