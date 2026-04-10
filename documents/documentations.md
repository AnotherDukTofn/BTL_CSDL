# Tài liệu dự án BTL_CSDL

Tài liệu mô tả **các chức năng (feature)** hiện có và **các truy vấn SQL** (T-SQL trên Microsoft SQL Server) được sử dụng trong backend, script bảo trì, trigger, và DDL seed. Phần trọng tâm là **cú pháp, ý nghĩa từng mệnh đề SQL** và **luồng logic nghiệp vụ** liên quan.

---

## 1. Tổng quan hệ thống

| Thành phần | Vai trò |
|------------|---------|
| **Frontend** (`frontend/`) | Giao diện HTML/CSS/JS tĩnh, gọi REST API qua `fetch` (xem `frontend/js/api.js`). |
| **Backend** (`backend/`) | Node.js + Express, kết nối SQL Server qua `mssql` (`backend/db.js`). |
| **CSDL** | Database `SqlPtit`; schema trong `Databases/01_CREATE_DATABASE_AND_TABLES.sql`; dữ liệu mẫu `02_IMPORT_DATA.sql`; trigger `03_TRIGGERS.sql`. |

**API base URL (frontend):** `http://localhost:3000/api` (định nghĩa trong `frontend/js/api.js`).

**Các nhóm endpoint** (đăng ký trong `backend/server.js`):

- `/api/auth` — đăng nhập, session đơn giản qua header `x-employee-id` (ở các route cần nhân viên, ví dụ claim bảo hành).
- `/api/employees`, `/api/customers`, `/api/products`, `/api/categories`, `/api/manufacturers`, `/api/providers`
- `/api/invoices`, `/api/imports`, `/api/warranties`
- `/api/health` — kiểm tra server.

---

## 2. Khái niệm SQL dùng xuyên suốt dự án

### 2.1 Tham số hóa truy vấn (`@tên`)

Trong code Node, `pool.request().input('foo', sql.NVarChar, value)` tạo tham số `@foo`. Đây là **parameterized query**, tránh SQL injection và định kiểu rõ ràng.

### 2.2 `JOIN`

- **`INNER JOIN`**: chỉ lấy dòng có khớp ở cả hai bảng.
- **`LEFT JOIN`**: giữ tất cả dòng bảng trái; cột bảng phải có thể `NULL` nếu không khớp.

### 2.3 `CONCAT_WS(separator, c1, c2, ...)`

Nối chuỗi với dấu phân cách, **bỏ qua giá trị NULL**. Dùng để ghép họ tên: `CONCAT_WS(' ', first_name, middle_name, last_name)`.

### 2.4 Subquery trong `SELECT`

Ví dụ: `ISNULL((SELECT COUNT(*) FROM PRODUCT_SERIAL ps WHERE ...), 0)` — đếm trong bảng con, trả về một giá trị cho mỗi dòng `PRODUCT`.

### 2.5 `SCOPE_IDENTITY()`

Sau `INSERT` vào bảng có cột `IDENTITY`, `SELECT SCOPE_IDENTITY() AS id` trả về **khóa sinh tự động** của dòng vừa chèn trong cùng phiên.

### 2.6 `LIKE '%' + @keyword + '%'`

Nối chuỗi trong T-SQL bằng `+`. Mẫu `%...%` là tìm **chứa** chuỗi (không phân biệt collation tùy cấu hình DB).

### 2.7 `GROUP BY` + `COUNT` / `SUM`

Gom nhóm theo cột (ví dụ `product_id`), rồi `COUNT(*)` hoặc `SUM(buy_quantity)` cho từng nhóm.

### 2.8 `TOP (@n)`

Lấy **n** dòng đầu sau khi sắp xếp (`ORDER BY`). `@n` có thể là tham số (dùng trong FIFO serial).

### 2.9 Gợi ý khóa hàng: `WITH (UPDLOCK, HOLDLOCK)`

