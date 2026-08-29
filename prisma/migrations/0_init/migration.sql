BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[Good] (
    [RowID] INT NOT NULL,
    [Branch_ID] INT,
    [GoodCategory_ID] INT,
    [Main_MeasureUnit_ID] INT,
    [Default_MeasureUnit_ID] INT,
    [Fix_GoodType_ID] TINYINT NOT NULL,
    [DiscountGroupGood_ID] INT,
    [TaxGroupGood_ID] INT,
    [RowCode] NVARCHAR(50) NOT NULL,
    [RowName] NVARCHAR(250) NOT NULL,
    [RowNameEN] NVARCHAR(250),
    [RowNameAlias] NVARCHAR(250),
    [PurchasePrice] MONEY NOT NULL,
    [SalePrice] MONEY NOT NULL,
    [DiscountPrice] MONEY,
    [ConsumerPrice] MONEY,
    [OrderPoint] FLOAT(53),
    [FirstStock] FLOAT(53),
    [IsActive] BIT NOT NULL,
    [RowDesc] NVARCHAR(500),
    [InsertedBy] SMALLINT,
    [UpdatedBy] SMALLINT,
    [FDateInsert] CHAR(10),
    [FDateUpdate] CHAR(10),
    [FTimeInsert] CHAR(5),
    [FTimeUpdate] CHAR(5),
    [InsertServerDateTime] DATETIME2,
    [UpdateServerDateTime] DATETIME2,
    [RowUpdateVersion] SMALLINT,
    [UniqueIdentifierValue] UNIQUEIDENTIFIER,
    [ConvertRowID] NVARCHAR(100),
    [ConvertRowCode] NVARCHAR(100),
    [IsSend] TINYINT,
    [PurchasePriceAverage] MONEY,
    [IsHasSize] BIT,
    [Warehouse_ID] SMALLINT,
    [FDate] CHAR(10),
    [MDate] DATETIME2,
    [GoodNameIndexInPrintInvoice] SMALLINT,
    [InterestRate] FLOAT(53),
    [Producers_ID] BIGINT,
    [IsShowInOnlineShop] BIT,
    [BriefDescription] NVARCHAR(4000),
    [FullDescription] NVARCHAR(max),
    [IsSpecialSale] BIT,
    [Reversion] INT,
    [MaxCount] FLOAT(53),
    [QuantityInBox] NVARCHAR(100),
    [CostOfGood] MONEY,
    [MultipleSalePrice] BIT,
    [ServerRowID] INT,
    [ClientRowID] INT,
    [SpecialCategory] BIT,
    [ShowInStoreInvoice] BIT,
    [TransforRate] MONEY,
    [AmountSaleLimit] FLOAT(53),
    [ClientVersion] BIGINT,
    [TaxCode] NVARCHAR(50),
    [TaxName] NVARCHAR(250),
    [TaxPercent] DECIMAL(18,3),
    [StatusTax] INT,
    [ProducerPrice] MONEY,
    [LastPrice] MONEY,
    [AmazingSale] BIT,
    [MinOrderSite] DECIMAL(18,3),
    [MaxOrderSite] DECIMAL(18,3),
    [MinSiteShow] DECIMAL(18,3),
    [SiteName] NTEXT,
    [Garanti] NTEXT,
    [width] FLOAT(53),
    [height] FLOAT(53),
    [Length] FLOAT(53),
    [Weight] FLOAT(53),
    [BrandID] INT,
    [ShowInCofferMenu] BIT,
    [BarcodeForKalabarg] NVARCHAR(50),
    [ProfitFromConsumer] FLOAT(53),
    CONSTRAINT [Good_pkey] PRIMARY KEY CLUSTERED ([RowID])
);

