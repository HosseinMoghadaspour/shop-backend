import type { Context } from "hono";
import { prisma } from "../../lib/prisma.js";

export async function getAdminDashboard(c: Context) {
  try {
    const [productTotal, productVisible, categoryTotal, categoryVisible] = await Promise.all([
      prisma.good.count(),
      prisma.good.count({ where: { IsShowInOnlineShop: true } }),
      prisma.goodCategory.count(),
      prisma.goodCategory.count({ where: { IsShowInOnlineShop: true } }),
    ]);

    return c.json({
      success: true,
      data: {
        products: {
          total: productTotal,
          visible: productVisible,
          hidden: Math.max(0, productTotal - productVisible),
        },
        categories: {
          total: categoryTotal,
          visible: categoryVisible,
          hidden: Math.max(0, categoryTotal - categoryVisible),
        },
      },
    });
  } catch (error) {
    console.error("Admin dashboard stats error:", error);
    return c.json({
      success: false,
      message: "دریافت آمار داشبورد از دیتابیس ناموفق بود.",
    }, 500);
  }
}
