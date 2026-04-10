USE SqlPtit;
GO

-- ============================================================
-- RESET: Tắt FK → Xóa dữ liệu → Reset ID → Bật FK
-- ============================================================
EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL'
GO
EXEC sp_MSforeachtable 'DELETE FROM ?'
GO
EXEC sp_MSforeachtable '
IF OBJECTPROPERTY(OBJECT_ID(''?''), ''TableHasIdentity'') = 1 
BEGIN
    DECLARE @LastValue sql_variant;
    SELECT @LastValue = last_value FROM sys.identity_columns WHERE object_id = OBJECT_ID(''?'');
    IF @LastValue IS NULL
        DBCC CHECKIDENT (''?'', RESEED, 1);
    ELSE
        DBCC CHECKIDENT (''?'', RESEED, 0);
END'
GO
EXEC sp_MSforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL'
GO

SELECT 'Status' AS [Thông báo], N'Đã xóa sạch dữ liệu và reset ID về 1' AS [Kết quả];

-- ============================================================
-- NHÓM 1: DANH MỤC (Lookup tables)
-- ============================================================
INSERT INTO CATEGORY (name) VALUES
(N'Guitar Acoustic'), (N'Guitar Classic'), (N'Electric Guitar'),
(N'Piano Cơ'), (N'Piano Điện'), (N'Keyboard'),
(N'Trống Jazz'), (N'Trống Điện'), (N'Violin'), (N'Saxophone');

INSERT INTO MANUFACTURER (name) VALUES
(N'Yamaha'), (N'Roland'), (N'Fender'), (N'Taylor'), (N'Gibson'),
(N'Casio'), (N'Kawai'), (N'Pearl'), (N'Stradivarius'), (N'Selmer');

INSERT INTO PROVIDER (name, email, phone) VALUES
(N'Tiến Đạt Music',  'info@tiendat.vn',       '0901234561'),
(N'Việt Thương',     'sales@vietthuong.vn',    '0901234562'),
(N'Swee Lee',        'contact@sweelee.com.vn', '0901234563'),
(N'Hảo Vĩnh',       'haovinh@gmail.com',      '0901234564');
GO

-- ============================================================
-- NHÓM 2: PERSON (20 người) + PERSON_PHONE
-- ============================================================
INSERT INTO PERSON (first_name, middle_name, last_name, gender, date_of_birth, province) VALUES
(N'Nguyễn', N'Văn',  N'An',    N'Nam', '1990-03-15', N'Hà Nội'),
(N'Trần',   N'Quốc', N'Bình',  N'Nam', '1988-07-22', N'Hà Nội'),
(N'Lê',     N'Thị',  N'Chi',   N'Nữ',  '1995-11-08', N'TP HCM'),
(N'Phạm',   N'Đức',  N'Dũng',  N'Nam', '1992-01-30', N'Đà Nẵng'),
(N'Hoàng',  N'Thị',  N'Giang', N'Nữ',  '1993-05-18', N'Hải Phòng'),
(N'Vũ',     N'Đình', N'Hải',   N'Nam', '1991-09-12', N'Cần Thơ'),
(N'Đặng',   N'Minh', N'Hòa',   N'Nam', '1994-02-25', N'Hà Nội'),
(N'Bùi',    N'Thị',  N'Hương', N'Nữ',  '1996-06-14', N'TP HCM'),
(N'Đỗ',     N'Anh',  N'Khánh', N'Nam', '1989-10-03', N'Huế'),
(N'Hồ',     N'Thị',  N'Lan',   N'Nữ',  '1997-04-20', N'Quảng Ninh'),
(N'Ngô',    N'Quang',N'Minh',  N'Nam', '1990-08-07', N'Nam Định'),
(N'Dương',  N'Hoàng',N'Nam',   N'Nam', '1993-12-19', N'Hà Nội'),
(N'Lý',     N'Thị',  N'Nga',   N'Nữ',  '1995-03-28', N'TP HCM'),
(N'Phan',   N'Đại',  N'Phúc',  N'Nam', '1991-07-11', N'Bình Dương'),
(N'Trương', N'Anh',  N'Quân',  N'Nam', '1992-11-05', N'Hà Nội'),
(N'Võ',     N'Thị',  N'Quỳnh', N'Nữ',  '1994-01-16', N'Đà Lạt'),
(N'Diệp',   N'Bảo',  N'Sơn',   N'Nam', '1988-06-23', N'Hà Nội'),
(N'Tạ',     N'Thị',  N'Tâm',   N'Nữ',  '1996-09-30', N'TP HCM'),
(N'Cao',    N'Đức',  N'Thắng', N'Nam', '1990-04-12', N'Vinh'),
(N'Mai',    N'Thị',  N'Trinh', N'Nữ',  '1997-08-08', N'Nha Trang');

