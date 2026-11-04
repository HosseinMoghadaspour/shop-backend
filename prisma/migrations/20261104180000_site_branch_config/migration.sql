IF OBJECT_ID(N'dbo.SiteBranchConfig', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.SiteBranchConfig (
    Branch_ID INT NOT NULL,
    City_ID BIGINT NOT NULL,
    Warehouse_ID SMALLINT NOT NULL,
    SalePriceType_ID BIGINT NULL,
    Latitude DECIMAL(10, 7) NULL,
    Longitude DECIMAL(10, 7) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_SiteBranchConfig_IsActive DEFAULT (1),
    IsDefault BIT NOT NULL CONSTRAINT DF_SiteBranchConfig_IsDefault DEFAULT (0),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_SiteBranchConfig_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_SiteBranchConfig_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_SiteBranchConfig PRIMARY KEY (Branch_ID),
    CONSTRAINT FK_SiteBranchConfig_Branch FOREIGN KEY (Branch_ID) REFERENCES dbo.Branch(RowID),
    CONSTRAINT FK_SiteBranchConfig_City FOREIGN KEY (City_ID) REFERENCES dbo.City(RowID),
    CONSTRAINT FK_SiteBranchConfig_Warehouse FOREIGN KEY (Warehouse_ID) REFERENCES dbo.Warehouse(RowID),
    CONSTRAINT FK_SiteBranchConfig_SalePriceType FOREIGN KEY (SalePriceType_ID) REFERENCES dbo.SalePriceType(RowID),
    CONSTRAINT CK_SiteBranchConfig_Latitude CHECK (Latitude IS NULL OR Latitude BETWEEN -90 AND 90),
    CONSTRAINT CK_SiteBranchConfig_Longitude CHECK (Longitude IS NULL OR Longitude BETWEEN -180 AND 180),
    CONSTRAINT CK_SiteBranchConfig_Coordinates CHECK ((Latitude IS NULL AND Longitude IS NULL) OR (Latitude IS NOT NULL AND Longitude IS NOT NULL))
  );
  CREATE INDEX IX_SiteBranchConfig_CityActive ON dbo.SiteBranchConfig(City_ID, IsActive, IsDefault);
  CREATE UNIQUE INDEX UX_SiteBranchConfig_OneDefaultPerCity ON dbo.SiteBranchConfig(City_ID) WHERE IsDefault = 1 AND IsActive = 1;
END;