-- CreateTable
CREATE TABLE [dbo].[GoodCategory] (
    [RowID] INT NOT NULL,
    [Branch_ID] INT,
    [GoodCategory_ID] INT,
    [RowCode] NVARCHAR(20) NOT NULL,
    [RowName] NVARCHAR(100) NOT NULL,
    [IsActive] BIT NOT NULL,
    [RowDesc] NVARCHAR(500),
    [InsertedBy] SMALLINT,
    [UpdatedBy] SMALLINT,
    [FDateInsert] CHAR(10),
    [FDateUpdate] CHAR(10),
    [FTimeInsert] CHAR(5),
    [FTimeUpdate] CHAR(5),
    [InsertServerDateTime] DATETIME2,
    [UpdateServerDateTime] DATETIME2,
    [RowUpdateVersion] SMALLINT,
    [UniqueIdentifierValue] UNIQUEIDENTIFIER,
    [ConvertRowID] NVARCHAR(100),
    [IsSend] TINYINT,
    [GoodCategoryMoreInfo] NVARCHAR(4000),
    [URL] NVARCHAR(4000),
    [FullRowCode] NVARCHAR(4000),
    [FullRowName] NVARCHAR(4000),
    [IsShowInOnlineShop] BIT,
    [RowLevel] TINYINT,
    [Reversion] INT,
    [ShowInCoffer] BIT,
    [ShowOrder] INT,
    [ShowInAndroid] BIT,
    [OnlineCategoryImage] NTEXT,
    CONSTRAINT [GoodCategory_pkey] PRIMARY KEY CLUSTERED ([RowID])
);

-- CreateTable
CREATE TABLE [dbo].[GoodImagesWeb] (
    [RowID] BIGINT NOT NULL,
    [ImageUrl] NTEXT,
    [DefaultImage] BIT,
    [Alt] NTEXT,
    [Good_ID] INT,
    CONSTRAINT [GoodImagesWeb_pkey] PRIMARY KEY CLUSTERED ([RowID])
);

-- CreateTable
CREATE TABLE [dbo].[GoodMeasureUnit] (
    [RowID] INT NOT NULL,
    [Branch_ID] INT,
    [Good_ID] INT NOT NULL,
    [MeasureUnit_ID] INT NOT NULL,
    [TransformRatio] FLOAT(53) NOT NULL,
    [PurchasePrice] MONEY NOT NULL,
    [SalePrice] MONEY NOT NULL,
    [IsActive] BIT NOT NULL,
    [RowDesc] NVARCHAR(500),
    [InsertedBy] SMALLINT,
    [UpdatedBy] SMALLINT,
    [FDateInsert] CHAR(10),
    [FDateUpdate] CHAR(10),
    [FTimeInsert] CHAR(5),
    [FTimeUpdate] CHAR(5),
    [InsertServerDateTime] DATETIME2,
    [UpdateServerDateTime] DATETIME2,
    [RowUpdateVersion] SMALLINT,
    [UniqueIdentifierValue] UNIQUEIDENTIFIER,
    [IsSend] TINYINT,
    [ServerRowID] INT,
    [Reversion] INT,
    [ClientRowID] INT,
    [ConsumerPrice] MONEY,
    [LastPrice] MONEY,
    CONSTRAINT [GoodMeasureUnit_pkey] PRIMARY KEY CLUSTERED ([RowID])
);

-- CreateTable
CREATE TABLE [dbo].[MeasureUnit] (
    [RowID] INT NOT NULL,
    [Branch_ID] INT,
    [RowName] NVARCHAR(100) NOT NULL,
    [DefinedBySystem] BIT NOT NULL,
    [IsActive] BIT NOT NULL,
    [RowDesc] NVARCHAR(500),
    [InsertedBy] SMALLINT,
    [UpdatedBy] SMALLINT,
    [FDateInsert] CHAR(10),
    [FDateUpdate] CHAR(10),
    [FTimeInsert] CHAR(5),
    [FTimeUpdate] CHAR(5),
    [InsertServerDateTime] DATETIME2,
    [UpdateServerDateTime] DATETIME2,
    [RowUpdateVersion] SMALLINT,
    [UniqueIdentifierValue] UNIQUEIDENTIFIER,
    [IsSend] TINYINT,
    [ServerRowID] INT,
    [Reversion] INT,
    [ClientRowID] INT,
    [WeightOrAmount] TINYINT,
    [TaxCode] NVARCHAR(50),
    CONSTRAINT [MeasureUnit_pkey] PRIMARY KEY CLUSTERED ([RowID])
);

