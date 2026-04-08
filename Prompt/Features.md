# Danh sách chức năng và Truy vấn SQL tương ứng

Tài liệu này liệt kê chi tiết các chức năng đã được triển khai trên website và đoạn mã truy vấn SQL cụ thể được sử dụng trong backend để thực hiện các chức năng đó. Các chức năng không liên quan tới thao tác cơ sở dữ liệu sẽ không được liệt kê tại đây.

## 1. Xác thực và Phân quyền (Authentication)

*   **Đăng nhập hệ thống**: Kiểm tra thông tin đăng nhập và trả về dữ liệu nhân viên (bao gồm các thông tin cá nhân cơ bản và quyền tài khoản).
    *   **SQL**:
        ```sql
        SELECT a.id AS account_id, a.employee_id, a.username, a.role,
               e.employee_code, e.position, e.is_active,
               CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name) AS full_name
        FROM ACCOUNT a
        JOIN EMPLOYEE e ON a.employee_id = e.id
        JOIN PERSON p ON e.id = p.id
        WHERE a.username = @username AND a.password = @password
        ```
*   **Lấy thông tin tài khoản hiện tại (Refresh/Me)**: Lấy lại thông tin user thông qua Employee ID đã xác thực ở Session/JWT.
    *   **SQL**:
        ```sql
        SELECT a.employee_id, a.username, a.role,
               e.employee_code, e.position, e.is_active,
               CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name) AS full_name
        FROM ACCOUNT a
        JOIN EMPLOYEE e ON a.employee_id = e.id
        JOIN PERSON p ON e.id = p.id
        WHERE a.employee_id = @employee_id
        ```

## 2. Quản lý Nhân viên (Employees)

*   **Lấy danh sách nhân viên**: Lấy thông tin cá nhân, địa chỉ, nghề nghiệp, trạng thái, vai trò tài khoản và số điện thoại liên lạc.
    *   **SQL**:
        ```sql
        SELECT e.id, e.employee_code, e.employment_type, e.position, e.is_active,
               CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name) AS full_name,
               p.first_name, p.middle_name, p.last_name, p.gender, p.house_num, p.street, p.district, p.province,
               a.username, a.role AS account_role,
               (SELECT TOP 1 pp.phone_num FROM PERSON_PHONE pp WHERE pp.person_id = e.id) AS phone_num
        FROM EMPLOYEE e
        JOIN PERSON p ON e.id = p.id
        LEFT JOIN ACCOUNT a ON a.employee_id = e.id
        ORDER BY e.id
        ```
*   **Thêm nhân viên mới**: Tạo hồ sơ nhân viên qua quy trình Transaction (Thêm người -> Thêm nhân sự -> Số điện thoại -> Tài khoản).
    *   **SQL (`PERSON`)**:
        ```sql
        INSERT INTO PERSON (first_name, middle_name, last_name, gender, house_num, street, district, province)
        VALUES (@first_name, @middle_name, @last_name, @gender, @house_num, @street, @district, @province);
        SELECT SCOPE_IDENTITY() AS id;
        ```
    *   **SQL (`EMPLOYEE`)**:
        ```sql
        INSERT INTO EMPLOYEE (id, employee_code, position, employment_type, is_active)
        VALUES (@id, @employee_code, @position, @employment_type, 1)
        ```
    *   **SQL (`PERSON_PHONE`)**:
        ```sql
        INSERT INTO PERSON_PHONE (person_id, phone_num) VALUES (@person_id, @phone_num)
        ```
    *   **SQL (`ACCOUNT`)**:
        ```sql
        INSERT INTO ACCOUNT (employee_id, username, password, role)
        VALUES (@employee_id, @username, @password, 'employee')
        ```
*   **Cập nhật thông tin nhân viên**: Thay đổi vị trí, loại hợp đồng, số điện thoại và địa chỉ nhà.
    *   **SQL (`EMPLOYEE`)**:
        ```sql
        UPDATE EMPLOYEE SET position = @position, employment_type = @employment_type WHERE id = @id
        ```
    *   **SQL (`PERSON`)**:
        ```sql
        UPDATE PERSON SET house_num = @house_num, street = @street, district = @district, province = @province WHERE id = @id
        ```
    *   **SQL (`PERSON_PHONE`)**:
        ```sql
        DELETE FROM PERSON_PHONE WHERE person_id = @person_id;
        INSERT INTO PERSON_PHONE (person_id, phone_num) VALUES (@person_id, @phone_num)
        ```
