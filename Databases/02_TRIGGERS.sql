USE SqlPtit;
GO

-- Trigger 1: Cộng tồn kho sau khi nhập hàng
CREATE TRIGGER trg_UpdateStockAfterImport
ON IMPORT_DETAIL
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE p
    SET p.stock_quantity = p.stock_quantity + i.import_quantity
    FROM PRODUCT p
    INNER JOIN inserted i ON p.id = i.product_id;
END;
GO

-- Trigger 2: Trừ tồn kho sau khi bán (kiểm tra dựa trên PRODUCT_SERIAL thực tế)
CREATE OR ALTER TRIGGER trg_UpdateStockAfterExport
ON INVOICE_DETAIL
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    -- Kiểm tra tồn kho dựa trên số serial thực tế còn trong kho (sell_status = 1)
    IF EXISTS (
        SELECT 1
        FROM (
            SELECT product_id, SUM(buy_quantity) AS total_qty
            FROM inserted
            GROUP BY product_id
        ) agg
        LEFT JOIN (
            SELECT product_id, COUNT(*) AS available_qty
            FROM PRODUCT_SERIAL
            WHERE sell_status = 1
            GROUP BY product_id
        ) ps ON agg.product_id = ps.product_id
        WHERE ISNULL(ps.available_qty, 0) < agg.total_qty
    )
    BEGIN
        RAISERROR (N'Lỗi: Số lượng tồn kho không đủ để bán!', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END

    -- Cập nhật stock_quantity trên bảng PRODUCT để đồng bộ
    UPDATE p
    SET p.stock_quantity = p.stock_quantity - agg.total_qty
    FROM PRODUCT p
    JOIN (
        SELECT product_id, SUM(buy_quantity) AS total_qty
        FROM inserted
        GROUP BY product_id
    ) agg ON p.id = agg.product_id;
END;
GO

-- Trigger 3: Đổi trạng thái Serial thành Sold (sell_status = 0)
CREATE TRIGGER trg_UpdateSerialStatus
ON WARRANTY
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE ps
    SET ps.sell_status = 0
    FROM PRODUCT_SERIAL ps
    INNER JOIN inserted i ON ps.serial_number = i.serial_number;
END;
GO

SELECT p.id, p.name, p.stock_quantity,
       SUM(CASE WHEN ps.sell_status = 1 THEN 1 ELSE 0 END) AS available_serials,
       COUNT(ps.serial_number) AS total_serials
FROM PRODUCT p
LEFT JOIN PRODUCT_SERIAL ps ON ps.product_id = p.id
GROUP BY p.id, p.name, p.stock_quantity
ORDER BY p.id;