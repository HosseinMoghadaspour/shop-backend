IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.User')
      AND name = N'User_personId_key'
)
BEGIN
    ALTER TABLE [dbo].[User] DROP CONSTRAINT [User_personId_key];
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.User')
      AND name = N'User_personId_unique_not_null'
)
BEGIN
    CREATE UNIQUE INDEX [User_personId_unique_not_null]
    ON [dbo].[User] ([personId])
    WHERE [personId] IS NOT NULL;
END;
