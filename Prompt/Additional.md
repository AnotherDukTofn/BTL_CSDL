# Cấu trúc Giao diện Tổng thể
Gồm 1 Sidebar điều hướng với 7 Tab chính:
1. Sản phẩm
2. Khách hàng
3. Hóa đơn
4. Quản lý nhập
5. Nhân sự
6. Quản lý bảo hành
7. Nhà cung cấp (Mới)

# Tab 2: Khách hàng
- **Giao diện Bảng:** Mã KH (format `%03d`), Họ và Tên (gộp 3 cột), Giới tính, SĐT, Địa chỉ.
  - **Lưu ý cột Địa chỉ:** Backend sẽ trả về chuỗi đã được gộp theo format `house_num street district province` (Ví dụ: "Số 10 Đường Trần Phú Quận Hà Đông Hà Nội"), Frontend chỉ việc hiển thị.
- **Tính năng:**
  - Ô tìm kiếm theo Tên hoặc Mã KH.
  - Nút "Thêm Khách hàng": Mở form nhập Tên, Giới tính, Số nhà, Đường, Quận/Huyện, Tỉnh/Thành phố, SĐT.
  - Sửa thông tin (Click vào dòng để mở Modal): Cho phép cập nhật các trường địa chỉ và thông tin cá nhân.

# Tab 7: Nhà cung cấp (Bổ sung)
- **Giao diện Bảng:** Mã NCC (format `%03d`), Tên nhà cung cấp, Số điện thoại, Email.
- **Tính năng:**
  - **Tìm kiếm:** Có ô input tìm kiếm và dropdown chọn trường tìm kiếm (Mã NCC, Tên NCC, Tất cả).
  - **Thêm Nhà cung cấp:** Nút "Thêm NCC" mở Modal form gồm các trường Tên, SĐT, Email. Khi lưu gọi `POST /api/providers`.
  - **Sửa thông tin:** Click vào 1 dòng NCC để mở Modal. Cho phép sửa Tên, SĐT, Email. Khi xác nhận gọi `PUT /api/providers/{id}`.