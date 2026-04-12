# Danh sách chức năng và Truy vấn SQL tương ứng (theo codebase BTL_CSDL)

Tài liệu này liệt kê chi tiết các chức năng đã được triển khai trên website và đoạn mã truy vấn SQL cụ thể được sử dụng trong backend (`backend/routes/`) để thực hiện các chức năng đó. Các chức năng không liên quan tới thao tác cơ sở dữ liệu sẽ không được liệt kê tại đây.

**Ghi chú codebase:** Đăng nhập và “session” dùng header `x-employee-id` (không có JWT trong mã nguồn hiện tại). Tồn kho hiển thị ở API sản phẩm được tính bằng **đếm serial còn hàng** (`PRODUCT_SERIAL.sell_status = 1`), không lấy trực tiếp cột `PRODUCT.stock_quantity` trong câu `SELECT` danh sách sản phẩm.

---

## 1. Xác thực và Phân quyền (Authentication)

**Đăng nhập hệ thống:** Kiểm tra thông tin đăng nhập và trả về dữ liệu nhân viên (bao gồm các thông tin cá nhân cơ bản và quyền tài khoản).

```sql
SELECT a.employee_id, a.username, a.role,
       e.employee_code, e.position, e.is_active,
       CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name) AS full_name
FROM ACCOUNT a
JOIN EMPLOYEE e ON a.employee_id = e.id
JOIN PERSON p ON e.id = p.id
WHERE a.username = @username AND a.password = @password
```

**Lấy thông tin tài khoản hiện tại (Me):** Lấy lại thông tin user thông qua `employee_id` gửi kèm header (ứng dụng dùng `x-employee-id`).

```sql
SELECT a.employee_id, a.username, a.role,
       e.employee_code, e.position, e.is_active,
       CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name) AS full_name
FROM ACCOUNT a
JOIN EMPLOYEE e ON a.employee_id = e.id
JOIN PERSON p ON e.id = p.id
WHERE a.employee_id = @employee_id
```

---

## 2. Quản lý Nhân viên (Employees)

**Lấy danh sách nhân viên:** Lấy thông tin cá nhân, địa chỉ, nghề nghiệp, trạng thái, vai trò tài khoản và số điện thoại liên lạc (một số — `TOP 1`).

```sql
SELECT e.id, e.employee_code, e.employment_type, e.position, e.is_active,
       CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name) AS full_name,
       p.first_name, p.middle_name, p.last_name, p.gender,
       p.house_num, p.street, p.district, p.province,
       a.username, a.role AS account_role,
       (SELECT TOP 1 pp.phone_num FROM PERSON_PHONE pp WHERE pp.person_id = e.id) AS phone_num
FROM EMPLOYEE e
JOIN PERSON p ON e.id = p.id
LEFT JOIN ACCOUNT a ON a.employee_id = e.id
ORDER BY e.id
```

**Thêm nhân viên mới:** Transaction — Thêm người → Thêm nhân sự → Số điện thoại (tuỳ chọn) → Tài khoản.

```sql
-- PERSON
INSERT INTO PERSON (first_name, middle_name, last_name, gender, house_num, street, district, province)
VALUES (@first_name, @middle_name, @last_name, @gender, @house_num, @street, @district, @province);
SELECT SCOPE_IDENTITY() AS id;
```

```sql
-- EMPLOYEE
INSERT INTO EMPLOYEE (id, employee_code, position, employment_type, is_active)
VALUES (@id, @employee_code, @position, @employment_type, 1)
```

```sql
-- PERSON_PHONE (nếu có)
INSERT INTO PERSON_PHONE (person_id, phone_num) VALUES (@person_id, @phone_num)
```

```sql
-- ACCOUNT
INSERT INTO ACCOUNT (employee_id, username, password, role)
VALUES (@employee_id, @username, @password, 'employee')
```

**Cập nhật thông tin nhân viên:** Vị trí, loại hợp đồng, địa chỉ; cập nhật SĐT bằng xóa rồi chèn lại; mật khẩu tài khoản nếu có gửi lên.