INSERT INTO PERSON_PHONE (person_id, phone_num) VALUES
(1,  N'0901111001'), (2,  N'0901111002'), (3,  N'0901111003'), (4,  N'0901111004'),
(5,  N'0901111005'), (6,  N'0901111006'), (7,  N'0901111007'), (8,  N'0901111008'),
(9,  N'0901111009'), (10, N'0901111010'), (11, N'0901111011'), (12, N'0901111012'),
(13, N'0901111013'), (14, N'0901111014'), (15, N'0901111015'), (16, N'0901111016'),
(17, N'0901111017'), (18, N'0901111018'), (19, N'0901111019'), (20, N'0901111020');
GO

-- ============================================================
-- NHÓM 3: EMPLOYEE (5 người đầu) + CUSTOMER (15 người sau)
-- ============================================================
INSERT INTO EMPLOYEE (id, employee_code, position, employment_type, is_active) VALUES
(1, 'NV001', N'Quản lý',   N'Toàn thời gian', 1),
(2, 'NV002', N'Kế toán',   N'Toàn thời gian', 1),
(3, 'NV003', N'Bán hàng',  N'Toàn thời gian', 1),
(4, 'NV004', N'Bán hàng',  N'Hợp đồng',       1),
(5, 'NV005', N'Kỹ thuật',  N'Bán thời gian',  1);

INSERT INTO CUSTOMER (id, customer_code) VALUES
(6,  'KH006'), (7,  'KH007'), (8,  'KH008'), (9,  'KH009'), (10, 'KH010'),
(11, 'KH011'), (12, 'KH012'), (13, 'KH013'), (14, 'KH014'), (15, 'KH015'),
(16, 'KH016'), (17, 'KH017'), (18, 'KH018'), (19, 'KH019'), (20, 'KH020');
GO

-- ============================================================
-- NHÓM 4: PRODUCT (20 sản phẩm, stock_quantity = 0, sẽ được trigger cộng khi import)
-- ============================================================
INSERT INTO PRODUCT (name, category_id, manufacturer_id, in_unit_price, out_unit_price, stock_quantity, warranty_months) VALUES
(N'Yamaha FG800',          1,  1,  0, 5500000,   0, 12),  -- SP 1
(N'Taylor 114ce',          1,  4,  0, 22000000,  0, 24),  -- SP 2
(N'Fender Stratocaster',   3,  3,  0, 19000000,  0, 12),  -- SP 3
(N'Gibson Les Paul',       3,  5,  0, 55000000,  0, 24),  -- SP 4
(N'Yamaha U1J',            4,  1,  0, 110000000, 0, 36),  -- SP 5
(N'Kawai K300',            4,  7,  0, 145000000, 0, 36),  -- SP 6
(N'Roland FP-30X',         5,  2,  0, 20000000,  0, 12),  -- SP 7
(N'Casio PX-S1100',        5,  6,  0, 17500000,  0, 12),  -- SP 8
(N'Yamaha PSR-E473',       6,  1,  0, 10500000,  0, 12),  -- SP 9
(N'Roland Juno-DS',        6,  2,  0, 28000000,  0, 12),  -- SP 10
(N'Pearl Export',          7,  8,  0, 32000000,  0, 12),  -- SP 11
(N'Yamaha Rydeen',         7,  1,  0, 23000000,  0, 12),  -- SP 12
(N'Roland TD-17KVX',       8,  2,  0, 42000000,  0, 12),  -- SP 13
(N'Yamaha DTX6K',          8,  1,  0, 34000000,  0, 12),  -- SP 14
(N'Stradivarius Copy',     9,  9,  0, 70000000,  0, 24),  -- SP 15
(N'Yamaha V3AS',           9,  1,  0, 15500000,  0, 12),  -- SP 16
(N'Selmer AS42',          10, 10,  0, 52000000,  0, 12),  -- SP 17
(N'Yamaha YAS-280',       10,  1,  0, 31000000,  0, 12),  -- SP 18
(N'Fender Precision Bass', 3,  3,  0, 21000000,  0, 12),  -- SP 19
(N'Taylor GS Mini',        1,  4,  0, 16000000,  0, 12);  -- SP 20
GO