Trong transaction, đếm serial với `UPDLOCK, HOLDLOCK` giúp **giảm tranh chấp** khi nhiều giao dịch cùng bán một sản phẩm (không thay thế xử lý đầy đủ race condition ở mức ứng dụng, nhưng là mức gợi ý phổ biến trong T-SQL).

### 2.10 Trigger `inserted`

Trong trigger `AFTER INSERT`, bảng ảo `inserted` chứa **các dòng vừa được chèn** vào bảng gắn trigger.

---

## 3. Schema CSDL (DDL) — `Databases/01_CREATE_DATABASE_AND_TABLES.sql`

**Mục đích:** tạo database `SqlPtit` và các bảng: `PERSON`, `PERSON_PHONE`, `CUSTOMER`, `EMPLOYEE`, `PROVIDER`, `CATEGORY`, `MANUFACTURER`, `PRODUCT`, `IMPORT`, `IMPORT_DETAIL`, `PRODUCT_SERIAL`, `INVOICE`, `INVOICE_DETAIL`, `WARRANTY`, `WARRANTY_CLAIM`, `ACCOUNT`, v.v.

**Một số điểm logic:**

- `PERSON.id` là `IDENTITY`; `CUSTOMER.id` / `EMPLOYEE.id` trùng `PERSON.id` (quan hệ 1-1 ISA).
- `PRODUCT_SERIAL.serial_number` là khóa chính; `sell_status` bit — convention trong code: `1` = còn trong kho, `0` = đã bán.
- `INVOICE_DETAIL` khóa chính `(invoice_id, product_id)` — mỗi sản phẩm **một dòng** trên một hóa đơn.

**Lệnh đặc thù:**

- `IF EXISTS ... DROP DATABASE` / `CREATE DATABASE` — tái tạo DB sạch.
- `IDENTITY(1,1)`, `DEFAULT GETDATE()`, `decimal(18,2)` — kiểu chuẩn SQL Server.

---

## 4. Trigger CSDL — `Databases/03_TRIGGERS.sql`

### 4.1 `trg_UpdateStockAfterImport` (AFTER INSERT trên `IMPORT_DETAIL`)

```sql
UPDATE p
SET p.stock_quantity = p.stock_quantity + i.import_quantity
FROM PRODUCT p
INNER JOIN inserted i ON p.id = i.product_id;
```

**Logic:** Mỗi dòng nhập hàng cộng `import_quantity` vào `PRODUCT.stock_quantity` đúng `product_id`.

**Cú pháp:** `UPDATE ... FROM ... INNER JOIN inserted` — cập nhật `PRODUCT` theo từng dòng trong `inserted`.

---

### 4.2 `trg_UpdateStockAfterExport` (AFTER INSERT trên `INVOICE_DETAIL`)

**Bước kiểm tra:** So sánh tổng `buy_quantity` theo `product_id` trong `inserted` với số serial **còn hàng** (`sell_status = 1`) trong `PRODUCT_SERIAL`.

- Gom `inserted`: `GROUP BY product_id`, `SUM(buy_quantity)`.
- Gom `PRODUCT_SERIAL`: `COUNT(*)` với `sell_status = 1`, `GROUP BY product_id`.
- `LEFT JOIN` + `ISNULL(ps.available_qty, 0) < agg.total_qty` → thiếu hàng.

Nếu vi phạm: `RAISERROR(..., 16, 1)` rồi `ROLLBACK TRANSACTION`.

**Bước cập nhật:** Trừ `PRODUCT.stock_quantity` theo `SUM(buy_quantity)` từ `inserted` (join `PRODUCT` với bảng aggregate `agg`).

**Lưu ý nghiệp vụ:** Trigger kiểm tra **theo serial**, không đọc trực tiếp `PRODUCT.stock_quantity` để quyết định “đủ bán”. API tạo hóa đơn cũng có bước kiểm tra tương thích trước khi insert (xem mục 5.8).

---

### 4.3 `trg_UpdateSerialStatus` (AFTER INSERT trên `WARRANTY`)

