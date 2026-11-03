import { prisma } from "../../../lib/prisma.js";

const PAYMENT_STATUS = {
  PENDING: 1,
  PAY_IN_PLACE: 2,
  PAID: 3,
  NOT_PAID: 4,
} as const;

export async function getPendingPaymentReceipts() {
  const receipts = await prisma.orderH.findMany({
    where: {
      DepositTrackingNumber: {
        not: null,
      },

      Fix_OrderPaymentConfirmationStatus_ID:
        PAYMENT_STATUS.PENDING,

      Fix_OrderPaymentMethod: {
        is: {
          EnName: "CardToCard",
          IsActive: true,
        },
      },
    },

    select: {
      RowID: true,
      DocNo: true,
      FDate: true,
      InsertServerDateTime: true,

      TotalPrice: true,
      PayablePrice: true,

      DepositAmount: true,
      DepositTrackingNumber: true,

      DepositYear: true,
      DepositMonth: true,
      DepositDay: true,
      DepositHour: true,
      DepositMinute: true,

      DepositLastFourDigitsOfCreditCard: true,

      Person: {
        select: {
          RowID: true,
          RowName: true,
          MobileNumber: true,
          MobileForSMS: true,
        },
      },

      BankAccount_OrderH_DepositBankAccount_IDToBankAccount: {
        select: {
          RowID: true,
          OnlineShop_BankName: true,
          OnlineShop_CardNumber: true,
          OnlineShop_AccountNumber: true,
          OnlineShop_AccountOwnerName: true,
        },
      },

      Fix_OrderPaymentConfirmationStatus: {
        select: {
          RowID: true,
          RowName: true,
        },
      },
    },

    orderBy: [
      {
        InsertServerDateTime: "desc",
      },
      {
        RowID: "desc",
      },
    ],
  });

  return receipts.map((receipt) => ({
    id: receipt.RowID.toString(),
    docNo: receipt.DocNo.toString(),

    orderDate: receipt.FDate,
    createdAt: receipt.InsertServerDateTime,

    totalPrice:
      receipt.TotalPrice == null
        ? null
        : Number(receipt.TotalPrice),

    payableAmount:
      receipt.PayablePrice == null
        ? null
        : Number(receipt.PayablePrice),

    depositAmount:
      receipt.DepositAmount == null
        ? null
        : Number(receipt.DepositAmount),

    trackingNumber: receipt.DepositTrackingNumber,

    depositDate: {
      year: receipt.DepositYear,
      month: receipt.DepositMonth,
      day: receipt.DepositDay,
    },

    depositTime: {
      hour: receipt.DepositHour,
      minute: receipt.DepositMinute,
    },

    lastFourDigits:
      receipt.DepositLastFourDigitsOfCreditCard,

    customer: receipt.Person
      ? {
          id: receipt.Person.RowID,
          name: receipt.Person.RowName,
          mobile:
            receipt.Person.MobileForSMS ??
            receipt.Person.MobileNumber,
        }
      : null,

    bankAccount:
      receipt
        .BankAccount_OrderH_DepositBankAccount_IDToBankAccount
        ? {
            id: receipt
              .BankAccount_OrderH_DepositBankAccount_IDToBankAccount
              .RowID,

            bankName:
              receipt
                .BankAccount_OrderH_DepositBankAccount_IDToBankAccount
                .OnlineShop_BankName,

            cardNumber:
              receipt
                .BankAccount_OrderH_DepositBankAccount_IDToBankAccount
                .OnlineShop_CardNumber,

            accountNumber:
              receipt
                .BankAccount_OrderH_DepositBankAccount_IDToBankAccount
                .OnlineShop_AccountNumber,

            ownerName:
              receipt
                .BankAccount_OrderH_DepositBankAccount_IDToBankAccount
                .OnlineShop_AccountOwnerName,
          }
        : null,

    paymentStatus:
      receipt.Fix_OrderPaymentConfirmationStatus
        ? {
            id: receipt.Fix_OrderPaymentConfirmationStatus.RowID,
            name: receipt.Fix_OrderPaymentConfirmationStatus.RowName,
          }
        : null,
  }));
}