-- ============================================================
-- NHÓM 5: IMPORT + IMPORT_DETAIL + PRODUCT_SERIAL
--   Mỗi phiếu nhập luôn có IMPORT_DETAIL đầy đủ.
--   Trigger tự cộng stock. Serial sinh theo chuẩn SP{pid}-IMP{impId}-{seq}.
-- ============================================================

-- Phiếu nhập 1: Nhập lô đầu tiên cho tất cả 20 SP
INSERT INTO IMPORT (employee_id, provider_id, create_time) VALUES
(1, 1, DATEADD(day, -40, GETDATE()));

INSERT INTO IMPORT_DETAIL (import_id, product_id, import_quantity, unit_price) VALUES
(1, 1,  10, 4000000),  (1, 2,  5,  18000000), (1, 3,  8,  15000000), (1, 4,  4,  45000000),
(1, 5,  3,  85000000), (1, 6,  2,  120000000),(1, 7,  12, 16000000), (1, 8,  8,  14000000),
(1, 9,  15, 8000000),  (1, 10, 5,  22000000), (1, 11, 4,  25000000), (1, 12, 6,  18000000),
(1, 13, 3,  35000000), (1, 14, 4,  28000000), (1, 15, 2,  50000000), (1, 16, 6,  12000000),
(1, 17, 3,  40000000), (1, 18, 7,  25000000), (1, 19, 5,  17000000), (1, 20, 8,  12000000);

