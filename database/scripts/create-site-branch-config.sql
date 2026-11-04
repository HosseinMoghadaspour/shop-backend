/*
  Run once against the shop SQL Server database.
  This table keeps online-store branch settings separate from the accounting schema.
*/
IF OBJECT_ID(N'dbo.SiteBranchConfig', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.SiteBranchConfig
  (
    Branch_ID INT NOT NULL,
    City_ID INT NOT NULL,
    Warehouse_ID SMALLINT NOT NULL,
    SalePriceType_ID INT NULL,
    Latitude DECIMAL(10, 7) NULL,
    Longitude DECIMAL(10, 7) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_SiteBranchConfig_IsActive DEFAULT (1),
    IsDefault BIT NOT NULL CONSTRAINT DF_SiteBranchConfig_IsDefault DEFAULT (0),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_SiteBranchConfig_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_SiteBranchConfig_UpdatedAt DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT PK_SiteBranchConfig PRIMARY KEY (Branch_ID),
    CONSTRAINT FK_SiteBranchConfig_Branch FOREIGN KEY (Branch_ID)
      REFERENCES dbo.Branch(RowID),
    CONSTRAINT FK_SiteBranchConfig_City FOREIGN KEY (City_ID)
      REFERENCES dbo.City(RowID),
    CONSTRAINT FK_SiteBranchConfig_Warehouse FOREIGN KEY (Warehouse_ID)
      REFERENCES dbo.Warehouse(RowID),
    CONSTRAINT CK_SiteBranchConfig_Latitude CHECK (Latitude IS NULL OR Latitude BETWEEN -90 AND 90),
    CONSTRAINT CK_SiteBranchConfig_Longitude CHECK (Longitude IS NULL OR Longitude BETWEEN -180 AND 180),
    CONSTRAINT CK_SiteBranchConfig_Coordinates CHECK ((Latitude IS NULL AND Longitude IS NULL) OR (Latitude IS NOT NULL AND Longitude IS NOT NULL))
  );
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID(N'dbo.SiteBranchConfig')
    AND name = N'UX_SiteBranchConfig_OneDefaultPerCity'
)
BEGIN
  CREATE UNIQUE INDEX UX_SiteBranchConfig_OneDefaultPerCity
    ON dbo.SiteBranchConfig(City_ID)
    WHERE IsDefault = 1 AND IsActive = 1;
END;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID(N'dbo.SiteBranchConfig')
    AND name = N'IX_SiteBranchConfig_CityActive'
)
BEGIN
  CREATE INDEX IX_SiteBranchConfig_CityActive
    ON dbo.SiteBranchConfig(City_ID, IsActive)
    INCLUDE (Branch_ID, Warehouse_ID, SalePriceType_ID, Latitude, Longitude, IsDefault);
END;
GO
