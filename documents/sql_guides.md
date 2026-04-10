# Hướng dẫn đọc và hiểu các truy vấn SQL trong dự án BTL_CSDL (dành cho người mới)

Tài liệu này giúp bạn **chưa học hết cú pháp SQL** vẫn có thể:

1. Hiểu **từng phần** trong một câu lệnh (SELECT, JOIN, WHERE, …).
2. Hình dung **thứ tự / logic chạy** (máy chủ CSDL xử lý ra sao).
3. Liên hệ với **các truy vấn thật** trong repo (backend + trigger + script).

**Ngôn ngữ:** T-SQL trên **Microsoft SQL Server** (cú pháp gần giống chuẩn SQL, có thêm một số hàm riêng).

---

## Phần 1 — Khái niệm nền

### 1.1 CSDL và bảng

- Dữ liệu nằm trong **bảng** (table), ví dụ `PRODUCT`, `CUSTOMER`.
- Mỗi bảng có **cột** (column): `id`, `name`, …
- Mỗi dòng là một **bản ghi** (row).

### 1.2 Khóa và quan hệ

- **Khóa chính (PRIMARY KEY):** thường là `id`, duy nhất cho mỗi dòng.
- **Khóa ngoại (FOREIGN KEY):** cột này trỏ tới `id` bảng khác, ví dụ `INVOICE.customer_id` → `CUSTOMER.id`.

Khi đọc truy vấn, hãy tự hỏi: *“Đang lấy dữ liệu từ bảng nào, nối với bảng nào, theo điều kiện gì?”*

### 1.3 Tham số `@tên` (parameter)

Trong code Node (`mssql`), `.input('username', sql.NVarChar, username)` tạo tham số `@username`. Trong SQL bạn thấy:

```sql
WHERE a.username = @username AND a.password = @password
```

**Ý nghĩa:** Giá trị thật do chương trình gửi vào; tránh ghép chuỗi tay (an toàn hơn, tránh SQL injection).

---

## Phần 2 — Câu SELECT: đọc từ trên xuống, nhưng máy “gom” theo thứ tự khác

### 2.1 Các mảnh thường gặp

| Mảnh | Vai trò (nói ngắn gọn) |
|------|-------------------------|
| `SELECT` | Chọn cột hoặc biểu thức (kể cả hàm) sẽ xuất hiện ở kết quả. |
| `FROM` | Bảng nguồn. |
| `JOIN` | Nối thêm bảng theo điều kiện khớp. |
| `WHERE` | Lọc **từng dòng** trước khi gom nhóm (nếu có `GROUP BY`). |
| `GROUP BY` | Gom các dòng thành nhóm (thường để `COUNT`, `SUM`). |
| `HAVING` | Lọc **nhóm** (ít gặp ở dự án này). |
| `ORDER BY` | Sắp xếp kết quả cuối. |

**Thứ tự *logic* mà người mới nên tưởng tượng khi đọc SELECT:**

1. `FROM` + `JOIN` → tạo “bảng tạm” lớn (tất cả cột đã nối).
2. `WHERE` → chỉ giữ dòng thỏa điều kiện.
3. `GROUP BY` (nếu có) → gom nhóm.
4. `HAVING` (nếu có) → lọc nhóm.
5. `SELECT` → tính các cột/hàm (ví dụ `COUNT(*)`).
6. `ORDER BY` → sắp xếp kết quả.

*(Trình tối ưu SQL Server có thể làm khác một chút về mặt kỹ thuật, nhưng cách nghĩ trên đủ để đọc đúng ý nghĩa.)*

### 2.2 JOIN là gì?

- **`INNER JOIN`:** Chỉ giữ dòng **khớp được ở cả hai bên** (theo điều kiện `ON`).
- **`LEFT JOIN`:** Giữ **hết** dòng bên trái; nếu bên phải không có khớp, các cột bên phải là `NULL`.

**Ví dụ trong dự án — lấy tên khách từ `PERSON`:**

```sql
FROM INVOICE i
LEFT JOIN CUSTOMER c ON i.customer_id = c.id
LEFT JOIN PERSON pc ON c.id = pc.id
```

**Logic:** Mỗi hóa đơn có `customer_id` → tìm khách → khách trùng `id` với `PERSON` → lấy họ tên. `LEFT` vì về lý thuyết vẫn muốn hiện hóa đơn dù thiếu dữ liệu (thực tế thường vẫn có khách).

### 2.3 `CONCAT_WS` — nối chuỗi có dấu cách

```sql
CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name) AS full_name
```

