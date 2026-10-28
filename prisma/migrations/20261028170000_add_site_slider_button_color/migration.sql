IF COL_LENGTH(N'dbo.SiteSlider', N'ButtonColor') IS NULL
BEGIN
  ALTER TABLE [dbo].[SiteSlider]
  ADD [ButtonColor] NVARCHAR(7) NULL;
END;
