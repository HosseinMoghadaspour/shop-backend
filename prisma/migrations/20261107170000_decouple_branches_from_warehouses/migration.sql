/*
  Decouple online-store branches from accounting warehouses.

  Warehouse_ID is retained as a nullable legacy column so existing installations
  and any external reporting can continue to read historical mappings. New and
  updated branch configurations no longer require or populate this value.
*/
IF OBJECT_ID(N'dbo.SiteBranchConfig', N'U') IS NULL
BEGIN
  THROW 51000, 'dbo.SiteBranchConfig does not exist.', 1;
END;

DECLARE @columnType NVARCHAR(128);
DECLARE @sql NVARCHAR(MAX);

SELECT
  @columnType =
    CASE
      WHEN t.name IN (N'nvarchar', N'nchar')
        THEN t.name + N'(' + CASE WHEN c.max_length = -1 THEN N'MAX' ELSE CONVERT(NVARCHAR(10), c.max_length / 2) END + N')'
      WHEN t.name IN (N'varchar', N'char', N'varbinary', N'binary')
        THEN t.name + N'(' + CASE WHEN c.max_length = -1 THEN N'MAX' ELSE CONVERT(NVARCHAR(10), c.max_length) END + N')'
      WHEN t.name IN (N'decimal', N'numeric')
        THEN t.name + N'(' + CONVERT(NVARCHAR(10), c.precision) + N',' + CONVERT(NVARCHAR(10), c.scale) + N')'
      ELSE t.name
    END
FROM sys.columns c
INNER JOIN sys.types t ON t.user_type_id = c.user_type_id
WHERE c.object_id = OBJECT_ID(N'dbo.SiteBranchConfig')
  AND c.name = N'Warehouse_ID';

IF @columnType IS NOT NULL
BEGIN
  SET @sql = N'ALTER TABLE dbo.SiteBranchConfig ALTER COLUMN Warehouse_ID ' + @columnType + N' NULL;';
  EXEC sys.sp_executesql @sql;
END;