```sql
UPDATE ps
SET ps.sell_status = 0
FROM PRODUCT_SERIAL ps
INNER JOIN inserted i ON ps.serial_number = i.serial_number;
```

**Logic:** Khi ghi bảo hành cho một serial, đánh dấu serial đó là **đã bán** (`sell_status = 0`). Trùng với cập nhật thủ công trong `invoices.js` — trigger đảm bảo đồng bộ nếu có nguồn insert `WARRANTY` khác.

---

### 4.4 Câu `SELECT` ở cuối file `03_TRIGGERS.sql`

File kết thúc bằng một truy vấn so khớp `PRODUCT.stock_quantity` với số serial (audit). Khi chạy script trong SSMS, câu này **sẽ chạy** và trả kết quả — không phải trigger; có thể dùng để kiểm tra dữ liệu sau khi áp trigger.

---

## 5. SQL theo từng module API (`backend/routes/`)

### 5.1 Auth — `routes/auth.js`

| Feature | Method | SQL / ý nghĩa |
|---------|--------|----------------|
| Đăng nhập | `POST /login` | `SELECT ... FROM ACCOUNT a JOIN EMPLOYEE e JOIN PERSON p WHERE a.username = @username AND a.password = @password` — xác thực tài khoản, lấy thông tin hiển thị. |
| Phiên hiện tại | `GET /me` | `WHERE a.employee_id = @employee_id` — tải lại user theo header. |

**Giải thích:** `JOIN` nối `ACCOUNT` → `EMPLOYEE` → `PERSON` để có `full_name` và mã nhân viên.

---

### 5.2 Nhân viên — `routes/employees.js`

| Feature | SQL chính |
|---------|-----------|
| Danh sách | `SELECT` từ `EMPLOYEE` + `PERSON` + `LEFT JOIN ACCOUNT`; subquery `(SELECT TOP 1 phone FROM PERSON_PHONE WHERE person_id = e.id)` lấy **một** số điện thoại. |
| Thêm NV | Transaction: `INSERT PERSON` → `SELECT SCOPE_IDENTITY()` → `INSERT EMPLOYEE` → optional `INSERT PERSON_PHONE` → `INSERT ACCOUNT`. |
| Cập nhật | `UPDATE EMPLOYEE`, `UPDATE PERSON`, `DELETE` + `INSERT PERSON_PHONE`, optional `UPDATE ACCOUNT` mật khẩu. |
| Khóa/mở | `UPDATE EMPLOYEE SET is_active = @is_active`. |
| Đổi role | `UPDATE ACCOUNT SET role = @role`. |

---

### 5.3 Khách hàng — `routes/customers.js`

| Feature | SQL chính |
|---------|-----------|
| `BASE_SELECT` | `CUSTOMER` + `PERSON` + `LEFT JOIN PERSON_PHONE` (một dòng/phone nếu nhiều số có thể nhân bản dòng — tùy dữ liệu). |
| Tìm kiếm | `WHERE` theo `id`, `customer_code LIKE`, `first_name`/`last_name LIKE`. |
| Thêm | Transaction: `INSERT PERSON` → `INSERT CUSTOMER` → optional phone. |
| Sửa | `UPDATE PERSON` toàn bộ tên/địa chỉ; xóa rồi chèn lại `PERSON_PHONE`. |

---

### 5.4 Sản phẩm — `routes/products.js`

**`BASE_SELECT` — điểm quan trọng:**

```sql
ISNULL((SELECT COUNT(*) FROM PRODUCT_SERIAL ps WHERE ps.product_id = p.id AND ps.sell_status = 1), 0) AS stock_quantity
```

**Logic:** Trường trả về tên `stock_quantity` nhưng **giá trị là số serial còn hàng**, không phải cột `PRODUCT.stock_quantity` thuần (có thể lệch nếu seed/trigger chạy sai thứ tự).

**Các endpoint:**

