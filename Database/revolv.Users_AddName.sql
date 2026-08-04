USE revolv;
GO

-- Adds nullable display Name for existing users (prompted on next login).
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'revolv.Users') AND name = 'Name'
)
BEGIN
    ALTER TABLE revolv.Users
    ADD Name NVARCHAR(256) NULL;
END
GO
