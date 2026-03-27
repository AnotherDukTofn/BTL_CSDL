USE SqlPtit;
GO

-- Xóa sạch dữ liệu khi init
-- 1. Tắt tạm thời các ràng buộc khóa ngoại để xóa cho nhanh
EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL'
GO

-- 2. Xóa sạch dữ liệu trong tất cả các bảng
EXEC sp_MSforeachtable 'DELETE FROM ?'
GO

-- 3. Reset các cột IDENTITY về lại số 1
EXEC sp_MSforeachtable 'IF OBJECTPROPERTY(OBJECT_ID(''?''), ''TableHasIdentity'') = 1 DBCC CHECKIDENT (''?'', RESEED, 0)'
GO

-- 4. Bật lại các ràng buộc khóa ngoại
EXEC sp_MSforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL'
GO

SELECT 'Status' as [Thông báo], 'Đã xóa sạch dữ liệu và reset ID về 1' as [Kết quả];

-- ============================================================
-- NHÓM 1: Dữ liệu danh mục (Lookup tables)
-- ============================================================
INSERT INTO CATEGORY (name) VALUES
(N'Guitar Acoustic'), (N'Guitar Classic'), (N'Electric Guitar'),
(N'Piano Cơ'), (N'Piano Điện'), (N'Keyboard'),
(N'Trống Jazz'), (N'Trống Điện'), (N'Violin'), (N'Saxophone');

INSERT INTO MANUFACTURER (name) VALUES
(N'Yamaha'), (N'Roland'), (N'Fender'), (N'Taylor'), (N'Gibson'),
(N'Casio'), (N'Kawai'), (N'Pearl'), (N'Stradivarius'), (N'Selmer');

INSERT INTO PROVIDER (name, email, phone) VALUES
(N'Tiến Đạt Music',  'info@tiendat.vn',         '0901234561'),
(N'Việt Thương',     'sales@vietthuong.vn',      '0901234562'),
(N'Swee Lee',        'contact@sweelee.com.vn',   '0901234563'),
(N'Hảo Vĩnh',       'haovinh@gmail.com',         '0901234564');
GO

-- ============================================================
-- NHÓM 2: PERSON (20 người) + PERSON_PHONE
-- ============================================================
INSERT INTO PERSON (first_name, last_name, gender, province) VALUES
(N'Nguyễn', N'An',    N'Nam', N'Hà Nội'),    (N'Trần',   N'Bình',  N'Nam', N'Hà Nội'),
(N'Lê',     N'Chi',   N'Nữ',  N'TP HCM'),    (N'Phạm',   N'Dũng',  N'Nam', N'Đà Nẵng'),
(N'Hoàng',  N'Giang', N'Nữ',  N'Hải Phòng'), (N'Vũ',     N'Hải',   N'Nam', N'Cần Thơ'),
(N'Đặng',   N'Hòa',   N'Nam', N'Hà Nội'),    (N'Bùi',    N'Hương', N'Nữ',  N'TP HCM'),
(N'Đỗ',     N'Khánh', N'Nam', N'Huế'),        (N'Hồ',     N'Lan',   N'Nữ',  N'Quảng Ninh'),
(N'Ngô',    N'Minh',  N'Nam', N'Nam Định'),   (N'Dương',  N'Nam',   N'Nam', N'Hà Nội'),
(N'Lý',     N'Nga',   N'Nữ',  N'TP HCM'),     (N'Phan',   N'Phúc',  N'Nam', N'Bình Dương'),
(N'Trương', N'Quân',  N'Nam', N'Hà Nội'),    (N'Võ',     N'Quỳnh', N'Nữ',  N'Đà Lạt'),
(N'Diệp',   N'Sơn',   N'Nam', N'Hà Nội'),    (N'Tạ',     N'Tâm',   N'Nữ',  N'TP HCM'),
(N'Cao',    N'Thắng', N'Nam', N'Vinh'),       (N'Mai',    N'Trinh', N'Nữ',  N'Nha Trang');

