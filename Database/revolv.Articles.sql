-- Check explicitly for 'revolv.Articles' using OBJECT_ID
IF OBJECT_ID(N'revolv.Articles', N'U') IS NULL
BEGIN
    CREATE TABLE revolv.Articles (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ArticleNumber NVARCHAR(100) NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        Category NVARCHAR(100),
        Size NVARCHAR(50)
    );
END
GO