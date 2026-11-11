/**
 * OpenAPI 3.0 specification for the Shop Backend.
 *
 * Keep this file in sync with the route registrations in src/routes/index.ts
 * and each module's *.routes.ts file.
 */

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

type RouteDoc = {
  method: HttpMethod;
  path: string;
  tag: string;
  summary: string;
  auth?: "customer" | "admin" | "any";
  body?: "json" | "multipart";
};

const routes: RouteDoc[] = [
  // Authentication
  { method: "post", path: "/api/auth/customer/request-otp", tag: "احراز هویت", summary: "درخواست کد ورود مشتری", body: "json" },
  { method: "post", path: "/api/auth/customer/verify-otp", tag: "احراز هویت", summary: "تأیید کد ورود مشتری و ایجاد نشست", body: "json" },
  { method: "post", path: "/api/auth/admin/request-otp", tag: "احراز هویت", summary: "درخواست کد ورود مدیر", body: "json" },
  { method: "post", path: "/api/auth/admin/verify-otp", tag: "احراز هویت", summary: "تأیید کد ورود مدیر و ایجاد نشست", body: "json" },
  { method: "get", path: "/api/auth/me", tag: "احراز هویت", summary: "دریافت کاربر و نشست جاری", auth: "any" },
  { method: "post", path: "/api/auth/logout", tag: "احراز هویت", summary: "خروج از حساب کاربری", auth: "any" },
  { method: "get", path: "/api/me", tag: "احراز هویت", summary: "دریافت اطلاعات نشست جاری", auth: "any" },

  // Public storefront
  { method: "get", path: "/products", tag: "محصولات", summary: "دریافت فهرست محصولات" },
  { method: "get", path: "/products/amazing", tag: "محصولات", summary: "دریافت محصولات شگفت‌انگیز" },
  { method: "get", path: "/products/new", tag: "محصولات", summary: "دریافت محصولات جدید" },
  { method: "get", path: "/products/best-selling", tag: "محصولات", summary: "دریافت پرفروش‌ترین محصولات" },
  { method: "get", path: "/products/code/{code}", tag: "محصولات", summary: "دریافت محصول با کد کالا" },
  { method: "get", path: "/products/{id}", tag: "محصولات", summary: "دریافت جزئیات محصول" },
  { method: "get", path: "/sliders", tag: "محتوای صفحه اصلی", summary: "دریافت اسلایدرهای فعال" },
  { method: "get", path: "/sliders/banners", tag: "محتوای صفحه اصلی", summary: "دریافت بنرهای فعال" },
  { method: "get", path: "/footer", tag: "محتوای صفحه اصلی", summary: "دریافت اطلاعات فوتر" },
  { method: "get", path: "/site-modules", tag: "محتوای صفحه اصلی", summary: "دریافت ماژول‌های فعال سایت" },
  { method: "get", path: "/home", tag: "محتوای صفحه اصلی", summary: "دریافت اطلاعات صفحه اصلی" },
  { method: "get", path: "/categories", tag: "دسته‌بندی‌ها", summary: "دریافت دسته‌بندی‌ها" },
  { method: "get", path: "/categories/{id}", tag: "دسته‌بندی‌ها", summary: "دریافت جزئیات دسته‌بندی" },
  { method: "get", path: "/persons", tag: "اشخاص", summary: "دریافت فهرست اشخاص", auth: "admin" },
  { method: "get", path: "/persons/{id}", tag: "اشخاص", summary: "دریافت شخص با شناسه" },
  { method: "post", path: "/persons", tag: "اشخاص", summary: "ایجاد شخص", auth: "admin", body: "json" },
  { method: "put", path: "/persons/{id}", tag: "اشخاص", summary: "ویرایش شخص", auth: "admin", body: "json" },
  { method: "delete", path: "/persons/{id}", tag: "اشخاص", summary: "حذف شخص", auth: "admin" },
  { method: "patch", path: "/persons/{id}/activate", tag: "اشخاص", summary: "فعال‌سازی شخص", auth: "admin" },
  { method: "patch", path: "/persons/{id}/deactivate", tag: "اشخاص", summary: "غیرفعال‌سازی شخص", auth: "admin" },
  { method: "get", path: "/users", tag: "کاربران مدیریتی", summary: "دریافت فهرست کاربران", auth: "admin" },
  { method: "get", path: "/users/{id}", tag: "کاربران مدیریتی", summary: "دریافت کاربر با شناسه", auth: "admin" },
  { method: "post", path: "/users", tag: "کاربران مدیریتی", summary: "ایجاد کاربر", auth: "admin", body: "json" },
  { method: "put", path: "/users/{id}", tag: "کاربران مدیریتی", summary: "ویرایش کاربر", auth: "admin", body: "json" },
  { method: "delete", path: "/users/{id}", tag: "کاربران مدیریتی", summary: "حذف کاربر", auth: "admin" },
  { method: "patch", path: "/users/{id}/activate", tag: "کاربران مدیریتی", summary: "فعال‌سازی کاربر", auth: "admin" },
  { method: "patch", path: "/users/{id}/deactivate", tag: "کاربران مدیریتی", summary: "غیرفعال‌سازی کاربر", auth: "admin" },

  // Customer
  { method: "get", path: "/cart", tag: "سبد خرید", summary: "دریافت سبد خرید مشتری", auth: "customer" },
  { method: "post", path: "/cart/items", tag: "سبد خرید", summary: "افزودن کالا به سبد خرید", auth: "customer", body: "json" },
  { method: "patch", path: "/cart/items/{goodId}", tag: "سبد خرید", summary: "به‌روزرسانی تعداد کالای سبد", auth: "customer", body: "json" },
  { method: "delete", path: "/cart/items/{goodId}", tag: "سبد خرید", summary: "حذف کالا از سبد خرید", auth: "customer" },
  { method: "delete", path: "/cart", tag: "سبد خرید", summary: "خالی کردن سبد خرید", auth: "customer" },
  { method: "post", path: "/orders", tag: "سفارش‌ها", summary: "ثبت سفارش مشتری", auth: "customer", body: "json" },
  { method: "get", path: "/orders", tag: "سفارش‌ها", summary: "دریافت سفارش‌های مشتری", auth: "customer" },
  { method: "get", path: "/orders/{id}", tag: "سفارش‌ها", summary: "دریافت جزئیات سفارش", auth: "customer" },
  { method: "post", path: "/order", tag: "سفارش‌ها", summary: "ثبت سفارش (مسیر سازگاری)", auth: "customer", body: "json" },
  { method: "get", path: "/order", tag: "سفارش‌ها", summary: "دریافت سفارش‌ها (مسیر سازگاری)", auth: "customer" },
  { method: "get", path: "/order/{id}", tag: "سفارش‌ها", summary: "دریافت جزئیات سفارش (مسیر سازگاری)", auth: "customer" },
  { method: "get", path: "/locations/provinces", tag: "مناطق و نشانی‌ها", summary: "دریافت استان‌ها" },
  { method: "get", path: "/locations/provinces/{id}/cities", tag: "مناطق و نشانی‌ها", summary: "دریافت شهرهای استان" },
  { method: "get", path: "/locations/address/me", tag: "مناطق و نشانی‌ها", summary: "دریافت نشانی‌های مشتری", auth: "customer" },
  { method: "get", path: "/locations/address/{id}", tag: "مناطق و نشانی‌ها", summary: "دریافت نشانی با شناسه" },
  { method: "post", path: "/locations/address/me", tag: "مناطق و نشانی‌ها", summary: "ثبت نشانی تحویل مشتری", auth: "customer", body: "json" },
  { method: "get", path: "/branches", tag: "شعب", summary: "دریافت شعب قابل انتخاب" },
  { method: "get", path: "/branches/admin", tag: "مدیریت شعب", summary: "دریافت تنظیمات شعب", auth: "admin" },
  { method: "get", path: "/branches/admin/options", tag: "مدیریت شعب", summary: "دریافت گزینه‌های تنظیم شعب", auth: "admin" },
  { method: "put", path: "/branches/admin/{branchId}", tag: "مدیریت شعب", summary: "ثبت تنظیمات شعبه", auth: "admin", body: "json" },
  { method: "get", path: "/payment/methods", tag: "پرداخت", summary: "دریافت روش‌های پرداخت" },
  { method: "get", path: "/payment/methods/{id}", tag: "پرداخت", summary: "دریافت جزئیات روش پرداخت" },
  { method: "get", path: "/payment/statuses", tag: "پرداخت", summary: "دریافت وضعیت‌های پرداخت" },
  { method: "get", path: "/payment/statuses/{id}", tag: "پرداخت", summary: "دریافت جزئیات وضعیت پرداخت" },
  { method: "post", path: "/payment/order/{orderId}", tag: "پرداخت", summary: "شروع پرداخت سفارش", auth: "customer", body: "json" },
  { method: "get", path: "/payment/bank-accounts", tag: "پرداخت", summary: "دریافت حساب‌های بانکی قابل نمایش" },
  { method: "post", path: "/payment/order/{orderId}/receipt", tag: "پرداخت", summary: "ثبت رسید پرداخت سفارش", auth: "customer", body: "json" },

  // Admin
  { method: "get", path: "/admin/products", tag: "مدیریت محصولات", summary: "دریافت فهرست محصولات پنل", auth: "admin" },
  { method: "patch", path: "/admin/products/{id}/visibility", tag: "مدیریت محصولات", summary: "تغییر وضعیت نمایش محصول", auth: "admin", body: "json" },
  { method: "post", path: "/admin/products/{id}/images", tag: "مدیریت محصولات", summary: "بارگذاری تصاویر محصول", auth: "admin", body: "multipart" },
  { method: "patch", path: "/admin/products/{id}/images/{imageId}/default", tag: "مدیریت محصولات", summary: "انتخاب تصویر پیش‌فرض محصول", auth: "admin" },
  { method: "delete", path: "/admin/products/{id}/images/{imageId}", tag: "مدیریت محصولات", summary: "حذف تصویر محصول", auth: "admin" },
  { method: "get", path: "/admin/categories", tag: "مدیریت دسته‌بندی‌ها", summary: "دریافت دسته‌بندی‌ها در پنل", auth: "admin" },
  { method: "patch", path: "/admin/categories/{id}/visibility", tag: "مدیریت دسته‌بندی‌ها", summary: "تغییر وضعیت نمایش دسته‌بندی", auth: "admin", body: "json" },
  { method: "patch", path: "/admin/categories/{id}/display-order", tag: "مدیریت دسته‌بندی‌ها", summary: "تغییر ترتیب نمایش دسته‌بندی", auth: "admin", body: "json" },
  { method: "patch", path: "/admin/categories/{id}/icon", tag: "مدیریت دسته‌بندی‌ها", summary: "تغییر آیکون دسته‌بندی", auth: "admin", body: "json" },
  { method: "get", path: "/admin/dashboard", tag: "داشبورد مدیریت", summary: "دریافت اطلاعات داشبورد مدیریت", auth: "admin" },
  { method: "get", path: "/admin/sliders", tag: "مدیریت اسلایدر", summary: "دریافت اسلایدرها در پنل", auth: "admin" },
  { method: "post", path: "/admin/sliders", tag: "مدیریت اسلایدر", summary: "ایجاد اسلایدر", auth: "admin", body: "json" },
  { method: "patch", path: "/admin/sliders/{id}", tag: "مدیریت اسلایدر", summary: "ویرایش اسلایدر", auth: "admin", body: "json" },
  { method: "post", path: "/admin/sliders/{id}/image", tag: "مدیریت اسلایدر", summary: "بارگذاری تصویر اسلایدر", auth: "admin", body: "multipart" },
  { method: "delete", path: "/admin/sliders/{id}", tag: "مدیریت اسلایدر", summary: "حذف اسلایدر", auth: "admin" },
  { method: "get", path: "/admin/footer", tag: "مدیریت فوتر", summary: "دریافت تنظیمات فوتر", auth: "admin" },
  { method: "patch", path: "/admin/footer", tag: "مدیریت فوتر", summary: "ویرایش تنظیمات فوتر", auth: "admin", body: "json" },
  { method: "post", path: "/admin/footer/images/{field}", tag: "مدیریت فوتر", summary: "بارگذاری تصویر فوتر", auth: "admin", body: "multipart" },
  { method: "delete", path: "/admin/footer/images/{field}", tag: "مدیریت فوتر", summary: "حذف تصویر فوتر", auth: "admin" },
  { method: "get", path: "/admin/bank-accounts", tag: "مدیریت حساب‌های بانکی", summary: "دریافت حساب‌های بانکی", auth: "admin" },
  { method: "patch", path: "/admin/bank-accounts/{id}", tag: "مدیریت حساب‌های بانکی", summary: "ویرایش وضعیت حساب بانکی", auth: "admin", body: "json" },
  { method: "get", path: "/admin/payment-receipts", tag: "مدیریت رسیدهای پرداخت", summary: "دریافت رسیدهای در انتظار بررسی", auth: "admin" },
  { method: "patch", path: "/admin/payment-receipts/{orderId}/approve", tag: "مدیریت رسیدهای پرداخت", summary: "تأیید رسید پرداخت", auth: "admin", body: "json" },
  { method: "patch", path: "/admin/payment-receipts/{orderId}/reject", tag: "مدیریت رسیدهای پرداخت", summary: "رد رسید پرداخت", auth: "admin", body: "json" },
  { method: "get", path: "/admin/payment-methods", tag: "مدیریت روش‌های پرداخت", summary: "دریافت روش‌های پرداخت در پنل", auth: "admin" },
  { method: "patch", path: "/admin/payment-methods/{id}", tag: "مدیریت روش‌های پرداخت", summary: "تغییر وضعیت روش پرداخت", auth: "admin", body: "json" },
];

