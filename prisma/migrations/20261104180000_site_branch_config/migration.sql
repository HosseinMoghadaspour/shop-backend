IF OBJECT_ID(N'dbo.SiteBranchConfig', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.SiteBranchConfig (
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
    CONSTRAINT FK_SiteBranchConfig_Branch FOREIGN KEY (Branch_ID) REFERENCES dbo.Branch(RowID),
    CONSTRAINT FK_SiteBranchConfig_City FOREIGN KEY (City_ID) REFERENCES dbo.City(RowID),
    CONSTRAINT FK_SiteBranchConfig_Warehouse FOREIGN KEY (Warehouse_ID) REFERENCES dbo.Warehouse(RowID)
  );
  CREATE INDEX IX_SiteBranchConfig_City_Active ON dbo.SiteBranchConfig(City_ID, IsActive, IsDefault);
END;
