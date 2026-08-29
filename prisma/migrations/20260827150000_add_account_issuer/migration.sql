IF COL_LENGTH(N'dbo.Account', N'issuer') IS NULL
BEGIN
    ALTER TABLE [dbo].[Account] ADD [issuer] NVARCHAR(1000) NULL;
END;