*   **Thay đổi trạng thái tài khoản (Khóa/Mở Khóa)**: Bật tắt trạng thái cấm sử dụng (is_active) trên hệ thống.
    *   **SQL**:
        ```sql
        UPDATE EMPLOYEE SET is_active = @is_active WHERE id = @id
        ```
*   **Cấp quyền hoặc thay đổi phân quyền**: Chuyển đổi giữa role `admin`/`manager` và `employee`.
    *   **SQL**:
        ```sql
        UPDATE ACCOUNT SET role = @role WHERE employee_id = @employee_id
        ```

## 3. Quản lý Khách hàng (Customers)

*   **Lấy danh sách khách hàng**: Truy xuất đầy đủ thông tin cá nhân và thông tin liên lạc khách hàng.
    *   **SQL**:
        ```sql
        SELECT c.id, c.customer_code,
               CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name) AS full_name,
               p.first_name, p.middle_name, p.last_name, p.gender, p.province, p.district, p.street, p.house_num,
               CONCAT_WS(' ', p.house_num, p.street, p.district, p.province) AS address, pp.phone_num
        FROM CUSTOMER c
        JOIN PERSON p ON c.id = p.id
        LEFT JOIN PERSON_PHONE pp ON p.id = pp.person_id
        ORDER BY c.id
        ```
*   **Tìm kiếm khách hàng**: Khớp dữ liệu với từ khóa theo ID, mã khách hoặc tên.
    *   **SQL**:
        Tương tự lệnh select lấy danh sách kèm điều kiện:
        ```sql
        WHERE c.id = @keywordInt 
           OR c.customer_code LIKE '%' + @keyword + '%'
           OR p.first_name LIKE '%' + @keyword + '%'
           OR p.last_name LIKE '%' + @keyword + '%'
        ```
*   **Thêm khách hàng mới**: Sử dụng Transaction để đảm bảo tính nhất quán (Thêm người -> Thêm danh tính khách hàng -> Thêm SĐT).
    *   **SQL (`PERSON`)**:
        ```sql
        INSERT INTO PERSON (first_name, middle_name, last_name, gender, province, district, street, house_num)
        VALUES (@first_name, @middle_name, @last_name, @gender, @province, @district, @street, @house_num);
        SELECT SCOPE_IDENTITY() AS id;
        ```
    *   **SQL (`CUSTOMER`)**:
        ```sql
        INSERT INTO CUSTOMER (id, customer_code) VALUES (@id, @customer_code)
        ```
    *   **SQL (`PERSON_PHONE`)**:
        ```sql
        INSERT INTO PERSON_PHONE (person_id, phone_num) VALUES (@person_id, @phone_num)
        ```
*   **Cập nhật thông tin khách hàng**: Thay đổi thông tin cá nhân khách.
    *   **SQL (`PERSON`)**:
        ```sql
        UPDATE PERSON SET first_name = @first_name, middle_name = @middle_name, 
               last_name = @last_name, gender = @gender, province = @province,
               district = @district, street = @street, house_num = @house_num
        WHERE id = @id
        ```
    *   **SQL (`PERSON_PHONE`)**: Xóa dữ liệu cũ và cập nhật cái mới y hệt phần Nhân viên.

## 4. Quản lý Sản phẩm (Products)

*   **Lấy danh sách và sắp xếp sản phẩm**: Truy xuất thông tin sản phẩm có kèm tham chiếu category và manufacturer, được sắp xếp mặc định theo mã sản phẩm tăng dần.
    *   **SQL**:
        ```sql
        SELECT p.id, p.name, p.category_id, p.manufacturer_id,
               c.name AS category_name, m.name AS manufacturer_name,
               p.in_unit_price, p.out_unit_price, p.stock_quantity
        FROM PRODUCT p
        LEFT JOIN CATEGORY c ON p.category_id = c.id
        LEFT JOIN MANUFACTURER m ON p.manufacturer_id = m.id
        ORDER BY p.id -- Sắp xếp tăng dần theo ID
        ```
*   **Tìm kiếm sản phẩm (Search)**: Tìm kiếm dựa trên từ khóa theo ID hoặc Tên sản phẩm.
    *   **SQL**:
        ```sql
        SELECT p.id, p.name, p.category_id, p.manufacturer_id,
               c.name AS category_name, m.name AS manufacturer_name,
               p.in_unit_price, p.out_unit_price, p.stock_quantity
        FROM PRODUCT p
        LEFT JOIN CATEGORY c ON p.category_id = c.id
        LEFT JOIN MANUFACTURER m ON p.manufacturer_id = m.id
        WHERE p.id = @keywordInt OR p.name LIKE '%' + @keywordStr + '%'
        ORDER BY p.id
        ```
