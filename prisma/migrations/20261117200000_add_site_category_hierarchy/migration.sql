IF OBJECT_ID(N'dbo.SiteCategoryConfig', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SiteCategoryConfig (
        Category_ID INT NOT NULL,
        ParentCategory_ID INT NULL,
        UpdatedAt DATETIME NOT NULL CONSTRAINT DF_SiteCategoryConfig_UpdatedAt DEFAULT (GETDATE()),
        CONSTRAINT PK_SiteCategoryConfig PRIMARY KEY CLUSTERED (Category_ID),
        CONSTRAINT FK_SiteCategoryConfig_Category FOREIGN KEY (Category_ID)
            REFERENCES dbo.GoodCategory(RowID),
        CONSTRAINT FK_SiteCategoryConfig_ParentCategory FOREIGN KEY (ParentCategory_ID)
            REFERENCES dbo.GoodCategory(RowID),
        CONSTRAINT CK_SiteCategoryConfig_NotSelfParent CHECK
            (ParentCategory_ID IS NULL OR ParentCategory_ID <> Category_ID)
    );

    CREATE INDEX IX_SiteCategoryConfig_ParentCategory
        ON dbo.SiteCategoryConfig(ParentCategory_ID);
END;