-- Serial cho Import 1 (format: SP{pid}-IMP1-{seq})
INSERT INTO PRODUCT_SERIAL (serial_number, product_id, import_id, sell_status) VALUES
-- SP1 x10
('SP1-IMP1-001',1,1,1),('SP1-IMP1-002',1,1,1),('SP1-IMP1-003',1,1,1),('SP1-IMP1-004',1,1,1),('SP1-IMP1-005',1,1,1),
('SP1-IMP1-006',1,1,1),('SP1-IMP1-007',1,1,1),('SP1-IMP1-008',1,1,1),('SP1-IMP1-009',1,1,1),('SP1-IMP1-010',1,1,1),
-- SP2 x5
('SP2-IMP1-001',2,1,1),('SP2-IMP1-002',2,1,1),('SP2-IMP1-003',2,1,1),('SP2-IMP1-004',2,1,1),('SP2-IMP1-005',2,1,1),
-- SP3 x8
('SP3-IMP1-001',3,1,1),('SP3-IMP1-002',3,1,1),('SP3-IMP1-003',3,1,1),('SP3-IMP1-004',3,1,1),
('SP3-IMP1-005',3,1,1),('SP3-IMP1-006',3,1,1),('SP3-IMP1-007',3,1,1),('SP3-IMP1-008',3,1,1),
-- SP4 x4
('SP4-IMP1-001',4,1,1),('SP4-IMP1-002',4,1,1),('SP4-IMP1-003',4,1,1),('SP4-IMP1-004',4,1,1),
-- SP5 x3
('SP5-IMP1-001',5,1,1),('SP5-IMP1-002',5,1,1),('SP5-IMP1-003',5,1,1),
-- SP6 x2
('SP6-IMP1-001',6,1,1),('SP6-IMP1-002',6,1,1),
-- SP7 x12
('SP7-IMP1-001',7,1,1),('SP7-IMP1-002',7,1,1),('SP7-IMP1-003',7,1,1),('SP7-IMP1-004',7,1,1),
('SP7-IMP1-005',7,1,1),('SP7-IMP1-006',7,1,1),('SP7-IMP1-007',7,1,1),('SP7-IMP1-008',7,1,1),
('SP7-IMP1-009',7,1,1),('SP7-IMP1-010',7,1,1),('SP7-IMP1-011',7,1,1),('SP7-IMP1-012',7,1,1),
-- SP8 x8
('SP8-IMP1-001',8,1,1),('SP8-IMP1-002',8,1,1),('SP8-IMP1-003',8,1,1),('SP8-IMP1-004',8,1,1),
('SP8-IMP1-005',8,1,1),('SP8-IMP1-006',8,1,1),('SP8-IMP1-007',8,1,1),('SP8-IMP1-008',8,1,1),
-- SP9 x15
('SP9-IMP1-001',9,1,1),('SP9-IMP1-002',9,1,1),('SP9-IMP1-003',9,1,1),('SP9-IMP1-004',9,1,1),('SP9-IMP1-005',9,1,1),
('SP9-IMP1-006',9,1,1),('SP9-IMP1-007',9,1,1),('SP9-IMP1-008',9,1,1),('SP9-IMP1-009',9,1,1),('SP9-IMP1-010',9,1,1),
('SP9-IMP1-011',9,1,1),('SP9-IMP1-012',9,1,1),('SP9-IMP1-013',9,1,1),('SP9-IMP1-014',9,1,1),('SP9-IMP1-015',9,1,1),
-- SP10 x5
('SP10-IMP1-001',10,1,1),('SP10-IMP1-002',10,1,1),('SP10-IMP1-003',10,1,1),('SP10-IMP1-004',10,1,1),('SP10-IMP1-005',10,1,1),
-- SP11 x4
('SP11-IMP1-001',11,1,1),('SP11-IMP1-002',11,1,1),('SP11-IMP1-003',11,1,1),('SP11-IMP1-004',11,1,1),
-- SP12 x6
('SP12-IMP1-001',12,1,1),('SP12-IMP1-002',12,1,1),('SP12-IMP1-003',12,1,1),
('SP12-IMP1-004',12,1,1),('SP12-IMP1-005',12,1,1),('SP12-IMP1-006',12,1,1),
-- SP13 x3
('SP13-IMP1-001',13,1,1),('SP13-IMP1-002',13,1,1),('SP13-IMP1-003',13,1,1),
-- SP14 x4
('SP14-IMP1-001',14,1,1),('SP14-IMP1-002',14,1,1),('SP14-IMP1-003',14,1,1),('SP14-IMP1-004',14,1,1),
-- SP15 x2
('SP15-IMP1-001',15,1,1),('SP15-IMP1-002',15,1,1),
-- SP16 x6
('SP16-IMP1-001',16,1,1),('SP16-IMP1-002',16,1,1),('SP16-IMP1-003',16,1,1),
('SP16-IMP1-004',16,1,1),('SP16-IMP1-005',16,1,1),('SP16-IMP1-006',16,1,1),
-- SP17 x3
('SP17-IMP1-001',17,1,1),('SP17-IMP1-002',17,1,1),('SP17-IMP1-003',17,1,1),
-- SP18 x7
('SP18-IMP1-001',18,1,1),('SP18-IMP1-002',18,1,1),('SP18-IMP1-003',18,1,1),('SP18-IMP1-004',18,1,1),
('SP18-IMP1-005',18,1,1),('SP18-IMP1-006',18,1,1),('SP18-IMP1-007',18,1,1),
-- SP19 x5
('SP19-IMP1-001',19,1,1),('SP19-IMP1-002',19,1,1),('SP19-IMP1-003',19,1,1),('SP19-IMP1-004',19,1,1),('SP19-IMP1-005',19,1,1),
-- SP20 x8
('SP20-IMP1-001',20,1,1),('SP20-IMP1-002',20,1,1),('SP20-IMP1-003',20,1,1),('SP20-IMP1-004',20,1,1),
('SP20-IMP1-005',20,1,1),('SP20-IMP1-006',20,1,1),('SP20-IMP1-007',20,1,1),('SP20-IMP1-008',20,1,1);
GO

