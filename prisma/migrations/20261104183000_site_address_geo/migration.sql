IF OBJECT_ID(N'dbo.SiteAddressGeo', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.SiteAddressGeo (
    Address_ID BIGINT NOT NULL,
    Latitude DECIMAL(10, 7) NOT NULL,
    Longitude DECIMAL(10, 7) NOT NULL,
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_SiteAddressGeo_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_SiteAddressGeo PRIMARY KEY (Address_ID),
    CONSTRAINT FK_SiteAddressGeo_Address FOREIGN KEY (Address_ID)
      REFERENCES dbo.OrderDeliveryAddress(RowID) ON DELETE CASCADE,
    CONSTRAINT CK_SiteAddressGeo_Latitude CHECK (Latitude BETWEEN -90 AND 90),
    CONSTRAINT CK_SiteAddressGeo_Longitude CHECK (Longitude BETWEEN -180 AND 180)
  );
END;
