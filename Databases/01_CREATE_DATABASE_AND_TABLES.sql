USE master;
GO

IF EXISTS (SELECT name FROM sys.databases WHERE name = N'SqlPtit')
BEGIN
    ALTER DATABASE SqlPtit SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE SqlPtit;
END
GO

CREATE DATABASE SqlPtit;
GO

USE SqlPtit;
GO

CREATE TABLE [PERSON] (
  [id] int PRIMARY KEY IDENTITY(1,1),
  [first_name] nvarchar(255) NOT NULL,
  [middle_name] nvarchar(255),
  [last_name] nvarchar(255) NOT NULL,
  [gender] nvarchar(255),
  [date_of_birth] date,
  [province] nvarchar(255),
  [district] nvarchar(255),
  [street] nvarchar(255),
  [house_num] nvarchar(255)
)
GO

CREATE TABLE [PERSON_PHONE] (
  [person_id] int NOT NULL,
  [phone_num] nvarchar(255) NOT NULL,
  PRIMARY KEY ([person_id], [phone_num])
)
GO

CREATE TABLE [CUSTOMER] (
  [id] int PRIMARY KEY,
  [customer_code] nvarchar(255) UNIQUE NOT NULL
)
GO

CREATE TABLE [EMPLOYEE] (
  [id] int PRIMARY KEY,
  [employee_code] nvarchar(255) UNIQUE NOT NULL,
  [employment_type] nvarchar(255) NOT NULL,
  [position] nvarchar(255) NOT NULL,
  [is_active] bit NOT NULL DEFAULT 1
)
GO

CREATE TABLE [PROVIDER] (
  [id] int PRIMARY KEY IDENTITY(1,1),
  [name] nvarchar(255) NOT NULL,
  [email] nvarchar(255),
  [phone] nvarchar(255) NOT NULL
)
GO

CREATE TABLE [CATEGORY] (
  [id] int PRIMARY KEY IDENTITY(1,1),
  [name] nvarchar(255) NOT NULL
)
GO

CREATE TABLE [MANUFACTURER] (
  [id] int PRIMARY KEY IDENTITY(1,1),
  [name] nvarchar(255) NOT NULL
)
GO

CREATE TABLE [PRODUCT] (
  [id] int PRIMARY KEY IDENTITY(1,1),
  [name] nvarchar(255) NOT NULL,
  [category_id] int NOT NULL,
  [manufacturer_id] int,
  [in_unit_price] decimal(18,2) NOT NULL,
  [out_unit_price] decimal(18,2) NOT NULL,
  [stock_quantity] int NOT NULL DEFAULT 0,
  [warranty_months] int NOT NULL DEFAULT 12
)
GO

CREATE TABLE [IMPORT] (
  [id] int PRIMARY KEY IDENTITY(1,1),
  [employee_id] int NOT NULL,
  [provider_id] int NOT NULL,
  [create_time] datetime NOT NULL DEFAULT GETDATE()
)
GO

CREATE TABLE [IMPORT_DETAIL] (
  [import_id] int NOT NULL,
  [product_id] int NOT NULL,
  [import_quantity] int NOT NULL,
  [unit_price] decimal(18,2) NOT NULL,
  PRIMARY KEY ([import_id], [product_id])
)
GO

CREATE TABLE [PRODUCT_SERIAL] (
  [serial_number] nvarchar(255) PRIMARY KEY,
  [product_id] int NOT NULL,
  [import_id] int NOT NULL,
  [sell_status] bit NOT NULL DEFAULT 1 -- 1: In_Stock
)
GO

CREATE TABLE [INVOICE] (
  [id] int PRIMARY KEY IDENTITY(1,1),
  [customer_id] int NOT NULL,
  [employee_id] int NOT NULL,
  [create_time] datetime NOT NULL DEFAULT GETDATE()
)
GO

CREATE TABLE [INVOICE_DETAIL] (
  [invoice_id] int NOT NULL,
  [product_id] int NOT NULL,
  [buy_quantity] int NOT NULL,
  [unit_price] decimal(18,2) NOT NULL,
  PRIMARY KEY ([invoice_id], [product_id])
)
GO