-- CreateTable
CREATE TABLE [dbo].[Producers] (
    [RowID] BIGINT NOT NULL,
    [RowName] NVARCHAR(100) NOT NULL,
    [ProducerImage] IMAGE,
    [BriefDescription] NVARCHAR(4000),
    [FullDescription] NVARCHAR(4000),
    [IsActive] BIT NOT NULL,
    [RowDesc] NVARCHAR(500),
    [InsertedBy] SMALLINT,
    [UpdatedBy] SMALLINT,
    [FDateInsert] CHAR(10),
    [FDateUpdate] CHAR(10),
    [FTimeInsert] CHAR(5),
    [FTimeUpdate] CHAR(5),
    [InsertServerDateTime] DATETIME2,
    [UpdateServerDateTime] DATETIME2,
    [RowUpdateVersion] SMALLINT,
    [UniqueIdentifierValue] NVARCHAR(1000),
    [Reversion] BIGINT,
    CONSTRAINT [Producers_pkey] PRIMARY KEY CLUSTERED ([RowID])
);

-- CreateTable
CREATE TABLE [dbo].[SalePriceType] (
    [RowID] BIGINT NOT NULL,
    [RowName] NVARCHAR(100) NOT NULL,
    [IsActive] BIT NOT NULL,
    [RowDesc] NVARCHAR(500),
    [InsertedBy] SMALLINT,
    [UpdatedBy] SMALLINT,
    [FDateInsert] CHAR(10),
    [FDateUpdate] CHAR(10),
    [FTimeInsert] CHAR(5),
    [FTimeUpdate] CHAR(5),
    [InsertServerDateTime] DATETIME2,
    [UpdateServerDateTime] DATETIME2,
    [RowUpdateVersion] SMALLINT,
    [UniqueIdentifierValue] NVARCHAR(1000),
    [Reversion] BIGINT,
    [BranchID] INT,
    CONSTRAINT [SalePriceType_pkey] PRIMARY KEY CLUSTERED ([RowID])
);

-- CreateTable
CREATE TABLE [dbo].[GoodSalePrice] (
    [RowID] INT NOT NULL,
    [Good_ID] INT NOT NULL,
    [SalePriceType_ID] BIGINT NOT NULL,
    [SalePrice] MONEY,
    [RowDesc] NVARCHAR(500),
    [UniqueIdentifierValue] NVARCHAR(1000),
    [ConsumerPrice] MONEY,
    [Reversion] INT,
    CONSTRAINT [GoodSalePrice_pkey] PRIMARY KEY CLUSTERED ([RowID])
);

-- CreateTable
CREATE TABLE [dbo].[GoodBranchPrice] (
    [RowID] BIGINT NOT NULL,
    [GID] INT,
    [BID] INT,
    [SalePrice] MONEY,
    [ConsumerPrice] MONEY,
    [BuyPrice] MONEY,
    [Fdate] NVARCHAR(50),
    [Mdate] DATETIME2,
    CONSTRAINT [GoodBranchPrice_pkey] PRIMARY KEY CLUSTERED ([RowID])
);

