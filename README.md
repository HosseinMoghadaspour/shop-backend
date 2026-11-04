# Shop Backend

Backend فروشگاه با Node.js، Hono، TypeScript، Prisma و SQL Server.

## Run

```bash
pnpm install
pnpm dev
```

Server:

```text
http://localhost:3000
```

## Public Product API

### List

```http
GET /products
```

Query parameters:

- `search`
- `categoryId`
- `brandId`
- `producerId`
- `minPrice`
- `maxPrice`
- `isSpecialSale=true|false`
- `amazingSale=true|false`
- `branchId`
- `salePriceTypeId`
- `page`
- `limit` (max 100)

قیمت‌های `minPrice` و `maxPrice` بر اساس `finalPrice` محاسبه می‌شوند؛ یعنی قیمت شعبه، نوع قیمت انتخابی و تخفیف در محاسبه لحاظ می‌شوند.

### Product detail

```http
GET /products/:id
GET /products/code/:code
```

برای انتخاب قیمت شعبه یا Price Type می‌توان از این queryها استفاده کرد:

```text
?branchId=1
?salePriceTypeId=2
?branchId=1&salePriceTypeId=2
```

### Special lists

```http
GET /products/amazing?limit=12
GET /products/new?limit=12
```

تمام endpointهای عمومی محصول، اطلاعات مالی حساس مانند `PurchasePrice` و `CostOfGood` را در response برنمی‌گردانند.

## Pricing

قیمت پایه از `Good` خوانده می‌شود. در صورت وجود قیمت شعبه، قیمت شعبه روی قیمت پایه اعمال می‌شود. اگر `salePriceTypeId` ارسال شده باشد، قیمت آن Price Type اولویت بالاتری دارد. سپس `DiscountPrice` معتبر بررسی و `finalPrice` محاسبه می‌شود.

برای جلوگیری از N+1، قیمت شعبه و Price Type در لیست محصولات به صورت batch خوانده می‌شوند.

## Online store branch setup

قبل از استفاده از انتخاب شعبه، اسکریپت زیر را یک‌بار روی دیتابیس فروشگاه اجرا کنید:

`database/scripts/setup-online-store-branch-tables.sql`

این اسکریپت دو جدول اختصاصی فروشگاه اینترنتی ایجاد می‌کند:

- `dbo.SiteBranchConfig`: اتصال شعبه به شهر، انبار، نوع قیمت، مختصات و شعبه پیش‌فرض.
- `dbo.SiteAddressGeo`: مختصات اختیاری آدرس‌های تحویل، بدون تغییر ساختار جدول حسابداری `OrderDeliveryAddress`.

بعد از اجرای اسکریپت، از پنل مدیریت مسیر `/admin/branches` برای هر شعبه شهر، انبار فعال همان شعبه، نوع قیمت و مختصات شعبه را تنظیم کنید. برای هر شهر فقط یک شعبه فعال را به‌عنوان پیش‌فرض انتخاب کنید.

مشتری می‌تواند موقعیت آدرس را هنگام ثبت آدرس با GPS ثبت کند یا مختصات را دستی وارد کند. اگر مختصات آدرس و شعبه‌ها موجود باشد، شعبه‌ها بر اساس فاصله مرتب می‌شوند؛ در غیر این صورت شعبه پیش‌فرض شهر پیشنهاد می‌شود.
