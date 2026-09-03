import { prisma } from "../../lib/prisma.js";

export async function findBranchPrice(
  productId: number,
  branchId: number,
) {
  return prisma.goodBranchPrice.findFirst({
    where: {
      GID: productId,
      BID: branchId,
    },
    orderBy: {
      Mdate: "desc",
    },
    select: {
      RowID: true,
      GID: true,
      BID: true,
      SalePrice: true,
      ConsumerPrice: true,
      Mdate: true,
    },
  });
}