-- Phiếu nhập 2: Nhập thêm lô 2 cho một số SP (giá khác → test bình quân gia quyền)
INSERT INTO IMPORT (employee_id, provider_id, create_time) VALUES
(2, 2, DATEADD(day, -25, GETDATE()));

INSERT INTO IMPORT_DETAIL (import_id, product_id, import_quantity, unit_price) VALUES
(2, 1,  5,  4500000),   -- SP1: giá mới 4.5tr (cũ 4tr)
(2, 3,  4,  16000000),  -- SP3: giá mới 16tr (cũ 15tr)
(2, 7,  6,  17000000),  -- SP7: giá mới 17tr (cũ 16tr)
(2, 9,  8,  8500000),   -- SP9: giá mới 8.5tr (cũ 8tr)
(2, 15, 3,  52000000);  -- SP15: giá mới 52tr (cũ 50tr)

INSERT INTO PRODUCT_SERIAL (serial_number, product_id, import_id, sell_status) VALUES
-- SP1 x5
('SP1-IMP2-001',1,2,1),('SP1-IMP2-002',1,2,1),('SP1-IMP2-003',1,2,1),('SP1-IMP2-004',1,2,1),('SP1-IMP2-005',1,2,1),
-- SP3 x4
('SP3-IMP2-001',3,2,1),('SP3-IMP2-002',3,2,1),('SP3-IMP2-003',3,2,1),('SP3-IMP2-004',3,2,1),
-- SP7 x6
('SP7-IMP2-001',7,2,1),('SP7-IMP2-002',7,2,1),('SP7-IMP2-003',7,2,1),('SP7-IMP2-004',7,2,1),('SP7-IMP2-005',7,2,1),('SP7-IMP2-006',7,2,1),
-- SP9 x8
('SP9-IMP2-001',9,2,1),('SP9-IMP2-002',9,2,1),('SP9-IMP2-003',9,2,1),('SP9-IMP2-004',9,2,1),
('SP9-IMP2-005',9,2,1),('SP9-IMP2-006',9,2,1),('SP9-IMP2-007',9,2,1),('SP9-IMP2-008',9,2,1),
-- SP15 x3
('SP15-IMP2-001',15,2,1),('SP15-IMP2-002',15,2,1),('SP15-IMP2-003',15,2,1);
GO

-- Phiếu nhập 3: Bổ sung lô 3
INSERT INTO IMPORT (employee_id, provider_id, create_time) VALUES
(3, 3, DATEADD(day, -15, GETDATE()));

INSERT INTO IMPORT_DETAIL (import_id, product_id, import_quantity, unit_price) VALUES
(3, 2,  3,  19000000),  -- SP2: giá mới 19tr
(3, 5,  2,  88000000),  -- SP5: giá mới 88tr
(3, 11, 5,  26000000),  -- SP11: giá mới 26tr
(3, 18, 4,  26000000);  -- SP18: giá mới 26tr

INSERT INTO PRODUCT_SERIAL (serial_number, product_id, import_id, sell_status) VALUES
('SP2-IMP3-001',2,3,1),('SP2-IMP3-002',2,3,1),('SP2-IMP3-003',2,3,1),
('SP5-IMP3-001',5,3,1),('SP5-IMP3-002',5,3,1),
('SP11-IMP3-001',11,3,1),('SP11-IMP3-002',11,3,1),('SP11-IMP3-003',11,3,1),('SP11-IMP3-004',11,3,1),('SP11-IMP3-005',11,3,1),
('SP18-IMP3-001',18,3,1),('SP18-IMP3-002',18,3,1),('SP18-IMP3-003',18,3,1),('SP18-IMP3-004',18,3,1);
GO

