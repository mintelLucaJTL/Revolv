USE eazybusiness;
GO

-- Create the Revolv schema if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'revolv')
BEGIN
    EXEC('CREATE SCHEMA revolv');
END
GO

-- Create the Users table in the Revolv schema
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'revolv.Users') AND type in (N'U')) -- Check if the Users table doesn't exist
BEGIN
    CREATE TABLE revolv.Users (
        Id INT IDENTITY(1,1) PRIMARY KEY,      -- Automatic ID (counts from 1, 2, 3... up)
        Email NVARCHAR(256) NOT NULL UNIQUE,   -- Email address (can only exist once in the DB)
        PasswordHash NVARCHAR(MAX) NOT NULL,   -- Place for the encrypted password
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE() -- Automatic timestamp when creating!
    );
END
GO