CREATE TABLE [WARRANTY] (
  [id] int PRIMARY KEY IDENTITY(1,1),
  [invoice_id] int NOT NULL,
  [product_id] int NOT NULL,
  [serial_number] nvarchar(255) NOT NULL,
  [start_date] date NOT NULL,
  [end_date] date NOT NULL
)
GO

CREATE TABLE [WARRANTY_CLAIM] (
  [id] int PRIMARY KEY IDENTITY(1,1),
  [warranty_id] int NOT NULL,
  [employee_id] int NOT NULL,
  [claim_date] date NOT NULL,
  [description] nvarchar(255),
  [status] nvarchar(255) NOT NULL
)
GO

CREATE TABLE [ACCOUNT] (
  [employee_id] int PRIMARY KEY,
  [username] nvarchar(255) UNIQUE NOT NULL,
  [password] nvarchar(255) NOT NULL,
  [role] nvarchar(50) NOT NULL DEFAULT 'employee'
)
GO

ALTER TABLE [PERSON_PHONE] ADD FOREIGN KEY ([person_id]) REFERENCES [PERSON] ([id])
ALTER TABLE [CUSTOMER] ADD FOREIGN KEY ([id]) REFERENCES [PERSON] ([id])
ALTER TABLE [EMPLOYEE] ADD FOREIGN KEY ([id]) REFERENCES [PERSON] ([id])
ALTER TABLE [PRODUCT] ADD FOREIGN KEY ([category_id]) REFERENCES [CATEGORY] ([id])
ALTER TABLE [PRODUCT] ADD FOREIGN KEY ([manufacturer_id]) REFERENCES [MANUFACTURER] ([id])
ALTER TABLE [IMPORT] ADD FOREIGN KEY ([employee_id]) REFERENCES [EMPLOYEE] ([id])
ALTER TABLE [IMPORT] ADD FOREIGN KEY ([provider_id]) REFERENCES [PROVIDER] ([id])
ALTER TABLE [IMPORT_DETAIL] ADD FOREIGN KEY ([import_id]) REFERENCES [IMPORT] ([id])
ALTER TABLE [IMPORT_DETAIL] ADD FOREIGN KEY ([product_id]) REFERENCES [PRODUCT] ([id])
ALTER TABLE [PRODUCT_SERIAL] ADD FOREIGN KEY ([product_id]) REFERENCES [PRODUCT] ([id])
ALTER TABLE [PRODUCT_SERIAL] ADD FOREIGN KEY ([import_id]) REFERENCES [IMPORT] ([id])
ALTER TABLE [INVOICE] ADD FOREIGN KEY ([customer_id]) REFERENCES [CUSTOMER] ([id])
ALTER TABLE [INVOICE] ADD FOREIGN KEY ([employee_id]) REFERENCES [EMPLOYEE] ([id])
ALTER TABLE [INVOICE_DETAIL] ADD FOREIGN KEY ([invoice_id]) REFERENCES [INVOICE] ([id])
ALTER TABLE [INVOICE_DETAIL] ADD FOREIGN KEY ([product_id]) REFERENCES [PRODUCT] ([id])
ALTER TABLE [WARRANTY] ADD FOREIGN KEY ([invoice_id]) REFERENCES [INVOICE] ([id])
ALTER TABLE [WARRANTY] ADD FOREIGN KEY ([product_id]) REFERENCES [PRODUCT] ([id])
ALTER TABLE [WARRANTY] ADD FOREIGN KEY ([serial_number]) REFERENCES [PRODUCT_SERIAL] ([serial_number])
ALTER TABLE [WARRANTY_CLAIM] ADD FOREIGN KEY ([warranty_id]) REFERENCES [WARRANTY] ([id])
ALTER TABLE [WARRANTY_CLAIM] ADD FOREIGN KEY ([employee_id]) REFERENCES [EMPLOYEE] ([id])
ALTER TABLE [ACCOUNT] ADD FOREIGN KEY ([employee_id]) REFERENCES [EMPLOYEE] ([id])
GO