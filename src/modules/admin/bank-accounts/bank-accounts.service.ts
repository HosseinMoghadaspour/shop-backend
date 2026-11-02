import { prisma } from "../../../lib/prisma.js";

export async function getBankAccountsForAdmin() {
  return prisma.bankAccount.findMany({
    select: {
      RowID: true,
      RowCode: true,
      RowName: true,
      IsActive: true,

      OnlineShop_IsShow: true,
      OnlineShop_BankName: true,
      OnlineShop_AccountNumber: true,
      OnlineShop_CardNumber: true,
      OnlineShop_AccountOwnerName: true,
    },
    orderBy: {
      RowID: "asc",
    },
  });
}
