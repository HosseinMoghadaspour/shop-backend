IF OBJECT_ID(N'dbo.Account', N'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[Account];
END;

IF OBJECT_ID(N'dbo.Session', N'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[Session];
END;

IF OBJECT_ID(N'dbo.Verification', N'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[Verification];
END;

IF OBJECT_ID(N'dbo.User', N'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[User];
END;

CREATE TABLE [dbo].[CustomOtpCode] (
    [id] NVARCHAR(100) NOT NULL,
    [phoneNumber] NVARCHAR(30) NOT NULL,
    [codeHash] NVARCHAR(128) NOT NULL,
    [attempts] INT NOT NULL CONSTRAINT [DF_CustomOtpCode_attempts] DEFAULT 0,
    [expiresAt] DATETIME2 NOT NULL,
    [consumedAt] DATETIME2 NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_CustomOtpCode_createdAt] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_CustomOtpCode] PRIMARY KEY ([id])
);

CREATE INDEX [CustomOtpCode_phoneNumber_expiresAt_idx]
    ON [dbo].[CustomOtpCode] ([phoneNumber], [expiresAt]);

CREATE TABLE [dbo].[CustomAuthSession] (
    [id] NVARCHAR(100) NOT NULL,
    [tokenHash] NVARCHAR(128) NOT NULL,
    [role] NVARCHAR(20) NOT NULL,
    [personId] INT NULL,
    [userInfoId] SMALLINT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_CustomAuthSession_createdAt] DEFAULT CURRENT_TIMESTAMP,
    [lastSeenAt] DATETIME2 NOT NULL CONSTRAINT [DF_CustomAuthSession_lastSeenAt] DEFAULT CURRENT_TIMESTAMP,
    [ipAddress] NVARCHAR(64) NULL,
    [userAgent] NVARCHAR(512) NULL,
    CONSTRAINT [PK_CustomAuthSession] PRIMARY KEY ([id]),
    CONSTRAINT [UQ_CustomAuthSession_tokenHash] UNIQUE ([tokenHash])
);

CREATE INDEX [CustomAuthSession_personId_idx] ON [dbo].[CustomAuthSession] ([personId]);
CREATE INDEX [CustomAuthSession_userInfoId_idx] ON [dbo].[CustomAuthSession] ([userInfoId]);
CREATE INDEX [CustomAuthSession_expiresAt_idx] ON [dbo].[CustomAuthSession] ([expiresAt]);