```sql
UPDATE EMPLOYEE SET position = @position, employment_type = @employment_type WHERE id = @id
```

```sql
UPDATE PERSON SET house_num = @house_num, street = @street, district = @district, province = @province WHERE id = @id
```

```sql
DELETE FROM PERSON_PHONE WHERE person_id = @person_id;
INSERT INTO PERSON_PHONE (person_id, phone_num) VALUES (@person_id, @phone_num)
```

```sql
-- Nếu có password mới
UPDATE ACCOUNT SET password = @password WHERE employee_id = @employee_id
```

**Thay đổi trạng thái tài khoản (Khóa/Mở khóa):**

```sql
UPDATE EMPLOYEE SET is_active = @is_active WHERE id = @id
```

**Cấp quyền hoặc thay đổi phân quyền:**

```sql
UPDATE ACCOUNT SET role = @role WHERE employee_id = @employee_id
```

---

## 3. Quản lý Khách hàng (Customers)

**Lấy danh sách khách hàng:**

```sql
SELECT c.id, c.customer_code,
       CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name) AS full_name,
       p.first_name, p.middle_name, p.last_name, p.gender,
       p.province, p.district, p.street, p.house_num,
       CONCAT_WS(' ', p.house_num, p.street, p.district, p.province) AS address,
       pp.phone_num
FROM CUSTOMER c
JOIN PERSON p ON c.id = p.id
LEFT JOIN PERSON_PHONE pp ON p.id = pp.person_id
ORDER BY c.id
```

**Tìm kiếm khách hàng:** Khớp theo ID, mã khách hoặc tên.

```sql
-- Cùng SELECT như trên, thêm điều kiện:
WHERE c.id = @keywordInt
   OR c.customer_code LIKE '%' + @keyword + '%'
   OR p.first_name LIKE '%' + @keyword + '%'
   OR p.last_name LIKE '%' + @keyword + '%'
```

**Thêm khách hàng mới:** Transaction — Thêm người → Thêm khách hàng → SĐT (tuỳ chọn).

```sql
INSERT INTO PERSON (first_name, middle_name, last_name, gender, province, district, street, house_num)
VALUES (@first_name, @middle_name, @last_name, @gender, @province, @district, @street, @house_num);
SELECT SCOPE_IDENTITY() AS id;
```

```sql
INSERT INTO CUSTOMER (id, customer_code) VALUES (@id, @customer_code)
```

```sql
INSERT INTO PERSON_PHONE (person_id, phone_num) VALUES (@person_id, @phone_num)
```

**Cập nhật thông tin khách hàng:**

```sql
UPDATE PERSON SET first_name = @first_name, middle_name = @middle_name,
       last_name = @last_name, gender = @gender, province = @province,
       district = @district, street = @street, house_num = @house_num
WHERE id = @id
```

```sql
DELETE FROM PERSON_PHONE WHERE person_id = @person_id;
INSERT INTO PERSON_PHONE (person_id, phone_num) VALUES (@person_id, @phone_num)
```

---

## 4. Quản lý Sản phẩm (Products)

**Lấy danh sách và sắp xếp sản phẩm:** Có tham chiếu danh mục và nhà sản xuất. **Tồn kho trả về** là `stock_quantity` alias = số serial còn trong kho (không phải cột `p.stock_quantity`).

```sql
SELECT p.id, p.name, p.category_id, p.manufacturer_id,
       c.name AS category_name, m.name AS manufacturer_name,
       p.in_unit_price, p.out_unit_price,
       ISNULL((SELECT COUNT(*) FROM PRODUCT_SERIAL ps WHERE ps.product_id = p.id AND ps.sell_status = 1), 0) AS stock_quantity
FROM PRODUCT p
LEFT JOIN CATEGORY c ON p.category_id = c.id
LEFT JOIN MANUFACTURER m ON p.manufacturer_id = m.id
ORDER BY p.id
```

**Tìm kiếm sản phẩm:** Theo ID hoặc tên (nhánh `type = 'id'` trong code dùng điều kiện khác).