-- CreateTable
CREATE TABLE [dbo].[Branch] (
    [RowID] INT NOT NULL,
    [RowCode] BIGINT NOT NULL,
    [RowName] NVARCHAR(100) NOT NULL,
    [IsActive] BIT NOT NULL,
    [RowDesc] NVARCHAR(500),
    [UniqueIdentifierValue] NVARCHAR(1000),
    [Reversion] INT,
    [ServerID] INT,
    [ClientID] INT,
    [Warehouse_ID] INT,
    [MainBranch] BIT,
    [ApiKey] NTEXT,
    [AdminName] NVARCHAR(500),
    [Address] NTEXT,
    [Franchize] BIT,
    [AdminTel] NVARCHAR(50),
    CONSTRAINT [Branch_pkey] PRIMARY KEY CLUSTERED ([RowID])
);

-- CreateTable
CREATE TABLE [dbo].[Warehouse] (
    [RowID] SMALLINT NOT NULL,
    [Branch_ID] INT,
    [RowName] NVARCHAR(100) NOT NULL,
    [IsActive] BIT NOT NULL,
    [RowDesc] NVARCHAR(500),
    [UniqueIdentifierValue] NVARCHAR(1000),
    [IsSend] TINYINT,
    [Reversion] INT,
    [Type] BIT,
    [BranchID] INT,
    [RequestMinus] BIT,
    [RequestCheckReserve] BIT,
    CONSTRAINT [Warehouse_pkey] PRIMARY KEY CLUSTERED ([RowID])
);

-- CreateTable
CREATE TABLE [dbo].[OrderH] (
    [RowID] BIGINT NOT NULL,
    [Branch_ID] INT,
    [FinancialYear_ID] SMALLINT NOT NULL,
    [Fix_RecordStatusType_ID] TINYINT NOT NULL,
    [Fix_DiscountType_ID] TINYINT,
    [Person_ID] INT,
    [DocNo] BIGINT NOT NULL,
    [FDate] CHAR(10) NOT NULL,
    [MDate] DATETIME2,
    [DiscountPercent] FLOAT(53),
    [DiscountPrice] MONEY,
    [TaxPercent] FLOAT(53),
    [TaxPrice] MONEY,
    [TotalPrice] MONEY,
    [QuantityInUnitPrice] MONEY,
    [TotalDiscountPriceItems] MONEY,
    [TotalTaxPriceItems] MONEY,
    [TotalIncreasePrice] MONEY,
    [TotalDecreasePrice] MONEY,
    [ShippingCost] MONEY,
    [PayablePrice] MONEY,
    [ReferenceValue] NVARCHAR(500),
    [DefinedBySystem] BIT NOT NULL,
    [IsOnlineOrder] BIT,
    [Conditions] NVARCHAR(max),
    [ExpirationDays] CHAR(10),
    [ExpirationDate] CHAR(10),
    [RowDesc] NVARCHAR(500),
    [InsertedBy] SMALLINT,
    [UpdatedBy] SMALLINT,
    [FDateInsert] CHAR(10),
    [FDateUpdate] CHAR(10),
    [FTimeInsert] CHAR(5),
    [FTimeUpdate] CHAR(5),
    [InsertServerDateTime] DATETIME2,
    [UpdateServerDateTime] DATETIME2,
    [RowUpdateVersion] SMALLINT,
    [UniqueIdentifierValue] NVARCHAR(1000),
    [IsSend] TINYINT,
    [OrderDeliveryAddress_ID] BIGINT,
    [Fix_OrderPaymentMethod_ID] TINYINT,
    [DepositTrackingNumber] NVARCHAR(250),
    [DepositAmount] MONEY,
    [DepositYear] NVARCHAR(4),
    [DepositMonth] NVARCHAR(2),
    [DepositDay] NVARCHAR(2),
    [DepositHour] NVARCHAR(2),
    [DepositMinute] NVARCHAR(2),
    [DepositLastFourDigitsOfCreditCard] NVARCHAR(4),
    [PaymentConfirmationFDate] CHAR(10),
    [PaymentConfirmationFtime] CHAR(5),
    [PaymentConfirmationAmount] MONEY,
    [PaymentConfirmationBankAccount_ID] INT,
    [PaymentConfirmationCoffer_ID] INT,
    [Fix_OrderPaymentConfirmationStatus_ID] TINYINT,
    [Fix_OrderDeliveryStatus_ID] TINYINT,
    [IsWebUserCanEditRecord] BIT,
    [IsWebUserCanSeeRecord] BIT,
    [DepositBankAccount_ID] INT,
    [Fix_OrderSendID] INT,
    [OrderStatus] BIT,
    CONSTRAINT [OrderH_pkey] PRIMARY KEY CLUSTERED ([RowID])
);

