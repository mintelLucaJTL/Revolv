USE revolv;
GO

-- Adds the password-reset columns to revolv.Users.
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'revolv.Users') AND name = 'PasswordResetToken'
)
BEGIN
    ALTER TABLE revolv.Users
    ADD PasswordResetToken NVARCHAR(256) NULL;
END
GO

IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'revolv.Users') AND name = 'ResetTokenExpires'
)
BEGIN
    ALTER TABLE revolv.Users
    ADD ResetTokenExpires DATETIME2 NULL;
END
GO