-- ============================================================
-- NHÓM 6: INVOICE + INVOICE_DETAIL (10 hóa đơn)
--   Trigger tự trừ stock. Bán từ serial cũ nhất (FIFO).
-- ============================================================
INSERT INTO INVOICE (customer_id, employee_id, create_time) VALUES
(6,  1, DATEADD(day, -12, GETDATE())),  -- HĐ 1
(7,  2, DATEADD(day, -10, GETDATE())),  -- HĐ 2
(8,  3, DATEADD(day, -9,  GETDATE())),  -- HĐ 3
(9,  4, DATEADD(day, -8,  GETDATE())),  -- HĐ 4
(10, 5, DATEADD(day, -7,  GETDATE())),  -- HĐ 5
(11, 1, DATEADD(day, -6,  GETDATE())),  -- HĐ 6
(12, 2, DATEADD(day, -5,  GETDATE())),  -- HĐ 7
(13, 3, DATEADD(day, -4,  GETDATE())),  -- HĐ 8
(14, 4, DATEADD(day, -3,  GETDATE())),  -- HĐ 9
(15, 5, DATEADD(day, -2,  GETDATE()));  -- HĐ 10

INSERT INTO INVOICE_DETAIL (invoice_id, product_id, buy_quantity, unit_price) VALUES
(1,  1,  2, 5500000),   -- HĐ1: 2x SP1
(2,  2,  1, 22000000),  -- HĐ2: 1x SP2
(3,  3,  2, 19000000),  -- HĐ3: 2x SP3
(4,  7,  3, 20000000),  -- HĐ4: 3x SP7
(5,  9,  2, 10500000),  -- HĐ5: 2x SP9
(6, 11,  1, 32000000),  -- HĐ6: 1x SP11
(7, 15,  1, 70000000),  -- HĐ7: 1x SP15
(8, 18,  2, 31000000),  -- HĐ8: 2x SP18
(9,  4,  1, 55000000),  -- HĐ9: 1x SP4
(10, 20, 2, 16000000);  -- HĐ10: 2x SP20
GO

-- ============================================================
-- NHÓM 7: WARRANTY (mỗi sản phẩm bán ra tạo 1 phiếu bảo hành)
--   Serial gán theo FIFO (lấy serial cũ nhất)
--   Đánh dấu sell_status = 0 cho serial vừa bán
-- ============================================================
-- HĐ1: SP1 x2 → serial SP1-IMP1-001, SP1-IMP1-002
UPDATE PRODUCT_SERIAL SET sell_status = 0 WHERE serial_number IN ('SP1-IMP1-001','SP1-IMP1-002');
INSERT INTO WARRANTY (invoice_id, product_id, serial_number, start_date, end_date) VALUES
(1, 1, 'SP1-IMP1-001', DATEADD(day,-12,GETDATE()), DATEADD(month,12,DATEADD(day,-12,GETDATE()))),
(1, 1, 'SP1-IMP1-002', DATEADD(day,-12,GETDATE()), DATEADD(month,12,DATEADD(day,-12,GETDATE())));

-- HĐ2: SP2 x1 → serial SP2-IMP1-001
UPDATE PRODUCT_SERIAL SET sell_status = 0 WHERE serial_number = 'SP2-IMP1-001';
INSERT INTO WARRANTY (invoice_id, product_id, serial_number, start_date, end_date) VALUES
(2, 2, 'SP2-IMP1-001', DATEADD(day,-10,GETDATE()), DATEADD(month,24,DATEADD(day,-10,GETDATE())));

-- HĐ3: SP3 x2 → serial SP3-IMP1-001, SP3-IMP1-002
UPDATE PRODUCT_SERIAL SET sell_status = 0 WHERE serial_number IN ('SP3-IMP1-001','SP3-IMP1-002');
INSERT INTO WARRANTY (invoice_id, product_id, serial_number, start_date, end_date) VALUES
(3, 3, 'SP3-IMP1-001', DATEADD(day,-9,GETDATE()), DATEADD(month,12,DATEADD(day,-9,GETDATE()))),
(3, 3, 'SP3-IMP1-002', DATEADD(day,-9,GETDATE()), DATEADD(month,12,DATEADD(day,-9,GETDATE())));

