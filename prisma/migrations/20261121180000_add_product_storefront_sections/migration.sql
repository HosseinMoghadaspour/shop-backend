IF COL_LENGTH(N'dbo.Good', N'IsNewProduct') IS NULL
BEGIN
    ALTER TABLE dbo.Good
    ADD IsNewProduct BIT NOT NULL
        CONSTRAINT DF_Good_IsNewProduct DEFAULT (0);
END;

IF COL_LENGTH(N'dbo.Good', N'IsBestSelling') IS NULL
BEGIN
    ALTER TABLE dbo.Good
    ADD IsBestSelling BIT NOT NULL
        CONSTRAINT DF_Good_IsBestSelling DEFAULT (0);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_Good_OnlineShopSections'
      AND object_id = OBJECT_ID(N'dbo.Good')
)
BEGIN
    CREATE INDEX IX_Good_OnlineShopSections
    ON dbo.Good (IsActive, IsShowInOnlineShop, IsNewProduct, IsBestSelling);
END;
