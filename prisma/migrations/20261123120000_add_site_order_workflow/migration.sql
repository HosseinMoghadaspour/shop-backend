IF OBJECT_ID(N'dbo.SiteOrderWorkflow', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.SiteOrderWorkflow (
    OrderH_ID BIGINT NOT NULL,
    Status TINYINT NOT NULL CONSTRAINT DF_SiteOrderWorkflow_Status DEFAULT (1),
    ShippingCost MONEY NULL,
    AdminNote NVARCHAR(500) NULL,
    QuoteExpiresAt DATETIME NULL,
    CustomerAcceptedAt DATETIME NULL,
    CustomerRejectedAt DATETIME NULL,
    CreatedAt DATETIME NOT NULL CONSTRAINT DF_SiteOrderWorkflow_CreatedAt DEFAULT (GETDATE()),
    UpdatedAt DATETIME NULL,
    CONSTRAINT PK_SiteOrderWorkflow PRIMARY KEY (OrderH_ID),
    CONSTRAINT FK_SiteOrderWorkflow_OrderH FOREIGN KEY (OrderH_ID) REFERENCES dbo.OrderH(RowID),
    CONSTRAINT CK_SiteOrderWorkflow_Status CHECK (Status IN (1,2,3,4,5,6)),
    CONSTRAINT CK_SiteOrderWorkflow_ShippingCost CHECK (ShippingCost IS NULL OR ShippingCost >= 0)
  );
  CREATE INDEX IX_SiteOrderWorkflow_Status_CreatedAt
    ON dbo.SiteOrderWorkflow(Status, CreatedAt DESC);
END;
