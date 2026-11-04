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

قیمت پایه از `Good` خوانده می‌شود. در صورت وجود قیمت شعبه، قیمت شعبه روی قیمت پایه اعمال می‌شود. وقتی `branchId` ارسال شده باشد، نوع قیمت ثبت‌شده در `SiteBranchConfig` همان شعبه مبناست و `salePriceTypeId` ارسالی نمی‌تواند تنظیم شعبه را دور بزند. اگر `branchId` ارسال نشود، `salePriceTypeId` صریح یا نوع قیمت شعبه پیش‌فرض اعمال می‌شود. سپس `DiscountPrice` معتبر بررسی و `finalPrice` محاسبه می‌شود.

برای جلوگیری از N+1، قیمت شعبه و Price Type در لیست محصولات به صورت batch خوانده می‌شوند.

## Online store branch setup

برای ساخت جداول اختصاصی فروشگاه اینترنتی، یکی از این دو روش را انتخاب کنید:

- اجرای migrationهای Prisma با `pnpm exec prisma migrate deploy`
- یا اجرای یک‌باره اسکریپت `database/scripts/setup-online-store-branch-tables.sql` روی دیتابیس فروشگاه

دو جدول خارج از ساختار حسابداری ساخته می‌شوند:

- `dbo.SiteBranchConfig`: اتصال هر شعبه به شهر، انبار فعال، نوع قیمت، مختصات شعبه و وضعیت پیش‌فرض.
- `dbo.SiteAddressGeo`: مختصات آدرس تحویل مشتری؛ بدون افزودن ستون به جدول حسابداری `OrderDeliveryAddress`.

بعد از آماده‌شدن جداول، از پنل مدیریت در مسیر `/admin/branches` برای هر شعبه شهر، انبار همان شعبه، نوع قیمت و مختصات را تنظیم کنید. برای هر شهر حداکثر یک شعبه فعال را به‌عنوان پیش‌فرض تعیین کنید.

مشتری پس از ورود، اگر آدرسی نداشته باشد به صفحه ثبت آدرس هدایت می‌شود. موقعیت آدرس با اجازه صریح کاربر از GPS یا با واردکردن مختصات ثبت می‌شود. شعب همان شهر بر اساس فاصله مرتب می‌شوند؛ نزدیک‌ترین شعبه به‌صورت پیش‌فرض انتخاب می‌شود و مشتری می‌تواند شعبه دیگری را انتخاب کند. در نبود مختصات، شعبه پیش‌فرض شهر پیشنهاد می‌شود.

شناسه شعبه انتخابی در درخواست محصولات و سبد خرید استفاده می‌شود. بک‌اند قیمت و موجودی را بر اساس تنظیمات همان شعبه محاسبه می‌کند و هنگام ثبت سفارش، تطابق شعبه با شهر آدرس، انبار و نوع قیمت را دوباره اعتبارسنجی می‌کند.
