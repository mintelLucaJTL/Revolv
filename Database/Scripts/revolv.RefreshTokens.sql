USE eazybusiness;
GO

-- Stores refresh tokens for the 5-minute access token / 2-hour session feature (ticket #245).
-- Only the token hash is stored, never the raw token, so a DB leak alone can't be used to log in.
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'revolv.RefreshTokens') AND type in (N'U'))
BEGIN
    CREATE TABLE [revolv].[RefreshTokens] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [UserId] INT NOT NULL,
        [TokenHash] NVARCHAR(128) NOT NULL,          -- SHA-256 hash of the raw token
        [SessionId] UNIQUEIDENTIFIER NOT NULL,        -- shared by every token rotated within one login session
        [SessionStartedAt] DATETIME2 NOT NULL,
        [AbsoluteExpiresAt] DATETIME2 NOT NULL,       -- SessionStartedAt + 2h, never extended by rotation
        [CreatedAt] DATETIME2 NOT NULL,
        [RevokedAt] DATETIME2 NULL,
        [ReplacedByTokenId] UNIQUEIDENTIFIER NULL     -- points to the token that replaced this one after rotation
    );
END
GO

-- Foreign key to Users, cascade delete so tokens are cleaned up when a user is removed.
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_RefreshTokens_Users_UserId')
BEGIN
    ALTER TABLE [revolv].[RefreshTokens]
    ADD CONSTRAINT FK_RefreshTokens_Users_UserId
    FOREIGN KEY ([UserId]) REFERENCES [revolv].[Users]([Id])
    ON DELETE CASCADE;
END
GO

-- One row per token, looked up by hash on every refresh - must be unique and indexed.
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_RefreshTokens_TokenHash')
BEGIN
    CREATE UNIQUE INDEX IX_RefreshTokens_TokenHash ON [revolv].[RefreshTokens] ([TokenHash]);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_RefreshTokens_UserId')
BEGIN
    CREATE INDEX IX_RefreshTokens_UserId ON [revolv].[RefreshTokens] ([UserId]);
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_RefreshTokens_SessionId')
BEGIN
    CREATE INDEX IX_RefreshTokens_SessionId ON [revolv].[RefreshTokens] ([SessionId]);
END
GO