*   **Lọc sản phẩm (Filter)**: Lọc danh sách trả về qua bộ lọc Danh mục (`categoryId`) và Nhà sản xuất (`manufacturerId`).
    *   **SQL**:
        ```sql
        SELECT p.id, p.name, p.category_id, p.manufacturer_id,
               c.name AS category_name, m.name AS manufacturer_name,
               p.in_unit_price, p.out_unit_price, p.stock_quantity
        FROM PRODUCT p
        LEFT JOIN CATEGORY c ON p.category_id = c.id
        LEFT JOIN MANUFACTURER m ON p.manufacturer_id = m.id
        WHERE p.category_id = @categoryId AND p.manufacturer_id = @manufacturerId
        ORDER BY p.id
        ```
*   **Thêm sản phẩm mới**:
    *   **SQL**:
        ```sql
        INSERT INTO PRODUCT (name, category_id, manufacturer_id, in_unit_price, out_unit_price, stock_quantity)
        VALUES (@name, @category_id, @manufacturer_id, @in_unit_price, @out_unit_price, @stock_quantity)
        ```
*   **Cập nhật sản phẩm**: (Dựa theo phân quyền hệ thống)
    *   **SQL** (Có quyền admin thì cập nhật toàn diện cả phần Giá Bán):
        ```sql
        UPDATE PRODUCT 
        SET name = @name, category_id = @category_id, manufacturer_id = @manufacturer_id, out_unit_price = @out_unit_price
        WHERE id = @id
        ```

## 5. Quản lý Danh mục phân loại (Categories)

*   **Lấy danh sách và sắp xếp Danh mục**:
    *   **SQL**: 
        ```sql
        SELECT id, name FROM CATEGORY 
        ORDER BY id -- Sắp xếp theo ID
        ```
*   **Thêm Danh mục mới**:
    *   **SQL**: 
        ```sql
        INSERT INTO CATEGORY (name) VALUES (@name)
        ```

## 6. Quản lý Nhà sản xuất (Manufacturers)

*   **Lấy danh sách và sắp xếp Nhà sản xuất**:
    *   **SQL**: 
        ```sql
        SELECT id, name FROM MANUFACTURER 
        ORDER BY id -- Sắp xếp theo ID
        ```
*   **Thêm Nhà sản xuất mới**:
    *   **SQL**: 
        ```sql
        INSERT INTO MANUFACTURER (name) VALUES (@name)
        ```

## 7. Quản lý Nhà cung cấp (Providers)

*   **Danh sách Nhà cung cấp (Lấy và Sắp xếp)**:
    *   **SQL**:
        ```sql
        SELECT id, name, email, phone FROM PROVIDER ORDER BY id
        ```
*   **Tìm kiếm Nhà cung cấp**:
    *   **SQL**: Lấy thông tin dựa trên Từ khóa hoặc ID:
        ```sql
        SELECT id, name, email, phone FROM PROVIDER 
        WHERE id = @keywordInt OR name LIKE '%' + @keyword + '%'
        ORDER BY id
        ```
*   **Thêm Nhà cung cấp mới**:
    *   **SQL**:
        ```sql
        INSERT INTO PROVIDER (name, email, phone) VALUES (@name, @email, @phone)
        ```
*   **Cập nhật thông tin Nhà cung cấp**:
    *   **SQL**:
        ```sql
        UPDATE PROVIDER SET name = @name, email = @email, phone = @phone WHERE id = @id
        ```

## 8. Lập Hóa đơn Bán hàng (Invoices)

*   **Danh sách các hóa đơn đã xuất (Kèm sắp xếp)**:
    *   **SQL**:
        ```sql
        SELECT i.id, i.customer_id, i.employee_id, i.create_time,
               CONCAT_WS(' ', pc.first_name, pc.middle_name, pc.last_name) AS customer_name,
               CONCAT_WS(' ', pe.first_name, pe.middle_name, pe.last_name) AS employee_name
        FROM INVOICE i
        LEFT JOIN CUSTOMER c ON i.customer_id = c.id
        LEFT JOIN PERSON pc ON c.id = pc.id
        LEFT JOIN EMPLOYEE e ON i.employee_id = e.id
        LEFT JOIN PERSON pe ON e.id = pe.id
        ORDER BY i.id DESC -- Sắp xếp thời gian giảm dần
        ```