export async function approvePaymentReceipt(orderId: bigint) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.orderH.findUnique({
      where: { RowID: orderId },
      select: {
        RowID: true,
        DepositAmount: true,
        DepositTrackingNumber: true,
        DepositBankAccount_ID: true,
        Fix_OrderPaymentConfirmationStatus_ID: true,
        Fix_OrderPaymentMethod: {
          select: {
            EnName: true,
            IsActive: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error("سفارش موردنظر پیدا نشد.");
    }

    if (
      order.Fix_OrderPaymentConfirmationStatus_ID !==
      PAYMENT_STATUS.PENDING
    ) {
      throw new Error("این رسید قبلاً بررسی شده است.");
    }

    if (
      order.Fix_OrderPaymentMethod?.EnName !== "CardToCard" ||
      !order.Fix_OrderPaymentMethod.IsActive
    ) {
      throw new Error("روش پرداخت این سفارش معتبر نیست.");
    }

    const trackingNumber = order.DepositTrackingNumber;

    if (!trackingNumber?.trim()) {
      throw new Error("اطلاعات رسید پرداخت ثبت نشده است.");
    }

    if (
      order.DepositAmount === null ||
      order.DepositAmount <= 0
    ) {
      throw new Error("مبلغ رسید معتبر نیست.");
    }

    if (order.DepositBankAccount_ID === null) {
      throw new Error("حساب بانکی مقصد مشخص نشده است.");
    }

    const bankAccount = await tx.bankAccount.findUnique({
      where: {
        RowID: order.DepositBankAccount_ID,
      },
      select: {
        RowID: true,
        IsActive: true,
      },
    });

    if (!bankAccount || !bankAccount.IsActive) {
      throw new Error("حساب بانکی مقصد معتبر یا فعال نیست.");
    }

    const result = await tx.orderH.updateMany({
      where: {
        RowID: orderId,
        Fix_OrderPaymentConfirmationStatus_ID:
          PAYMENT_STATUS.PENDING,
        DepositTrackingNumber: trackingNumber,
      },
      data: {
        Fix_OrderPaymentConfirmationStatus_ID:
          PAYMENT_STATUS.PAID,
        PaymentConfirmationAmount: order.DepositAmount,
        PaymentConfirmationBankAccount_ID: bankAccount.RowID,
      },
    });

    if (result.count !== 1) {
      throw new Error(
        "وضعیت سفارش تغییر کرده است؛ لطفاً دوباره اطلاعات را بررسی کنید.",
      );
    }

    return {
      orderId: order.RowID.toString(),
      paymentStatusId: PAYMENT_STATUS.PAID,
      message: "رسید با موفقیت تأیید شد.",
    };
  });
}

export async function rejectPaymentReceipt(orderId: bigint) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.orderH.findUnique({
      where: { RowID: orderId },
      select: {
        RowID: true,
        DepositTrackingNumber: true,
        Fix_OrderPaymentConfirmationStatus_ID: true,
        Fix_OrderPaymentMethod: {
          select: {
            EnName: true,
            IsActive: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error("سفارش موردنظر پیدا نشد.");
    }

    if (
      order.Fix_OrderPaymentConfirmationStatus_ID !==
      PAYMENT_STATUS.PENDING
    ) {
      throw new Error("این رسید قبلاً بررسی شده است.");
    }

    if (
      order.Fix_OrderPaymentMethod?.EnName !== "CardToCard" ||
      !order.Fix_OrderPaymentMethod.IsActive
    ) {
      throw new Error("روش پرداخت این سفارش معتبر نیست.");
    }

    const trackingNumber = order.DepositTrackingNumber;

    if (!trackingNumber?.trim()) {
      throw new Error("اطلاعات رسید پرداخت ثبت نشده است.");
    }

    const result = await tx.orderH.updateMany({
      where: {
        RowID: orderId,
        Fix_OrderPaymentConfirmationStatus_ID:
          PAYMENT_STATUS.PENDING,
        DepositTrackingNumber: trackingNumber,
      },
      data: {
        Fix_OrderPaymentConfirmationStatus_ID:
          PAYMENT_STATUS.NOT_PAID,
      },
    });

    if (result.count !== 1) {
      throw new Error(
        "وضعیت سفارش تغییر کرده است؛ لطفاً دوباره اطلاعات را بررسی کنید.",
      );
    }

    return {
      orderId: order.RowID.toString(),
      paymentStatusId: PAYMENT_STATUS.NOT_PAID,
      message: "رسید پرداخت رد شد.",
    };
  });
}
