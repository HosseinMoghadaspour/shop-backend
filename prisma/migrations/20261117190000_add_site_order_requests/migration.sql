IF OBJECT_ID(N'dbo.SiteOrderRequest', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SiteOrderRequest (
        RowID BIGINT IDENTITY(1,1) NOT NULL,
        OrderH_ID BIGINT NOT NULL,
        Person_ID INT NOT NULL,
        RequestType TINYINT NOT NULL,
        Message NVARCHAR(1000) NOT NULL,
        Status TINYINT NOT NULL CONSTRAINT DF_SiteOrderRequest_Status DEFAULT (1),
        AdminResponse NVARCHAR(1000) NULL,
        CreatedAt DATETIME NOT NULL CONSTRAINT DF_SiteOrderRequest_CreatedAt DEFAULT (GETDATE()),
        UpdatedAt DATETIME NULL,
        CONSTRAINT PK_SiteOrderRequest PRIMARY KEY CLUSTERED (RowID),
        CONSTRAINT CK_SiteOrderRequest_RequestType CHECK (RequestType IN (1, 2)),
        CONSTRAINT CK_SiteOrderRequest_Status CHECK (Status IN (1, 2, 3, 4)),
        CONSTRAINT FK_SiteOrderRequest_OrderH FOREIGN KEY (OrderH_ID)
            REFERENCES dbo.OrderH(RowID),
        CONSTRAINT FK_SiteOrderRequest_Person FOREIGN KEY (Person_ID)
            REFERENCES dbo.Person(RowID)
    );

    CREATE INDEX IX_SiteOrderRequest_Order_Person
        ON dbo.SiteOrderRequest(OrderH_ID, Person_ID, CreatedAt DESC);

    CREATE INDEX IX_SiteOrderRequest_Status_CreatedAt
        ON dbo.SiteOrderRequest(Status, CreatedAt DESC);

    CREATE UNIQUE INDEX UX_SiteOrderRequest_OneOpenCancellation
        ON dbo.SiteOrderRequest(OrderH_ID, Person_ID)
        WHERE RequestType = 1 AND (Status = 1 OR Status = 2);
END;