-- CreateTable
CREATE TABLE [dbo].[OrderD] (
    [RowID] BIGINT NOT NULL,
    [Branch_ID] INT,
    [FinancialYear_ID] SMALLINT NOT NULL,
    [OrderH_ID] BIGINT NOT NULL,
    [Good_ID] INT NOT NULL,
    [MeasureUnit_ID] INT,
    [Main_MeasureUnit_ID] INT,
    [Fix_DiscountType_ID] TINYINT,
    [InputValue] FLOAT(53) NOT NULL,
    [CalculatedInputValue] FLOAT(53) NOT NULL,
    [OutputValue] FLOAT(53) NOT NULL,
    [CalculatedOutputValue] FLOAT(53) NOT NULL,
    [UnitPrice] MONEY NOT NULL,
    [TotalPrice] MONEY NOT NULL,
    [QuantityInUnitPrice] MONEY,
    [DiscountPercent] FLOAT(53),
    [DiscountPrice] MONEY,
    [PurchaseUnitPrice] MONEY,
    [PurchaseTotalPrice] MONEY,
    [PurchaseTotalPriceAverage] MONEY,
    [TaxPercent] FLOAT(53),
    [TaxPrice] MONEY,
    [SaleUnitPrice] MONEY,
    [RowDesc] NVARCHAR(500),
    [UniqueIdentifierValue] NVARCHAR(1000),
    [IsSend] TINYINT,
    CONSTRAINT [OrderD_pkey] PRIMARY KEY CLUSTERED ([RowID])
);

-- CreateTable
CREATE TABLE [dbo].[SiteModuleOrder] (
    [RowID] INT NOT NULL,
    [Name] NVARCHAR(50),
    [ISActive] BIT,
    [SortOrder] INT,
    CONSTRAINT [SiteModuleOrder_pkey] PRIMARY KEY CLUSTERED ([RowID])
);

-- CreateTable
CREATE TABLE [dbo].[SiteSlider] (
    [RowID] BIGINT NOT NULL,
    [UrlImage] NTEXT,
    [DescImage] NVARCHAR(max),
    [DescBut] NVARCHAR(100),
    [UrlSend] NTEXT,
    [Status] BIT,
    [Type] INT,
    [Description] NTEXT,
    CONSTRAINT [SiteSlider_pkey] PRIMARY KEY CLUSTERED ([RowID])
);

-- CreateTable
CREATE TABLE [dbo].[SiteFooterData] (
    [RowID] INT NOT NULL,
    [AboutText] NTEXT,
    [Address] NTEXT,
    [Phone1] NVARCHAR(50),
    [Phone2] NVARCHAR(50),
    [InstagramHandle] NTEXT,
    [TelegramHandle] NTEXT,
    [WhatsAppHandle] NTEXT,
    [EtaHandle] NTEXT,
    [Rubikahandle] NTEXT,
    [LogoImageUrl] NTEXT,
    [EnamadImageUrl] NTEXT,
    [ReziImageUrl] NTEXT,
    [SamandehiUrl] NTEXT,
    [DragahUrl] NTEXT,
    [LinkContactUs] NTEXT,
    [LinkAboutUs] NTEXT,
    [LinkFAQ] NTEXT,
    [LinkArticles] NTEXT,
    [Copyright] NTEXT,
    [SiteIcon] NTEXT,
    [SiteName] NVARCHAR(50),
    CONSTRAINT [SiteFooterData_pkey] PRIMARY KEY CLUSTERED ([RowID])
);

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [emailVerified] BIT NOT NULL CONSTRAINT [User_emailVerified_df] DEFAULT 0,
    [image] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [personId] INT,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email]),
    CONSTRAINT [User_personId_key] UNIQUE NONCLUSTERED ([personId])
);