-- HĐ4: SP7 x3 → serial SP7-IMP1-001,002,003
UPDATE PRODUCT_SERIAL SET sell_status = 0 WHERE serial_number IN ('SP7-IMP1-001','SP7-IMP1-002','SP7-IMP1-003');
INSERT INTO WARRANTY (invoice_id, product_id, serial_number, start_date, end_date) VALUES
(4, 7, 'SP7-IMP1-001', DATEADD(day,-8,GETDATE()), DATEADD(month,12,DATEADD(day,-8,GETDATE()))),
(4, 7, 'SP7-IMP1-002', DATEADD(day,-8,GETDATE()), DATEADD(month,12,DATEADD(day,-8,GETDATE()))),
(4, 7, 'SP7-IMP1-003', DATEADD(day,-8,GETDATE()), DATEADD(month,12,DATEADD(day,-8,GETDATE())));

-- HĐ5: SP9 x2 → serial SP9-IMP1-001,002
UPDATE PRODUCT_SERIAL SET sell_status = 0 WHERE serial_number IN ('SP9-IMP1-001','SP9-IMP1-002');
INSERT INTO WARRANTY (invoice_id, product_id, serial_number, start_date, end_date) VALUES
(5, 9, 'SP9-IMP1-001', DATEADD(day,-7,GETDATE()), DATEADD(month,12,DATEADD(day,-7,GETDATE()))),
(5, 9, 'SP9-IMP1-002', DATEADD(day,-7,GETDATE()), DATEADD(month,12,DATEADD(day,-7,GETDATE())));

-- HĐ6: SP11 x1 → serial SP11-IMP1-001
UPDATE PRODUCT_SERIAL SET sell_status = 0 WHERE serial_number = 'SP11-IMP1-001';
INSERT INTO WARRANTY (invoice_id, product_id, serial_number, start_date, end_date) VALUES
(6, 11, 'SP11-IMP1-001', DATEADD(day,-6,GETDATE()), DATEADD(month,12,DATEADD(day,-6,GETDATE())));

-- HĐ7: SP15 x1 → serial SP15-IMP1-001
UPDATE PRODUCT_SERIAL SET sell_status = 0 WHERE serial_number = 'SP15-IMP1-001';
INSERT INTO WARRANTY (invoice_id, product_id, serial_number, start_date, end_date) VALUES
(7, 15, 'SP15-IMP1-001', DATEADD(day,-5,GETDATE()), DATEADD(month,24,DATEADD(day,-5,GETDATE())));

-- HĐ8: SP18 x2 → serial SP18-IMP1-001,002
UPDATE PRODUCT_SERIAL SET sell_status = 0 WHERE serial_number IN ('SP18-IMP1-001','SP18-IMP1-002');
INSERT INTO WARRANTY (invoice_id, product_id, serial_number, start_date, end_date) VALUES
(8, 18, 'SP18-IMP1-001', DATEADD(day,-4,GETDATE()), DATEADD(month,12,DATEADD(day,-4,GETDATE()))),
(8, 18, 'SP18-IMP1-002', DATEADD(day,-4,GETDATE()), DATEADD(month,12,DATEADD(day,-4,GETDATE())));

-- HĐ9: SP4 x1 → serial SP4-IMP1-001
UPDATE PRODUCT_SERIAL SET sell_status = 0 WHERE serial_number = 'SP4-IMP1-001';
INSERT INTO WARRANTY (invoice_id, product_id, serial_number, start_date, end_date) VALUES
(9, 4, 'SP4-IMP1-001', DATEADD(day,-3,GETDATE()), DATEADD(month,24,DATEADD(day,-3,GETDATE())));