```sql
-- Theo tên / ID (một trong các biến thể trong code):
WHERE p.id = @keywordInt OR p.name LIKE N'%' + @keyword + '%'
ORDER BY p.id
```

**Lọc sản phẩm:** Theo `categoryId` và/hoặc `manufacturerId` (điều kiện được ghép động trong code).

```sql
WHERE p.category_id = @categoryId AND p.manufacturer_id = @manufacturerId
ORDER BY p.id
```

**Thêm sản phẩm mới:**

```sql
INSERT INTO PRODUCT (name, category_id, manufacturer_id, in_unit_price, out_unit_price, stock_quantity)
VALUES (@name, @category_id, @manufacturer_id, @in_unit_price, @out_unit_price, @stock_quantity)
```

**Cập nhật sản phẩm:**

```sql
UPDATE PRODUCT
SET name = @name, category_id = @category_id,
    manufacturer_id = @manufacturer_id, out_unit_price = @out_unit_price
WHERE id = @id
```

**Tồn kho theo lô (phiếu nhập):**

```sql
SELECT ps.import_id, i.create_time, idt.unit_price AS exact_import_price, idt.import_quantity AS original_quantity,
       COUNT(ps.serial_number) AS stock_quantity
FROM PRODUCT_SERIAL ps
LEFT JOIN IMPORT_DETAIL idt ON ps.import_id = idt.import_id AND ps.product_id = idt.product_id
LEFT JOIN IMPORT i ON ps.import_id = i.id
WHERE ps.product_id = @id AND ps.sell_status = 1
GROUP BY ps.import_id, i.create_time, idt.unit_price, idt.import_quantity
ORDER BY i.create_time ASC
```

**Serial còn trong kho (cho chọn khi lập hóa đơn):**

```sql
SELECT ps.serial_number, ps.import_id
FROM PRODUCT_SERIAL ps
WHERE ps.product_id = @id AND ps.sell_status = 1
ORDER BY ps.import_id ASC, ps.serial_number ASC
```

---

## 5. Quản lý Danh mục phân loại (Categories)

**Lấy danh sách:**

```sql
SELECT id, name FROM CATEGORY ORDER BY id
```

**Thêm danh mục:**

```sql
INSERT INTO CATEGORY (name) VALUES (@name)
```

---

## 6. Quản lý Nhà sản xuất (Manufacturers)

**Lấy danh sách:**

```sql
SELECT id, name FROM MANUFACTURER ORDER BY id
```

**Thêm nhà sản xuất:**

```sql
INSERT INTO MANUFACTURER (name) VALUES (@name)
```

---

## 7. Quản lý Nhà cung cấp (Providers)

**Danh sách:**

```sql
SELECT id, name, email, phone FROM PROVIDER ORDER BY id
```

**Tìm kiếm:**

```sql
SELECT id, name, email, phone FROM PROVIDER
WHERE id = @keywordInt OR name LIKE '%' + @keyword + '%'
ORDER BY id
```

**Thêm:**

```sql
INSERT INTO PROVIDER (name, email, phone) VALUES (@name, @email, @phone)
```

**Cập nhật:**

```sql
UPDATE PROVIDER SET name = @name, email = @email, phone = @phone WHERE id = @id
```

---

## 8. Lập Hóa đơn Bán hàng (Invoices)

**Danh sách hóa đơn (sắp xếp mới nhất trước):**

```sql
SELECT i.id, i.customer_id, i.employee_id, i.create_time,
       CONCAT_WS(' ', pc.first_name, pc.middle_name, pc.last_name) AS customer_name,
       CONCAT_WS(' ', pe.first_name, pe.middle_name, pe.last_name) AS employee_name
FROM INVOICE i
LEFT JOIN CUSTOMER c ON i.customer_id = c.id
LEFT JOIN PERSON pc ON c.id = pc.id
LEFT JOIN EMPLOYEE e ON i.employee_id = e.id
LEFT JOIN PERSON pe ON e.id = pe.id
ORDER BY i.id DESC
```

**Tìm kiếm hóa đơn:** Theo mã hóa đơn hoặc tên khách / nhân viên.

