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

export type BankAccountUpdateInput = {
  OnlineShop_IsShow?: boolean;
  OnlineShop_BankName?: string | null;
  OnlineShop_AccountNumber?: string | null;
  OnlineShop_CardNumber?: string | null;
  OnlineShop_AccountOwnerName?: string | null;
};

export class BankAccountAdminError extends Error {
  constructor(
    message: string,
    public code: "NOT_FOUND" | "INACTIVE" | "INCOMPLETE",
  ) {
    super(message);
    this.name = "BankAccountAdminError";
  }
}

export async function updateAdminBankAccount(
  id: number,
  data: BankAccountUpdateInput,
) {
  const existing = await prisma.bankAccount.findUnique({
    where: {
      RowID: id,
    },
    select: {
      RowID: true,
      IsActive: true,
      OnlineShop_IsShow: true,
      OnlineShop_BankName: true,
      OnlineShop_AccountNumber: true,
      OnlineShop_CardNumber: true,
      OnlineShop_AccountOwnerName: true,
    },
  });

  if (!existing) {
    throw new BankAccountAdminError(
      "حساب بانکی پیدا نشد.",
      "NOT_FOUND",
    );
  }

  const shouldShow =
    data.OnlineShop_IsShow ??
    existing.OnlineShop_IsShow ??
    false;

  const bankName =
    data.OnlineShop_BankName !== undefined
      ? data.OnlineShop_BankName
      : existing.OnlineShop_BankName;

  const accountNumber =
    data.OnlineShop_AccountNumber !== undefined
      ? data.OnlineShop_AccountNumber
      : existing.OnlineShop_AccountNumber;

  const cardNumber =
    data.OnlineShop_CardNumber !== undefined
      ? data.OnlineShop_CardNumber
      : existing.OnlineShop_CardNumber;

  const ownerName =
    data.OnlineShop_AccountOwnerName !== undefined
      ? data.OnlineShop_AccountOwnerName
      : existing.OnlineShop_AccountOwnerName;

  if (shouldShow) {
    if (!existing.IsActive) {
      throw new BankAccountAdminError(
        "حساب غیرفعال در حسابداری قابل نمایش در فروشگاه نیست.",
        "INACTIVE",
      );
    }

    if (
      !bankName ||
      !ownerName ||
      (!cardNumber && !accountNumber)
    ) {
      throw new BankAccountAdminError(
        "برای نمایش حساب، نام بانک، نام صاحب حساب و شماره کارت یا شماره حساب الزامی است.",
        "INCOMPLETE",
      );
    }
  }

  return prisma.bankAccount.update({
    where: {
      RowID: id,
    },
    data,
    select: {
      RowID: true,
      RowName: true,
      IsActive: true,
      OnlineShop_IsShow: true,
      OnlineShop_BankName: true,
      OnlineShop_AccountNumber: true,
      OnlineShop_CardNumber: true,
      OnlineShop_AccountOwnerName: true,
    },
  });
}