INSERT INTO PERSON_PHONE (person_id, phone_num) VALUES
(1,  N'0901111001'), (2,  N'0901111002'), (3,  N'0901111003'), (4,  N'0901111004'),
(5,  N'0901111005'), (6,  N'0901111006'), (7,  N'0901111007'), (8,  N'0901111008'),
(9,  N'0901111009'), (10, N'0901111010'), (11, N'0901111011'), (12, N'0901111012'),
(13, N'0901111013'), (14, N'0901111014'), (15, N'0901111015'), (16, N'0901111016'),
(17, N'0901111017'), (18, N'0901111018'), (19, N'0901111019'), (20, N'0901111020');
GO

-- ============================================================
-- NHÓM 3: EMPLOYEE (NV%03d) và CUSTOMER (KH%03d)
-- ============================================================
-- 5 người đầu làm Nhân viên (ID 1-5), mã NV%03d theo id
INSERT INTO EMPLOYEE (id, employee_code, position, employment_type, is_active) VALUES
(1, 'NV001', N'Quản lý',   N'Toàn thời gian', 1),
(2, 'NV002', N'Kế toán',   N'Toàn thời gian', 1),
(3, 'NV003', N'Bán hàng',  N'Toàn thời gian', 1),
(4, 'NV004', N'Bán hàng',  N'Hợp đồng',       1),
(5, 'NV005', N'Kỹ thuật',  N'Bán thời gian',   1);

-- 15 người sau làm Khách hàng (ID 6-20), mã KH%03d theo id
INSERT INTO CUSTOMER (id, customer_code) VALUES
(6,  'KH006'), (7,  'KH007'), (8,  'KH008'), (9,  'KH009'), (10, 'KH010'),
(11, 'KH011'), (12, 'KH012'), (13, 'KH013'), (14, 'KH014'), (15, 'KH015'),
(16, 'KH016'), (17, 'KH017'), (18, 'KH018'), (19, 'KH019'), (20, 'KH020');
GO

-- ============================================================
-- NHÓM 4: PRODUCT (20 sản phẩm)
-- ============================================================
INSERT INTO PRODUCT (name, category_id, manufacturer_id, in_unit_price, out_unit_price, stock_quantity) VALUES
(N'Yamaha FG800',         1,  1,  4000,   5500,   0),  (N'Taylor 114ce',          1,  4,  18000,  22000,  67),
(N'Fender Stratocaster',  3,  3,  15000,  19000,  0),  (N'Gibson Les Paul',        3,  5,  45000,  55000,  36),
(N'Yamaha U1J',           4,  1,  85000,  110000, 0),  (N'Kawai K300',             4,  7,  120000, 145000, 18),
(N'Roland FP-30X',        5,  2,  16000,  20000,  0),  (N'Casio PX-S1100',         5,  6,  14000,  17500,  27),
(N'Yamaha PSR-E473',      6,  1,  8000,   10500,  0),  (N'Roland Juno-DS',         6,  2,  22000,  28000,  29),
(N'Pearl Export',         7,  8,  25000,  32000,  0),  (N'Yamaha Rydeen',          7,  1,  18000,  23000,  22),
(N'Roland TD-17KVX',      8,  2,  35000,  42000,  0),  (N'Yamaha DTX6K',           8,  1,  28000,  34000,  11),
(N'Stradivarius Copy',    9,  9,  50000,  70000,  0),  (N'Yamaha V3AS',            9,  1,  12000,  15500,  9),
(N'Selmer AS42',          10, 10, 40000,  52000,  0),  (N'Yamaha YAS-280',         10, 1,  25000,  31000,  20),
(N'Fender Precision Bass',3,  3,  17000,  21000,  0),  (N'Taylor GS Mini',         1,  4,  12000,  16000,  11);
GO

-- ============================================================
-- NHÓM 5: IMPORT + IMPORT_DETAIL + PRODUCT_SERIAL
--   Import 1 (mẫu ban đầu): chỉ có Serial, stock đặt thẳng trong PRODUCT
--   Import 2-6: có IMPORT_DETAIL → trigger cộng stock tự động
-- ============================================================
INSERT INTO IMPORT (employee_id, provider_id, create_time) VALUES
(1, 1, DATEADD(day, -40, GETDATE())),  -- Import 1 (gốc)
(2, 2, DATEADD(day, -30, GETDATE())),  -- Import 2
(3, 3, DATEADD(day, -25, GETDATE())),  -- Import 3
(4, 4, DATEADD(day, -20, GETDATE())),  -- Import 4
(5, 1, DATEADD(day, -15, GETDATE())),  -- Import 5
(1, 2, DATEADD(day, -10, GETDATE())); -- Import 6

