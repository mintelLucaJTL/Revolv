USE eazybusiness;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Articles')
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