-- CreateTable
CREATE TABLE [dbo].[Session] (
    [id] NVARCHAR(1000) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [token] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Session_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [ipAddress] NVARCHAR(1000),
    [userAgent] NVARCHAR(1000),
    [userId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Session_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Session_token_key] UNIQUE NONCLUSTERED ([token])
);

-- CreateTable
CREATE TABLE [dbo].[Account] (
    [id] NVARCHAR(1000) NOT NULL,
    [accountId] NVARCHAR(1000) NOT NULL,
    [providerId] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [accessToken] NVARCHAR(1000),
    [refreshToken] NVARCHAR(1000),
    [idToken] NVARCHAR(1000),
    [accessTokenExpiresAt] DATETIME2,
    [refreshTokenExpiresAt] DATETIME2,
    [scope] NVARCHAR(1000),
    [password] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Account_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Account_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Verification] (
    [id] NVARCHAR(1000) NOT NULL,
    [identifier] NVARCHAR(1000) NOT NULL,
    [value] NVARCHAR(1000) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Verification_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Verification_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Person] (
    [RowID] INT NOT NULL,
    [Branch_ID] INT,
    [Fix_PersonType_ID] INT,
    [PersonKind_ID] INT,
    [PersonCategory_ID] INT,
    [Fix_PersonRemainderType_ID] INT,
    [DiscountGroupPerson_ID] INT,
    [RowCode] NVARCHAR(50),
    [RowName] NVARCHAR(100),
    [PhoneNumber] NVARCHAR(200),
    [MobileNumber] NVARCHAR(200),
    [FaxNumber] NVARCHAR(200),
    [EconomicCode] NVARCHAR(200),
    [FatherName] NVARCHAR(100),
    [NationalCode] NVARCHAR(200),
    [BornLocation] NVARCHAR(200),
    [AccountNumber1] NVARCHAR(50),
    [AccountNumber2] NVARCHAR(50),
    [AccountNumber3] NVARCHAR(50),
    [Postalcode] NVARCHAR(200),
    [RegistrationCode] NVARCHAR(200),
    [Email] NVARCHAR(200),
    [Adress] NVARCHAR(500),
    [FDate] CHAR(10),
    [MDate] DATETIME2,
    [RemainderTot] MONEY,
    [IMG_1] VARBINARY(max),
    [IndebtednessRemanence] DECIMAL(18,0),
    [IsActive] BIT,
    [RowDesc] NVARCHAR(500),
    [InsertedBy] INT,
    [UpdatedBy] INT,
    [FDateInsert] CHAR(10),
    [FDateUpdate] CHAR(10),
    [FTimeInsert] CHAR(5),
    [FTimeUpdate] CHAR(5),
    [InsertServerDateTime] DATETIME2,
    [UpdateServerDateTime] DATETIME2,
    [RowUpdateVersion] INT,
    [UniqueIdentifierValue] UNIQUEIDENTIFIER,
    [ConvertRowID] NVARCHAR(100),
    [IsSend] INT,
    [MobileForSMS] NVARCHAR(11),
    [Province_ID] BIGINT,
    [County_ID] BIGINT,
    [City_ID] BIGINT,
    [Fix_MarketerPercentType_ID] INT,
    [Fix_MarketerPriceCriterionType_ID] INT,
    [PercentPrice] MONEY,
    [MarketerPercent] FLOAT(53),
    [AutomaticSettelAfterSale] BIT,
    [AutomaticSettelAfterSaleReturn] BIT,
    [OnlinePassword] NVARCHAR(50),
    [IsRegisteredOnline] BIT,
    [BornDay] INT,
    [BornMonth] INT,
    [BornYear] INT,
    [City] NVARCHAR(100),
    [Fix_Sex_ID] INT,
    [Company_Type_ID] INT,
    [CreditLimitPrice] MONEY,
    [Fix_CreditLimitActionType_ID] INT,
    [FDateLastSMS_ForDebt] CHAR(10),
    [MDateLastSMS_ForDebt] DATETIME2,
    [Reversion] INT,
    [ServerRowID] INT,
    [ClientRowID] INT,
    [SubscriptionCode] NVARCHAR(100),
    [BankName1] NVARCHAR(300),
    [BankName2] NVARCHAR(300),
    [BankName3] NVARCHAR(300),
    [CreditSelling] BIT,
    [PercentService] FLOAT(53),
    [CardPass] NVARCHAR(50),
    [EnablePass] BIT,
    [AgentPercent] FLOAT(53),
    [AddressShop] NTEXT,
    [NameShop] NVARCHAR(250),
    [ActiveCategory] NVARCHAR(50),
    [Shoppic] VARBINARY(max),
    [Licensepic] VARBINARY(max),
    [Shenasnamehpic] VARBINARY(max),
    [Nationalpic] VARBINARY(max),
    [UserName] NVARCHAR(250),
    [Passwrod] NVARCHAR(250),
    [FBornDate] NVARCHAR(50),
    [MBornDate] DATETIME2,
    [ClientVersion] BIGINT,
    [HyperPerson] BIT,
    [EtebarBestan] BIT,
    [p1] NVARCHAR(50),
    [p2] NVARCHAR(50),
    [p3] NVARCHAR(50),
    [p4] NVARCHAR(50),
    [CarType] NVARCHAR(150),
    [CarTypeID] INT,
    [CarWeight] FLOAT(53),
    [CarMinWeight] FLOAT(53),
    [CarMaxWeight] FLOAT(53),
    CONSTRAINT [Person_pkey] PRIMARY KEY CLUSTERED ([RowID])
);