INSERT INTO PRODUCT_SERIAL (serial_number, product_id, import_id, sell_status) VALUES
('SN-GTR-001', 1,  1, 1), ('SN-GTR-002', 2,  1, 1), ('SN-GTR-003', 3,  1, 1), ('SN-GTR-004', 4,  1, 1),
('SN-PNO-001', 5,  1, 1), ('SN-PNO-002', 6,  1, 1), ('SN-PNO-003', 7,  1, 1), ('SN-PNO-004', 8,  1, 1),
('SN-KEY-001', 9,  1, 1), ('SN-KEY-002', 10, 1, 1), ('SN-DRM-001', 11, 1, 1), ('SN-DRM-002', 12, 1, 1),
('SN-DRM-003', 13, 1, 1), ('SN-DRM-004', 14, 1, 1), ('SN-VIO-001', 15, 1, 1), ('SN-VIO-002', 16, 1, 1),
('SN-SAX-001', 17, 1, 1), ('SN-SAX-002', 18, 1, 1), ('SN-BAS-001', 19, 1, 1), ('SN-GTR-005', 20, 1, 1);

-- Import 2-6: IMPORT_DETAIL → trigger cộng stock cho SP đang =0
INSERT INTO IMPORT_DETAIL (import_id, product_id, import_quantity, unit_price) VALUES
(2, 1,  30, 4000),  (2, 3,  25, 15000), (2, 5,  10, 85000),  (2, 7,  20, 16000),
(3, 9,  30, 8000),  (3, 11, 15, 25000), (3, 13, 12, 35000),  (3, 15,  8, 50000),
(4, 17, 10, 40000), (4, 19, 20, 17000), (4, 2,  10, 18000),  (4, 4,  10, 45000),
(5, 6,  15, 120000),(5, 8,  10, 14000), (5, 10,  5, 22000),  (5, 12, 10, 18000),
(6, 14,  8, 28000), (6, 16, 12, 12000), (6, 18, 15, 25000),  (6, 20, 20, 12000);
GO

-- ============================================================
-- NHÓM 6: INVOICE + INVOICE_DETAIL
--   Stock sau Import 2-6 đủ để bán (ví dụ SP1: 0+30=30)
-- ============================================================
INSERT INTO INVOICE (customer_id, employee_id, create_time) VALUES
(6,  1, DATEADD(day, -14, GETDATE())), (7,  2, DATEADD(day, -13, GETDATE())),
(8,  3, DATEADD(day, -12, GETDATE())), (9,  4, DATEADD(day, -11, GETDATE())),
(10, 5, DATEADD(day, -10, GETDATE())), (11, 1, DATEADD(day, -9,  GETDATE())),
(12, 2, DATEADD(day, -8,  GETDATE())), (13, 3, DATEADD(day, -7,  GETDATE())),
(14, 4, DATEADD(day, -6,  GETDATE())), (15, 5, DATEADD(day, -5,  GETDATE())),
(16, 1, DATEADD(day, -4,  GETDATE())), (17, 2, DATEADD(day, -4,  GETDATE())),
(18, 3, DATEADD(day, -3,  GETDATE())), (19, 4, DATEADD(day, -3,  GETDATE())),
(20, 5, DATEADD(day, -2,  GETDATE())), (6,  1, DATEADD(day, -2,  GETDATE())),
(7,  2, DATEADD(day, -1,  GETDATE())), (8,  3, DATEADD(day, -1,  GETDATE())),
(9,  4, GETDATE()),                    (10, 5, GETDATE());