```sql
-- Cùng SELECT như trên, thêm:
WHERE i.id = @keywordInt
   OR pc.first_name LIKE '%' + @keyword + '%'
   OR pc.last_name LIKE '%' + @keyword + '%'
   OR pe.first_name LIKE '%' + @keyword + '%'
   OR pe.last_name LIKE '%' + @keyword + '%'
ORDER BY i.id DESC
```

**Tra cứu chi tiết hóa đơn:** Dòng bán + serial đã gán (serial lấy từ `WARRANTY` trong code — hai truy vấn).

```sql
SELECT d.invoice_id, d.product_id, d.buy_quantity, d.unit_price, p.name AS product_name
FROM INVOICE_DETAIL d
JOIN PRODUCT p ON d.product_id = p.id
WHERE d.invoice_id = @id
```

```sql
SELECT w.serial_number, w.product_id
FROM WARRANTY w
WHERE w.invoice_id = @id
```

**Lập hóa đơn mới (Transaction):** Khởi tạo hóa đơn; với mỗi dòng chi tiết: kiểm tra tồn serial, chèn chi tiết, gán serial (FIFO hoặc chọn tay), cập nhật `PRODUCT_SERIAL`, chèn `WARRANTY`. Trigger CSDL vẫn trừ `PRODUCT.stock_quantity` khi `INSERT INVOICE_DETAIL` (và kiểm tra tồn theo serial).

```sql
INSERT INTO INVOICE (customer_id, employee_id) VALUES (@customer_id, @employee_id);
SELECT SCOPE_IDENTITY() AS id;
```

```sql
-- Kiểm tra trước khi bán (trong code hiện tại)
SELECT COUNT(*) AS available_qty
FROM PRODUCT_SERIAL WITH (UPDLOCK, HOLDLOCK)
WHERE product_id = @product_id AND sell_status = 1
```

```sql
INSERT INTO INVOICE_DETAIL (invoice_id, product_id, buy_quantity, unit_price)
VALUES (@invoice_id, @product_id, @buy_quantity, @unit_price)
```

```sql
-- Chọn serial FIFO (ví dụ)
SELECT TOP (@qty) serial_number
FROM PRODUCT_SERIAL
WHERE product_id = @product_id AND sell_status = 1
ORDER BY serial_number ASC
```

```sql
UPDATE PRODUCT_SERIAL SET sell_status = 0 WHERE serial_number = @serial_number
```

```sql
SELECT ISNULL(warranty_months, 12) AS wm FROM PRODUCT WHERE id = @product_id
```

```sql
INSERT INTO WARRANTY (invoice_id, product_id, serial_number, start_date, end_date)
VALUES (@invoice_id, @product_id, @serial_number,
        CAST(GETDATE() AS date),
        CAST(DATEADD(month, @warranty_months, GETDATE()) AS date))
```

---

## 9. Nhập kho — Quản lý Phiếu nhập (Imports)

**Danh sách phiếu nhập:**

```sql
SELECT i.id, i.employee_id, i.provider_id, i.create_time,
       CONCAT_WS(' ', pe.first_name, pe.middle_name, pe.last_name) AS employee_name,
       pr.name AS provider_name
FROM IMPORT i
LEFT JOIN EMPLOYEE e ON i.employee_id = e.id
LEFT JOIN PERSON pe ON e.id = pe.id
LEFT JOIN PROVIDER pr ON i.provider_id = pr.id
ORDER BY i.id DESC
```

**Tìm kiếm phiếu nhập:**

```sql
-- Cùng SELECT, thêm:
WHERE i.id = @keywordInt
   OR pe.first_name LIKE '%' + @keyword + '%'
   OR pe.last_name LIKE '%' + @keyword + '%'
   OR pr.name LIKE '%' + @keyword + '%'
ORDER BY i.id DESC
```

**Chi tiết phiếu nhập:** Dòng nhập + serial thuộc phiếu (code gộp hai truy vấn).

```sql
SELECT d.import_id, d.product_id, d.import_quantity, d.unit_price, p.name AS product_name
FROM IMPORT_DETAIL d
JOIN PRODUCT p ON d.product_id = p.id
WHERE d.import_id = @id
```