| Endpoint | SQL / ý nghĩa |
|----------|----------------|
| `GET /` | `BASE_SELECT` + `ORDER BY p.id`. |
| `GET /search` | Lọc theo `p.id` hoặc `p.name LIKE N'%' + @keyword + '%'`. |
| `GET /filter` | Động `WHERE p.category_id = @categoryId` và/hoặc `p.manufacturer_id = @manufacturerId`. |
| `POST /` | `INSERT INTO PRODUCT (...)` gồm `stock_quantity` khởi tạo. |
| `PUT /:id` | `UPDATE PRODUCT` (không đụng `stock_quantity` trong đoạn route này). |
| `GET /:id/batches` | `FROM PRODUCT_SERIAL ps` + join `IMPORT_DETAIL`, `IMPORT`, `WHERE sell_status = 1`, `GROUP BY` lô — đếm serial theo `import_id` (tồn theo lô). |
| `GET /:id/available-serials` | `SELECT serial_number, import_id WHERE product_id = @id AND sell_status = 1 ORDER BY import_id, serial_number`. |

---

### 5.5 Danh mục / Nhà sản xuất — `routes/categories.js`, `routes/manufacturers.js`

- `GET`: `SELECT id, name FROM CATEGORY|MANUFACTURER ORDER BY id`.
- `POST`: `INSERT INTO ... (name) VALUES (@name)`.

---

### 5.6 Nhà cung cấp — `routes/providers.js`

| Feature | SQL |
|---------|-----|
| Danh sách | `SELECT id, name, email, phone FROM PROVIDER ORDER BY id`. |
| Tìm | `WHERE id = @keywordInt OR name LIKE '%' + @keyword + '%'`. |
| Thêm | `INSERT INTO PROVIDER (name, email, phone)`. |
| Sửa | `UPDATE PROVIDER SET ... WHERE id = @id`. |

---

### 5.7 Nhập kho — `routes/imports.js`

**`BASE_SELECT`:** `IMPORT` + nhân viên (`EMPLOYEE`/`PERSON`) + `PROVIDER`.

| Feature | SQL / logic |
|---------|-------------|
| Danh sách / tìm | Giống pattern invoice: lọc theo `id`, tên NV, tên NCC. |
| Chi tiết phiếu | (1) `SELECT` từ `IMPORT_DETAIL` join `PRODUCT` theo `import_id`. (2) `SELECT serial_number, product_id FROM PRODUCT_SERIAL WHERE import_id = @id`. Code Node gộp serial theo `product_id`. |
| Tạo phiếu | `INSERT IMPORT` → `SCOPE_IDENTITY()` → vòng lặp: `INSERT IMPORT_DETAIL` (kích hoạt trigger cộng kho) → vòng `INSERT PRODUCT_SERIAL` với `sell_status = 1` theo format `SP{pid}-IMP{imp}-{seq}`. |

---

### 5.8 Hóa đơn — `routes/invoices.js`

**Đọc dữ liệu:**

- `BASE_SELECT`: `INVOICE` + tên khách + tên nhân viên qua `CONCAT_WS`.
- Chi tiết: `INVOICE_DETAIL` + `PRODUCT`; `WARRANTY` theo `invoice_id` để map serial đã bán.

**Tạo hóa đơn (`POST /`) — chuỗi SQL trong transaction:**

1. `INSERT INTO INVOICE` → lấy `invoice_id`.
2. Với mỗi dòng chi tiết:
   - **Kiểm tra tồn:** `SELECT COUNT(*) ... FROM PRODUCT_SERIAL WITH (UPDLOCK, HOLDLOCK) WHERE product_id = @product_id AND sell_status = 1`. Nếu `< buy_quantity` → lỗi (khớp thông điệp trigger).
   - `INSERT INTO INVOICE_DETAIL` → trigger export trừ `PRODUCT.stock_quantity` và kiểm serial.
   - Chọn serial: thủ công hoặc `SELECT TOP (@qty) serial_number ... ORDER BY serial_number ASC` (FIFO).
   - `UPDATE PRODUCT_SERIAL SET sell_status = 0 WHERE serial_number = @serial_number`.
   - `INSERT WARRANTY` với `start_date`/`end_date` từ `GETDATE()` và `DATEADD(month, warranty_months, ...)`.
   - `SELECT ISNULL(warranty_months, 12) FROM PRODUCT` — thời hạn BH theo tháng.