INSERT INTO INVOICE_DETAIL (invoice_id, product_id, buy_quantity, unit_price) VALUES
(1,  2,  2, 22000),  (2,  4,  1, 55000),  (3,  6,  1, 145000), (4,  8,  2, 17500),
(5,  10, 2, 28000),  (6,  12, 1, 23000),  (7,  14, 2, 34000),  (8,  16, 2, 15500),
(9,  18, 2, 31000),  (10, 20, 2, 16000),  (11, 1,  2, 5500),   (12, 3,  2, 19000),
(13, 5,  1, 110000), (14, 7,  2, 20000),  (15, 9,  2, 10500),  (16, 11, 2, 32000),
(17, 13, 2, 42000),  (18, 15, 1, 70000),  (19, 17, 2, 52000),  (20, 19, 2, 21000);
GO

-- ============================================================
-- NHÓM 7: WARRANTY + WARRANTY_CLAIM
-- ============================================================
INSERT INTO WARRANTY (invoice_id, product_id, serial_number, start_date, end_date) VALUES
(1,  2,  'SN-GTR-002', DATEADD(day,-14,GETDATE()), DATEADD(year,1,DATEADD(day,-14,GETDATE()))),
(2,  4,  'SN-GTR-004', DATEADD(day,-13,GETDATE()), DATEADD(year,2,DATEADD(day,-13,GETDATE()))),
(3,  6,  'SN-PNO-002', DATEADD(day,-12,GETDATE()), DATEADD(year,3,DATEADD(day,-12,GETDATE()))),
(4,  8,  'SN-PNO-004', DATEADD(day,-11,GETDATE()), DATEADD(year,1,DATEADD(day,-11,GETDATE()))),
(5,  10, 'SN-KEY-002', DATEADD(day,-10,GETDATE()), DATEADD(year,1,DATEADD(day,-10,GETDATE()))),
(6,  12, 'SN-DRM-002', DATEADD(day,-9, GETDATE()), DATEADD(year,1,DATEADD(day,-9, GETDATE()))),
(7,  14, 'SN-DRM-004', DATEADD(day,-8, GETDATE()), DATEADD(year,1,DATEADD(day,-8, GETDATE()))),
(8,  16, 'SN-VIO-002', DATEADD(day,-7, GETDATE()), DATEADD(year,2,DATEADD(day,-7, GETDATE()))),
(9,  18, 'SN-SAX-002', DATEADD(day,-6, GETDATE()), DATEADD(year,1,DATEADD(day,-6, GETDATE()))),
(10, 20, 'SN-GTR-005', DATEADD(day,-5, GETDATE()), DATEADD(year,1,DATEADD(day,-5, GETDATE()))),
(11, 1,  'SN-GTR-001', DATEADD(day,-4, GETDATE()), DATEADD(year,1,DATEADD(day,-4, GETDATE()))),
(12, 3,  'SN-GTR-003', DATEADD(day,-4, GETDATE()), DATEADD(year,1,DATEADD(day,-4, GETDATE()))),
(13, 5,  'SN-PNO-001', DATEADD(day,-3, GETDATE()), DATEADD(year,3,DATEADD(day,-3, GETDATE()))),
(14, 7,  'SN-PNO-003', DATEADD(day,-3, GETDATE()), DATEADD(year,1,DATEADD(day,-3, GETDATE()))),
(15, 9,  'SN-KEY-001', DATEADD(day,-2, GETDATE()), DATEADD(year,1,DATEADD(day,-2, GETDATE()))),
(16, 11, 'SN-DRM-001', DATEADD(day,-2, GETDATE()), DATEADD(year,1,DATEADD(day,-2, GETDATE()))),
(17, 13, 'SN-DRM-003', DATEADD(day,-1, GETDATE()), DATEADD(year,1,DATEADD(day,-1, GETDATE()))),
(18, 15, 'SN-VIO-001', DATEADD(day,-1, GETDATE()), DATEADD(year,2,DATEADD(day,-1, GETDATE()))),
(19, 17, 'SN-SAX-001', GETDATE(),                  DATEADD(year,1,GETDATE())),
(20, 19, 'SN-BAS-001', GETDATE(),                  DATEADD(year,1,GETDATE()));

