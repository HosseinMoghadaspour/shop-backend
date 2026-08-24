import { prisma } from "../../lib/prisma.js";

export async function findAmazingProducts(limit = 12) {
  return prisma.good.findMany({
    where: {
      IsActive: true,
      IsShowInOnlineShop: true,
      AmazingSale: true,
    },

    select: {
      RowID: true,
      RowCode: true,
      RowName: true,
      SalePrice: true,
      DiscountPrice: true,
      ConsumerPrice: true,
      BriefDescription: true,
    },

    orderBy: {
      RowID: "desc",
    },

    take: limit,
  });
}

export async function findNewProducts(limit = 12) {
  return prisma.good.findMany({
    where: {
      IsActive: true,
      IsShowInOnlineShop: true,
      MDate: {
        not: null,
      },
    },

    select: {
      RowID: true,
      RowCode: true,
      RowName: true,
      SalePrice: true,
      DiscountPrice: true,
      ConsumerPrice: true,
      MDate: true,
      BriefDescription: true,
    },

    orderBy: [
      {
        MDate: "desc",
      },
      {
        RowID: "desc",
      },
    ],

    take: limit,
  });
}

export async function findMostSaleProducts(limit = 12) {
  /*
   * ابتدا تعداد فروش هر کالا را از OrderD محاسبه می‌کنیم.
   *
   * فعلاً فقط OutputValue را ملاک قرار می‌دهیم.
   * چون در Prisma فعلی Relation بین OrderD و OrderH تعریف نکرده‌ایم،
   * فیلتر IsOnlineOrder را در مرحله بعد با ساخت Relation یا
   * یک query مخصوص Orderها اضافه می‌کنیم.
   */

  const sales = await prisma.orderD.groupBy({
  by: ["Good_ID"],

  where: {
    order: {
      IsOnlineOrder: true,
    },

    good: {
      IsActive: true,
      IsShowInOnlineShop: true,
    },
  },

  _sum: {
    OutputValue: true,
  },

  orderBy: {
    _sum: {
      OutputValue: "desc",
    },
  },

  take: limit,
});

  if (sales.length === 0) {
    return [];
  }

  const goodIds = sales.map((item) => item.Good_ID);

  const products = await prisma.good.findMany({
    where: {
      RowID: {
        in: goodIds,
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
    },
  });

  const productMap = new Map(
    products.map((product) => [
      product.RowID,
      product,
    ])
  );

  return sales
    .map((sale) => {
      const product = productMap.get(sale.Good_ID);

      if (!product) {
        return null;
      }

      return {
        ...product,
        totalSold: sale._sum.OutputValue ?? 0,
      };
    })
    .filter(
      (
        product
      ): product is NonNullable<typeof product> => product !== null
    );
}