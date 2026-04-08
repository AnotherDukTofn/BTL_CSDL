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
  [first_name] nvarchar(255),
  [middle_name] nvarchar(255),
  [last_name] nvarchar(255),
  [gender] nvarchar(255),
  [date_of_birth] date,
  [province] nvarchar(255),
  [district] nvarchar(255),
  [street] nvarchar(255),
  [house_num] nvarchar(255)
)
GO

CREATE TABLE [PERSON_PHONE] (
  [person_id] int,
  [phone_num] nvarchar(255),
  PRIMARY KEY ([person_id], [phone_num])
)
GO

CREATE TABLE [CUSTOMER] (
  [id] int PRIMARY KEY,
  [customer_code] nvarchar(255) UNIQUE
)
GO

CREATE TABLE [EMPLOYEE] (
  [id] int PRIMARY KEY,
  [employee_code] nvarchar(255) UNIQUE,
  [employment_type] nvarchar(255) NOT NULL,
  [position] nvarchar(255) NOT NULL,
  [is_active] bit 
)
GO

CREATE TABLE [PROVIDER] (
  [id] int PRIMARY KEY IDENTITY(1,1),
  [name] nvarchar(255),
  [email] nvarchar(255),
  [phone] nvarchar(255)
)
GO

CREATE TABLE [CATEGORY] (
  [id] int PRIMARY KEY IDENTITY(1,1),
  [name] nvarchar(255)
)
GO

CREATE TABLE [MANUFACTURER] (
  [id] int PRIMARY KEY IDENTITY(1,1),
  [name] nvarchar(255)
)
GO

CREATE TABLE [PRODUCT] (
  [id] int PRIMARY KEY IDENTITY(1,1),
  [name] nvarchar(255),
  [category_id] int,
  [manufacturer_id] int,
  [in_unit_price] decimal(18,2),
  [out_unit_price] decimal(18,2),
  [stock_quantity] int DEFAULT 0
)
GO

CREATE TABLE [IMPORT] (
  [id] int PRIMARY KEY IDENTITY(1,1),
  [employee_id] int,
  [provider_id] int,
  [create_time] datetime DEFAULT GETDATE()
)
GO

CREATE TABLE [IMPORT_DETAIL] (
  [import_id] int,
  [product_id] int,
  [import_quantity] int,
  [unit_price] decimal(18,2),
  PRIMARY KEY ([import_id], [product_id])
)
GO

CREATE TABLE [PRODUCT_SERIAL] (
  [serial_number] nvarchar(255) PRIMARY KEY,
  [product_id] int,
  [import_id] int,
  [sell_status] bit DEFAULT 1 -- 1: In_Stock
)
GO

CREATE TABLE [INVOICE] (
  [id] int PRIMARY KEY IDENTITY(1,1),
  [customer_id] int,
  [employee_id] int,
  [create_time] datetime DEFAULT GETDATE()
)
GO

CREATE TABLE [INVOICE_DETAIL] (
  [invoice_id] int,
  [product_id] int,
  [buy_quantity] int,
  [unit_price] decimal(18,2),
  PRIMARY KEY ([invoice_id], [product_id])
)
GO

CREATE TABLE [WARRANTY] (
  [id] int PRIMARY KEY IDENTITY(1,1),
  [invoice_id] int,
  [product_id] int,
  [serial_number] nvarchar(255),
  [start_date] date,
  [end_date] date
)
GO

CREATE TABLE [WARRANTY_CLAIM] (
  [id] int PRIMARY KEY IDENTITY(1,1),
  [warranty_id] int,
  [employee_id] int,
  [claim_date] date,
  [description] nvarchar(255),
  [status] nvarchar(255)
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