-- HĐ10: SP20 x2 → serial SP20-IMP1-001,002
UPDATE PRODUCT_SERIAL SET sell_status = 0 WHERE serial_number IN ('SP20-IMP1-001','SP20-IMP1-002');
INSERT INTO WARRANTY (invoice_id, product_id, serial_number, start_date, end_date) VALUES
(10, 20, 'SP20-IMP1-001', DATEADD(day,-2,GETDATE()), DATEADD(month,12,DATEADD(day,-2,GETDATE()))),
(10, 20, 'SP20-IMP1-002', DATEADD(day,-2,GETDATE()), DATEADD(month,12,DATEADD(day,-2,GETDATE())));
GO

-- ============================================================
-- NHÓM 8: WARRANTY_CLAIM (một số phiếu bảo hành có yêu cầu sửa chữa)
-- ============================================================
INSERT INTO WARRANTY_CLAIM (warranty_id, employee_id, claim_date, description, status) VALUES
(1,  1, DATEADD(day,-8, GETDATE()), N'Đứt dây đàn guitar số 6',            N'Done'),
(3,  2, DATEADD(day,-7, GETDATE()), N'Rung nhẹ ở fret 3',                  N'Done'),
(5,  3, DATEADD(day,-6, GETDATE()), N'Phím nặng bất thường',               N'Processing'),
(7,  4, DATEADD(day,-5, GETDATE()), N'Mất tín hiệu output jack',           N'Processing'),
(9,  5, DATEADD(day,-4, GETDATE()), N'Màn hình LCD bị loạn pixel',         N'Pending'),
(11, 1, DATEADD(day,-3, GETDATE()), N'Bàn đạp sustain không nhận',         N'Pending'),
(13, 2, DATEADD(day,-2, GETDATE()), N'Dây đàn violin bị đứt dây La',       N'Processing'),
(15, 3, DATEADD(day,-1, GETDATE()), N'Ốc vít cổ kèn bị gỉ sét',           N'Pending');
GO

-- ============================================================
-- NHÓM 9: ACCOUNT (Tài khoản đăng nhập)
-- ============================================================
INSERT INTO ACCOUNT (employee_id, username, password, role) VALUES
(1, 'admin',   '123456', 'manager'),
(2, 'nv002',   '123456', 'employee'),
(3, 'nv003',   '123456', 'employee'),
(4, 'nv004',   '123456', 'employee'),
(5, 'nv005',   '123456', 'employee');
GO

-- ============================================================
-- KIỂM TRA KẾT QUẢ
-- ============================================================
SELECT 'CATEGORY'       AS [Bảng], COUNT(*) AS [Số dòng] FROM CATEGORY       UNION ALL
SELECT 'MANUFACTURER',   COUNT(*) FROM MANUFACTURER  UNION ALL
SELECT 'PROVIDER',       COUNT(*) FROM PROVIDER      UNION ALL
SELECT 'PERSON',         COUNT(*) FROM PERSON        UNION ALL
SELECT 'PERSON_PHONE',   COUNT(*) FROM PERSON_PHONE  UNION ALL
SELECT 'EMPLOYEE',       COUNT(*) FROM EMPLOYEE      UNION ALL
SELECT 'CUSTOMER',       COUNT(*) FROM CUSTOMER      UNION ALL
SELECT 'PRODUCT',        COUNT(*) FROM PRODUCT       UNION ALL
SELECT 'IMPORT',         COUNT(*) FROM IMPORT        UNION ALL
SELECT 'IMPORT_DETAIL',  COUNT(*) FROM IMPORT_DETAIL UNION ALL
SELECT 'PRODUCT_SERIAL', COUNT(*) FROM PRODUCT_SERIAL UNION ALL
SELECT 'INVOICE',        COUNT(*) FROM INVOICE       UNION ALL
SELECT 'INVOICE_DETAIL', COUNT(*) FROM INVOICE_DETAIL UNION ALL
SELECT 'WARRANTY',       COUNT(*) FROM WARRANTY      UNION ALL
SELECT 'WARRANTY_CLAIM', COUNT(*) FROM WARRANTY_CLAIM UNION ALL
SELECT 'ACCOUNT',        COUNT(*) FROM ACCOUNT;
GO