INSERT INTO WARRANTY_CLAIM (warranty_id, employee_id, claim_date, description, status) VALUES
(1,  1, DATEADD(day,-10,GETDATE()), N'Đứt dây đàn guitar',                N'Done'),
(2,  2, DATEADD(day,-9, GETDATE()), N'Rung nhẹ ở fret 3',                 N'Done'),
(3,  3, DATEADD(day,-8, GETDATE()), N'Phím đàn piano bị kẹt',             N'Processing'),
(4,  4, DATEADD(day,-8, GETDATE()), N'Mất âm thanh loa phải',             N'Processing'),
(5,  5, DATEADD(day,-7, GETDATE()), N'Màn hình hiển thị bị loạn',         N'Done'),
(6,  1, DATEADD(day,-7, GETDATE()), N'Bàn đạp sustain hỏng',              N'Pending'),
(7,  2, DATEADD(day,-6, GETDATE()), N'Mặt trống bị rách',                 N'Pending'),
(8,  3, DATEADD(day,-6, GETDATE()), N'Dây đàn violin bị đứt',             N'Processing'),
(9,  4, DATEADD(day,-5, GETDATE()), N'Ốc vít cổ kèn bị gỉ',               N'Pending'),
(10, 5, DATEADD(day,-5, GETDATE()), N'Phím guitar bị mòn',                N'Done'),
(11, 1, DATEADD(day,-4, GETDATE()), N'Nut đàn bị sứt mẻ',                 N'Processing'),
(12, 2, DATEADD(day,-4, GETDATE()), N'Cần đàn bị cong nhẹ',               N'Pending'),
(13, 3, DATEADD(day,-3, GETDATE()), N'Bàn phím piano nặng bất thường',    N'Pending'),
(14, 4, DATEADD(day,-3, GETDATE()), N'Mất tín hiệu output jack',           N'Pending'),
(15, 5, DATEADD(day,-2, GETDATE()), N'Bộ đệm keyboard bị rách',           N'Processing'),
(16, 1, DATEADD(day,-2, GETDATE()), N'Loa keyboard bị rè',                N'Done'),
(17, 2, DATEADD(day,-1, GETDATE()), N'Module âm thanh bị lỗi firmware',   N'Pending'),
(18, 3, DATEADD(day,-1, GETDATE()), N'Vỏ violin bị trầy xước nặng',       N'Processing'),
(19, 4, GETDATE(),                  N'Tắc kèo kèn Saxophone',              N'Pending'),
(20, 5, GETDATE(),                  N'Sạc pin không nhận nguồn',           N'Pending');
GO

-- ============================================================
-- KIỂM TRA KẾT QUẢ
-- ============================================================
SELECT 'CATEGORY'      AS [Bảng], COUNT(*) AS [Số dòng] FROM CATEGORY       UNION ALL
SELECT 'MANUFACTURER',  COUNT(*) FROM MANUFACTURER  UNION ALL
SELECT 'PROVIDER',      COUNT(*) FROM PROVIDER      UNION ALL
SELECT 'PERSON',        COUNT(*) FROM PERSON        UNION ALL
SELECT 'PERSON_PHONE',  COUNT(*) FROM PERSON_PHONE  UNION ALL
SELECT 'EMPLOYEE',      COUNT(*) FROM EMPLOYEE      UNION ALL
SELECT 'CUSTOMER',      COUNT(*) FROM CUSTOMER      UNION ALL
SELECT 'PRODUCT',       COUNT(*) FROM PRODUCT       UNION ALL
SELECT 'IMPORT',        COUNT(*) FROM IMPORT        UNION ALL
SELECT 'IMPORT_DETAIL', COUNT(*) FROM IMPORT_DETAIL UNION ALL
SELECT 'PRODUCT_SERIAL',COUNT(*) FROM PRODUCT_SERIAL UNION ALL
SELECT 'INVOICE',       COUNT(*) FROM INVOICE       UNION ALL
SELECT 'INVOICE_DETAIL',COUNT(*) FROM INVOICE_DETAIL UNION ALL
SELECT 'WARRANTY',      COUNT(*) FROM WARRANTY      UNION ALL
SELECT 'WARRANTY_CLAIM',COUNT(*) FROM WARRANTY_CLAIM;
GO