-- CreateTable
CREATE TABLE [dbo].[UserInfo] (
    [RowID] SMALLINT NOT NULL,
    [RowName] NVARCHAR(100),
    [UserLoginName] NVARCHAR(50),
    [UserLoginPassword] NVARCHAR(50),
    [UserPermits_Menues] NVARCHAR(400),
    [UserPermits_INSERT] NVARCHAR(400),
    [UserPermits_UPDATE] NVARCHAR(400),
    [UserPermits_DELETE] NVARCHAR(400),
    [UserPermits_Special] NVARCHAR(400),
    [NationalCode] NVARCHAR(200),
    [FatherName] NVARCHAR(100),
    [Mobile] NVARCHAR(200),
    [Phone] NVARCHAR(200),
    [Address] NVARCHAR(500),
    [FDate] CHAR(10),
    [Mdate] DATETIME,
    [IsAdmin] BIT NOT NULL,
    [IsActive] BIT NOT NULL,
    [RowDesc] NVARCHAR(500),
    [UniqueIdentifierValue] UNIQUEIDENTIFIER,
    [Reversion] INT,
    [IsCashier] BIT NOT NULL,
    [ServerRowID] SMALLINT,
    [ClientRowID] SMALLINT,
    [BranchID] INT,
    [AdminSite] BIT NOT NULL,
    CONSTRAINT [UserInfo_pkey] PRIMARY KEY CLUSTERED ([RowID])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Good_IsActive_idx] ON [dbo].[Good]([IsActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Good_IsShowInOnlineShop_idx] ON [dbo].[Good]([IsShowInOnlineShop]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Good_GoodCategory_ID_idx] ON [dbo].[Good]([GoodCategory_ID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Good_Producers_ID_idx] ON [dbo].[Good]([Producers_ID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Good_BrandID_idx] ON [dbo].[Good]([BrandID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Good_RowCode_idx] ON [dbo].[Good]([RowCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GoodCategory_GoodCategory_ID_idx] ON [dbo].[GoodCategory]([GoodCategory_ID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GoodCategory_IsActive_idx] ON [dbo].[GoodCategory]([IsActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GoodCategory_IsShowInOnlineShop_idx] ON [dbo].[GoodCategory]([IsShowInOnlineShop]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GoodImagesWeb_Good_ID_idx] ON [dbo].[GoodImagesWeb]([Good_ID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GoodImagesWeb_DefaultImage_idx] ON [dbo].[GoodImagesWeb]([DefaultImage]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GoodMeasureUnit_Good_ID_idx] ON [dbo].[GoodMeasureUnit]([Good_ID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GoodMeasureUnit_MeasureUnit_ID_idx] ON [dbo].[GoodMeasureUnit]([MeasureUnit_ID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GoodMeasureUnit_IsActive_idx] ON [dbo].[GoodMeasureUnit]([IsActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [MeasureUnit_IsActive_idx] ON [dbo].[MeasureUnit]([IsActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Producers_IsActive_idx] ON [dbo].[Producers]([IsActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Producers_RowName_idx] ON [dbo].[Producers]([RowName]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SalePriceType_IsActive_idx] ON [dbo].[SalePriceType]([IsActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SalePriceType_BranchID_idx] ON [dbo].[SalePriceType]([BranchID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GoodSalePrice_Good_ID_idx] ON [dbo].[GoodSalePrice]([Good_ID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GoodSalePrice_SalePriceType_ID_idx] ON [dbo].[GoodSalePrice]([SalePriceType_ID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GoodBranchPrice_GID_idx] ON [dbo].[GoodBranchPrice]([GID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GoodBranchPrice_BID_idx] ON [dbo].[GoodBranchPrice]([BID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Branch_IsActive_idx] ON [dbo].[Branch]([IsActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Branch_MainBranch_idx] ON [dbo].[Branch]([MainBranch]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Warehouse_Branch_ID_idx] ON [dbo].[Warehouse]([Branch_ID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Warehouse_BranchID_idx] ON [dbo].[Warehouse]([BranchID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Warehouse_IsActive_idx] ON [dbo].[Warehouse]([IsActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OrderH_IsOnlineOrder_idx] ON [dbo].[OrderH]([IsOnlineOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OrderH_Person_ID_idx] ON [dbo].[OrderH]([Person_ID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OrderH_Branch_ID_idx] ON [dbo].[OrderH]([Branch_ID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OrderH_MDate_idx] ON [dbo].[OrderH]([MDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OrderD_OrderH_ID_idx] ON [dbo].[OrderD]([OrderH_ID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OrderD_Good_ID_idx] ON [dbo].[OrderD]([Good_ID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [OrderD_Branch_ID_idx] ON [dbo].[OrderD]([Branch_ID]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SiteModuleOrder_ISActive_idx] ON [dbo].[SiteModuleOrder]([ISActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SiteModuleOrder_SortOrder_idx] ON [dbo].[SiteModuleOrder]([SortOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SiteSlider_Status_idx] ON [dbo].[SiteSlider]([Status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [SiteSlider_Type_idx] ON [dbo].[SiteSlider]([Type]);

-- AddForeignKey
ALTER TABLE [dbo].[OrderD] ADD CONSTRAINT [OrderD_OrderH_ID_fkey] FOREIGN KEY ([OrderH_ID]) REFERENCES [dbo].[OrderH]([RowID]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[OrderD] ADD CONSTRAINT [OrderD_Good_ID_fkey] FOREIGN KEY ([Good_ID]) REFERENCES [dbo].[Good]([RowID]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_personId_fkey] FOREIGN KEY ([personId]) REFERENCES [dbo].[Person]([RowID]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Session] ADD CONSTRAINT [Session_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Account] ADD CONSTRAINT [Account_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