*   **Tra cứu chi tiết hóa đơn (Invoice Detail)**:
    *   **SQL**:
        ```sql
        SELECT id.invoice_id, id.product_id, id.buy_quantity, id.unit_price, p.name AS product_name
        FROM INVOICE_DETAIL id
        JOIN PRODUCT p ON id.product_id = p.id
        WHERE id.invoice_id = @id
        ```
*   **Lập hóa đơn mới (Khởi tạo Transaction)**: Khởi tạo hóa đơn mẹ và các mục chi tiết mua.
    *   **SQL (`INVOICE`)**:
        ```sql
        INSERT INTO INVOICE (customer_id, employee_id) VALUES (@customer_id, @employee_id);
        SELECT SCOPE_IDENTITY() AS id;
        ```
    *   **SQL (`INVOICE_DETAIL`)**: (Lặp truy vấn với danh sách chi tiết hàng)
        ```sql
        INSERT INTO INVOICE_DETAIL (invoice_id, product_id, buy_quantity, unit_price)
        VALUES (@invoice_id, @product_id, @buy_quantity, @unit_price)
        ```
    *(Ghi chú: Thao tác sinh mã bảo hành `WARRANTY` cũng như thay đổi kho `PRODUCT.stock_quantity` được xử lý tự động trong Trigger của CSDL).*

## 9. Nhập kho - Quản lý Phiếu nhập (Imports)

*   **Danh sách phiếu nhập kho (Kèm sắp xếp)**:
    *   **SQL**:
        ```sql
        SELECT i.id, i.employee_id, i.provider_id, i.create_time,
               CONCAT_WS(' ', pe.first_name, pe.middle_name, pe.last_name) AS employee_name,
               pr.name AS provider_name
        FROM IMPORT i
        LEFT JOIN EMPLOYEE e ON i.employee_id = e.id
        LEFT JOIN PERSON pe ON e.id = pe.id
        LEFT JOIN PROVIDER pr ON i.provider_id = pr.id
        ORDER BY i.id DESC -- Sắp xếp thời gian giảm dần
        ```
*   **Tra cứu chi tiết phiếu nhập (Import Detail)**:
    *   **SQL**:
        ```sql
        SELECT id.import_id, id.product_id, id.import_quantity, id.unit_price, p.name AS product_name
        FROM IMPORT_DETAIL id
        JOIN PRODUCT p ON id.product_id = p.id
        WHERE id.import_id = @id
        ```
*   **Tạo phiếu nhập mới (Transaction)**: Nhập hàng vào kho.
    *   **SQL (`IMPORT`)**:
        ```sql
        INSERT INTO IMPORT (employee_id, provider_id) VALUES (@employee_id, @provider_id);
        SELECT SCOPE_IDENTITY() AS id;
        ```
    *   **SQL (`IMPORT_DETAIL`)**:
        ```sql
        INSERT INTO IMPORT_DETAIL (import_id, product_id, import_quantity, unit_price)
        VALUES (@import_id, @product_id, @import_quantity, @unit_price)
        ```

## 10. Quản lý Bảo hành (Warranties & Warranty Claims)

*   **Danh sách toàn bộ Serial được bảo hành (Kèm sắp xếp)**:
    *   **SQL**:
        ```sql
        SELECT w.id, w.invoice_id, w.product_id, w.serial_number, w.start_date, w.end_date,
               p.name AS product_name
        FROM WARRANTY w
        LEFT JOIN PRODUCT p ON w.product_id = p.id
        ORDER BY w.id DESC
        ```
*   **Tìm kiếm Serial bảo hành**: Sử dụng thao tác Lọc chuỗi string.
    *   **SQL**:
        ```sql
        SELECT ... FROM WARRANTY w LEFT JOIN PRODUCT p ON w.product_id = p.id
        WHERE w.serial_number LIKE @serial
        ORDER BY w.id DESC
        ```

*   **Quản lý các Yêu cầu Bảo Hành (Warranty Claims)**: Liệt kê các lần mang thiết bị tới bảo hành báo lỗi.
    *   **SQL**:
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
*   **Tạo yêu cầu bảo hành/sửa chữa thiết bị lỗi**:
    *   **SQL**:
        ```sql
        INSERT INTO WARRANTY_CLAIM (warranty_id, employee_id, claim_date, description, status)
        VALUES (@warranty_id, @employee_id, @claim_date, @description, @status)
        ```
*   **Cập nhật tiến độ của yêu cầu bảo hành** (Pending/In Progress/Resolved/Rejected):
    *   **SQL**:
        ```sql
        UPDATE WARRANTY_CLAIM SET status = @status WHERE id = @id
        ```