const tags = [...new Set(routes.map((route) => route.tag))].map((name) => ({
  name,
  description: `عملیات مربوط به ${name}`,
}));

const pathParameters = (path: string) =>
  [...path.matchAll(/\{([^}]+)\}/g)].map((match) => ({
    name: match[1],
    in: "path",
    required: true,
    schema: { type: "string" },
  }));

const genericResponse = {
  description: "پاسخ API؛ ساختار دقیق داده به عملیات و وضعیت درخواست وابسته است.",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data: { description: "داده خروجی عملیات" },
        },
      },
    },
  },
};

const paths: Record<string, Record<string, unknown>> = {};

for (const route of routes) {
  paths[route.path] ??= {};
  const operation: Record<string, unknown> = {
    tags: [route.tag],
    summary: route.summary,
    description: route.auth
      ? `نیازمند نشست معتبر با سطح دسترسی ${route.auth === "admin" ? "مدیر" : route.auth === "customer" ? "مشتری" : "کاربر احراز هویت‌شده"} است.`
      : "این مسیر طبق Route فعلی پروژه عمومی است.",
    parameters: pathParameters(route.path),
    responses: {
      "200": genericResponse,
      "400": { description: "درخواست نامعتبر یا داده ورودی نادرست" },
      "401": { description: "احراز هویت انجام نشده یا نشست معتبر نیست" },
      "403": { description: "دسترسی کافی وجود ندارد" },
      "500": { description: "خطای داخلی سرور" },
    },
  };

  if (route.auth) {
    operation.security = [{ bearerAuth: [] }, { sessionCookie: [] }];
  }

  if (route.body === "json") {
    operation.requestBody = {
      required: true,
      description: "فیلدهای دقیق ورودی باید مطابق قرارداد همان عملیات ارسال شوند.",
      content: {
        "application/json": {
          schema: { type: "object", additionalProperties: true },
        },
      },
    };
  } else if (route.body === "multipart") {
    operation.requestBody = {
      required: true,
      content: {
        "multipart/form-data": {
          schema: { type: "object", additionalProperties: { type: "string", format: "binary" } },
        },
      },
    };
  }

  paths[route.path][route.method] = operation;
}

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Shop Backend API",
    version: "1.0.0",
    description: [
      "مستندات API بک‌اند فروشگاه.",
      "",
      "احراز هویت با Cookie نشست یا Bearer Token انجام می‌شود.",
      "پس از ورود موفق، Cookie با نام shop_session صادر می‌شود.",
      "برای استفاده از Bearer Token، مقدار توکن نشست را در بخش Authorize وارد کنید.",
      "",
      "توجه: ساختار کلی پاسخ‌ها نمایش داده شده است. برای مشاهده قرارداد دقیق فیلدهای هر درخواست و پاسخ، باید Schema همان Controller تکمیل شود.",
    ].join("\n"),
  },
  servers: [{ url: "/", description: "همین سرور" }],
  tags,
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "Session token" },
      sessionCookie: { type: "apiKey", in: "cookie", name: "shop_session" },
    },
  },
  paths,
};