**Giải thích FIFO:** `ORDER BY serial_number ASC` giả định thứ tự lexicographic trùng thứ tự ưu tiên bán (phù hợp format cố định trong seed).

---

### 5.9 Bảo hành — `routes/warranties.js`

| Feature | SQL |
|---------|-----|
| Danh sách BH | `WARRANTY` + `LEFT JOIN PRODUCT`. |
| Tìm BH | `WHERE serial_number LIKE '%' + @serial + '%'`. |
| Danh sách claim | `WARRANTY_CLAIM` + `JOIN WARRANTY` + `PRODUCT` + `EMPLOYEE`/`PERSON`. |
| Tạo claim | `INSERT WARRANTY_CLAIM (warranty_id, employee_id, claim_date, description, status)` — `employee_id` từ header. |
| Cập nhật trạng thái claim | `UPDATE WARRANTY_CLAIM SET status = @status WHERE id = @id`. |

---

## 6. Script bảo trì (không phải API)

### 6.1 `backend/db-script.js` (migration)

- `ALTER TABLE PRODUCT ADD warranty_months int DEFAULT 12` — thêm cột nếu chưa có.
- `UPDATE PRODUCT SET warranty_months = 12 WHERE warranty_months IS NULL` — gán mặc định.

### 6.2 `backend/stock-audit.js`

- `SELECT` với `LEFT JOIN PRODUCT_SERIAL`, `SUM(CASE WHEN sell_status = 1 THEN 1 ELSE 0 END)` so với `PRODUCT.stock_quantity`.
- `GROUP BY sell_status` để xem phân bố in-stock / sold.

### 6.3 `backend/backfill-serials.js`

- Đọc `stock_quantity` và đếm serial khả dụng; nếu thiếu thì `INSERT PRODUCT_SERIAL` với prefix `BF-SPxxx-`, `import_id NULL`, `sell_status = 1`.
- Dùng `MAX(TRY_CONVERT(int, RIGHT(serial_number, 4)))` để tăng STT không trùng.

---

## 7. Bảng ánh xạ Feature frontend ↔ API (tham khảo)

| Khu vực UI (file JS) | API chính |
|----------------------|-----------|
| `login.js` | `POST /auth/login` |
| `employees.js` | `GET/POST/PUT /employees`, `PUT .../status`, `PUT .../role` |
| `customers.js` | `GET/POST/PUT /customers`, `GET /search` |
| `products.js` | `GET /products`, `search`, `filter`, `POST`, `PUT`, `batches`, `available-serials` |
| `imports.js` | `GET /imports`, `search`, `GET .../details`, `POST /imports` |
| `invoices.js` | `GET /invoices`, `search`, `GET .../details`, `POST /invoices` |
| `warranties.js` | `GET /warranties`, `search`, `GET /claims`, `POST /claims`, `PUT .../status` |
| `providers.js` | `GET`, `search`, `POST`, `PUT` |

---

## 8. Ghi chú đồng bộ dữ liệu (quan trọng khi đọc SQL)

- **`PRODUCT.stock_quantity`** được trigger cập nhật khi nhập (`IMPORT_DETAIL`) và bán (`INVOICE_DETAIL`).
- **Tồn hiển thị trên API sản phẩm** lại lấy từ **đếm serial** `sell_status = 1` (xem `BASE_SELECT` trong `products.js`).
- Nếu chạy script seed **trước khi** tạo trigger nhập hàng, `PRODUCT.stock_quantity` có thể **lệch** so với thực tế serial — khi đó cần chạy lại thứ tự script hoặc cập nhật lại cột tồn cho khớp (xem thảo luận vận hành trong dự án).

---

*Tài liệu phản ánh trạng thái mã nguồn tại thời điểm tạo. Khi thêm route hoặc trigger mới, nên cập nhật mục tương ứng.*