```sql
SELECT serial_number, product_id
FROM PRODUCT_SERIAL
WHERE import_id = @id
```

**Tạo phiếu nhập mới:** Chèn phiếu → chi tiết (trigger cộng `PRODUCT.stock_quantity`) → sinh serial tự động theo từng dòng.

```sql
INSERT INTO IMPORT (employee_id, provider_id) VALUES (@employee_id, @provider_id);
SELECT SCOPE_IDENTITY() AS id;
```

```sql
INSERT INTO IMPORT_DETAIL (import_id, product_id, import_quantity, unit_price)
VALUES (@import_id, @product_id, @import_quantity, @unit_price)
```

```sql
INSERT INTO PRODUCT_SERIAL (serial_number, product_id, import_id, sell_status)
VALUES (@serial_number, @product_id, @import_id, 1)
```

---

## 10. Quản lý Bảo hành (Warranties & Warranty Claims)

**Danh sách bảo hành (serial đã kích hoạt):**

```sql
SELECT w.id, w.invoice_id, w.product_id, w.serial_number, w.start_date, w.end_date,
       p.name AS product_name
FROM WARRANTY w
LEFT JOIN PRODUCT p ON w.product_id = p.id
ORDER BY w.id DESC
```

**Tìm kiếm theo serial:**

```sql
SELECT w.id, w.invoice_id, w.product_id, w.serial_number, w.start_date, w.end_date,
       p.name AS product_name
FROM WARRANTY w
LEFT JOIN PRODUCT p ON w.product_id = p.id
WHERE w.serial_number LIKE '%' + @serial + '%'
ORDER BY w.id DESC
```

**Danh sách yêu cầu bảo hành (claims):**

```sql
SELECT wc.id, wc.warranty_id, wc.employee_id, wc.claim_date, wc.description, wc.status,
       w.serial_number, w.product_id, p.name AS product_name,
       CONCAT_WS(' ', pe.first_name, pe.middle_name, pe.last_name) AS employee_name
FROM WARRANTY_CLAIM wc
JOIN WARRANTY w ON wc.warranty_id = w.id
LEFT JOIN PRODUCT p ON w.product_id = p.id
LEFT JOIN EMPLOYEE e ON wc.employee_id = e.id
LEFT JOIN PERSON pe ON e.id = pe.id
ORDER BY wc.id DESC
```

**Tìm kiếm claims theo serial:**

```sql
-- Cùng SELECT, thêm:
WHERE w.serial_number LIKE '%' + @serial + '%'
```

**Tạo yêu cầu bảo hành:** `employee_id` lấy từ header `x-employee-id` trong code.

```sql
INSERT INTO WARRANTY_CLAIM (warranty_id, employee_id, claim_date, description, status)
VALUES (@warranty_id, @employee_id, @claim_date, @description, @status)
```

**Cập nhật trạng thái yêu cầu:**

```sql
UPDATE WARRANTY_CLAIM SET status = @status WHERE id = @id
```

---

## Phụ lục: Trigger CSDL liên quan (`Databases/02_TRIGGERS.sql`)

- **Sau nhập (`IMPORT_DETAIL`):** cộng `PRODUCT.stock_quantity` theo `import_quantity`.
- **Sau bán (`INVOICE_DETAIL`):** kiểm tra đủ serial `sell_status = 1` theo tổng `buy_quantity`; nếu đủ thì trừ `PRODUCT.stock_quantity`.
- **Sau chèn `WARRANTY`:** đồng bộ `PRODUCT_SERIAL.sell_status = 0` theo `serial_number` trong `inserted`.

Các thao tác trên bổ sung cho luồng “Tự động cập nhật kho / serial” trong tài liệu PDF gốc; chi tiết cú pháp xem file trigger trong repo.

---

*Tài liệu này bám cấu trúc và phong cách `Features.pdf`, đã chỉnh để khớp mã nguồn thực tế (route, alias tồn kho, serial, bảo hành, tìm kiếm bổ sung).*