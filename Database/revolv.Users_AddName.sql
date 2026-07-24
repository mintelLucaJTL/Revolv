USE eazybusiness;
GO

-- Adds the "Name" column to revolv.Users so users can have a display name
-- (shown in the header instead of the placeholder "Max Mustermann").
-- Nullable on purpose: existing users don't have a name yet and will be
-- prompted by the frontend to set one on their next login (see TopNavigationBar.tsx).
IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID(N'revolv.Users') AND name = 'Name'
)
BEGIN
    ALTER TABLE revolv.Users
    ADD Name NVARCHAR(256) NULL;
END
GO