- `CONCAT_WS` = *concatenate with separator*.
- Tham số đầu là **ký tự phân cách** (ở đây là khoảng trắng).
- Các giá trị `NULL` thường bị bỏ qua (không làm hỏng chuỗi).

### 2.4 `LIKE` và tìm “chứa chuỗi”

```sql
p.first_name LIKE '%' + @keyword + '%'
```

- `%` = “bất kỳ ký tự nào, dài bao nhiêu cũng được”.
- `+` trong T-SQL là **nối chuỗi** (với kiểu chuỗi phù hợp).
- Kết quả: tìm `first_name` **có chứa** `@keyword`.

### 2.5 Subquery trong SELECT (truy vấn con trả về một giá trị)

Trong `products.js`, “tồn kho” hiển thị là **đếm serial còn hàng**:

```sql
ISNULL((
  SELECT COUNT(*) FROM PRODUCT_SERIAL ps
  WHERE ps.product_id = p.id AND ps.sell_status = 1
), 0) AS stock_quantity
```

**Logic chạy:**

- Với **mỗi dòng** `p` của bảng `PRODUCT`, máy chạy một vòng `SELECT COUNT(*)` trong `PRODUCT_SERIAL` có cùng `product_id` và `sell_status = 1`.
- `ISNULL(..., 0)`: nếu không có dòng nào (hoặc biểu thức là `NULL`), đổi thành `0`.

**Tên cột `stock_quantity` ở đây là alias** — trùng tên với cột trong bảng nhưng ý nghĩa ở API là “số serial còn”, không nhất thiết bằng cột `PRODUCT.stock_quantity`.

### 2.6 `TOP (@qty)` và `ORDER BY`

```sql
SELECT TOP (@qty) serial_number
FROM PRODUCT_SERIAL
WHERE product_id = @product_id AND sell_status = 1
ORDER BY serial_number ASC
```

- `ORDER BY serial_number ASC`: sắp theo serial tăng dần (FIFO theo **thứ tự chuỗi** trong code hiện tại).
- `TOP (@qty)`: chỉ lấy `@qty` dòng đầu sau khi đã sắp.

---

## Phần 3 — INSERT, UPDATE, DELETE

### 3.1 INSERT

```sql
INSERT INTO PERSON (first_name, last_name, ...)
VALUES (@first_name, @last_name, ...);
SELECT SCOPE_IDENTITY() AS id;
```

- `INSERT` thêm **một dòng** (hoặc nhiều dòng nếu có nhiều bộ `VALUES`).
- `SCOPE_IDENTITY()`: trả về giá trị `IDENTITY` vừa sinh trong **cùng phiên** (thường dùng để lấy `id` của `PERSON` mới).

### 3.2 UPDATE

```sql
UPDATE EMPLOYEE SET position = @position WHERE id = @id
```

**Logic:** Tìm các dòng thỏa `WHERE`, gán lại các cột liệt kê sau `SET`.

### 3.3 DELETE

```sql
DELETE FROM PERSON_PHONE WHERE person_id = @person_id
```

**Logic:** Xóa dòng khớp điều kiện (ở đây thường xóa hết SĐT cũ trước khi chèn SĐT mới).

---

## Phần 4 — Giao dịch (Transaction) — ý tưởng

Khi tạo nhân viên / khách / hóa đơn / phiếu nhập, code dùng **transaction**: hoặc **tất cả các bước INSERT/UPDATE thành công**, hoặc **hoàn tác (rollback)** nếu một bước lỗi.

Bạn không thấy từ khóa `BEGIN TRANSACTION` trong chuỗi SQL tĩnh, nhưng trong `invoices.js` có `new sql.Transaction(pool)` — tương đương “bọc” nhiều câu lệnh trong một giao dịch.

---

## Phần 5 — Trigger và bảng `inserted`

**Trigger** là đoạn T-SQL **tự chạy** khi có sự kiện (ví dụ `AFTER INSERT`).

### 5.1 Trigger nhập hàng (`IMPORT_DETAIL`)

Sau khi có dòng mới trong `IMPORT_DETAIL`, trigger cộng tồn:

```sql
UPDATE p
SET p.stock_quantity = p.stock_quantity + i.import_quantity
FROM PRODUCT p
INNER JOIN inserted i ON p.id = i.product_id;
```

- `inserted`: bảng ảo chứa **dòng vừa được chèn** vào `IMPORT_DETAIL`.
- `INNER JOIN ... ON p.id = i.product_id`: với mỗi dòng nhập, cộng đúng `product_id` tương ứng.

### 5.2 Trigger bán hàng (`INVOICE_DETAIL`)

Ý tưởng:

1. Gom `inserted` theo `product_id`, cộng `SUM(buy_quantity)`.
2. So với số serial còn hàng (`sell_status = 1`) trong `PRODUCT_SERIAL`.
3. Nếu thiếu → `RAISERROR` + `ROLLBACK`.
4. Nếu đủ → trừ `PRODUCT.stock_quantity`.

**Vì sao có `LEFT JOIN` trong đoạn kiểm tra?**

- Nếu một `product_id` **chưa có dòng** trong nhóm đếm serial, `available_qty` sẽ là `NULL` → `ISNULL(..., 0)` coi như 0 serial → dễ phát hiện “không đủ bán”.

### 5.3 Trigger bảo hành (`WARRANTY`)

Khi chèn `WARRANTY`, trigger đặt `PRODUCT_SERIAL.sell_status = 0` cho đúng `serial_number` trong `inserted` — đồng bộ “đã bán” với bảng serial.

---

## Phần 6 — Gợi ý cách đọc từng truy vấn trong dự án (checklist)

Khi mở một đoạn SQL trong `backend/routes/*.js` hoặc file `.sql`, làm lần lượt:

1. **Đích:** Câu lệnh trả về danh sách, một số, hay chỉnh sửa dữ liệu?
2. **Bảng chính:** Sau `FROM` là gì?
3. **Nối bảng:** `JOIN` theo cột nào? `INNER` hay `LEFT`?
4. **Lọc:** `WHERE` loại dòng nào?
5. **Gom nhóm:** Có `GROUP BY` không? Nếu có, mọi cột trong `SELECT` (không nằm trong hàm tổng hợp) phải nằm trong `GROUP BY` hoặc là hằng số — đây là chỗ dễ lỗi khi tự viết.
6. **Sắp xếp:** `ORDER BY` theo cột nào, tăng hay giảm?

---

## Phần 7 — Bản đồ nhanh: file nào chứa SQL gì

| Nơi | Nội dung chính |
|-----|----------------|
| `backend/routes/auth.js` | Đăng nhập, `/me` — `JOIN` `ACCOUNT`, `EMPLOYEE`, `PERSON`. |
| `backend/routes/employees.js` | Danh sách NV, `INSERT`/`UPDATE` nhiều bảng, `UPDATE` trạng thái/quyền. |
| `backend/routes/customers.js` | Khách hàng — cùng mẫu `PERSON` + `CUSTOMER` + `PERSON_PHONE`. |
| `backend/routes/products.js` | Sản phẩm — subquery đếm serial; `batches`, `available-serials`. |
| `backend/routes/categories.js`, `manufacturers.js` | `SELECT` đơn giản + `INSERT`. |
| `backend/routes/providers.js` | NCC — tìm kiếm + `UPDATE`. |
| `backend/routes/invoices.js` | Hóa đơn — `INSERT` + kiểm tra tồn + `TOP` serial + `WARRANTY`. |
| `backend/routes/imports.js` | Phiếu nhập — `INSERT` + sinh `PRODUCT_SERIAL`. |
| `backend/routes/warranties.js` | Bảo hành, claim — `JOIN` nhiều bảng, `LIKE` tìm serial. |
| `Databases/03_TRIGGERS.sql` | Trigger nhập/bán/bảo hành. |
| `backend/stock-audit.js`, `backfill-serials.js` | Script kiểm tra / bổ sung serial (đọc thêm khi cần). |

Chi tiết từng câu (copy-paste SQL) có thể xem thêm: [`prompt/Features-codebase.md`](Features-codebase.md) và [`prompt/documentation.md`](documentation.md).

---

## Phần 8 — Một ví dụ “đọc từng bước” (đoạn thật trong dự án)

**Câu:** Lấy danh sách hóa đơn kèm tên khách và tên nhân viên.

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

**Bước đọc:**

1. Bắt đầu từ `INVOICE i`: mỗi dòng là một hóa đơn.
2. `LEFT JOIN CUSTOMER c`: gắn mã khách `i.customer_id` với `c.id`.
3. `LEFT JOIN PERSON pc`: khách hàng cũng là người — `c.id` = `pc.id` để lấy họ tên vào `customer_name`.
4. Tương tự nhánh nhân viên: `EMPLOYEE e` rồi `PERSON pe` → `employee_name`.
5. `ORDER BY i.id DESC`: hóa đơn **mã số lớn hơn** (thường là mới hơn nếu insert tuần tự) lên trước.

---

*Tài liệu này cố ý đi từ khái niệm → logic → ví dụ trong repo. Khi bạn học thêm từng mệnh đề SQL (JOIN, GROUP BY, subquery), có thể quay lại đối chiếu với các file trong bảng Phần 7.*
