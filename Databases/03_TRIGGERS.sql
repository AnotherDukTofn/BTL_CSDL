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

-- Trigger 2: Trừ tồn kho sau khi bán (an toàn với multi-row INSERT)
CREATE TRIGGER trg_UpdateStockAfterExport
ON INVOICE_DETAIL
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    -- Tổng hợp số lượng theo từng SP (xử lý đúng khi INSERT nhiều dòng cùng lúc)
    IF EXISTS (
        SELECT 1
        FROM PRODUCT p
        JOIN (
            SELECT product_id, SUM(buy_quantity) AS total_qty
            FROM inserted
            GROUP BY product_id
        ) agg ON p.id = agg.product_id
        WHERE p.stock_quantity < agg.total_qty
    )
    BEGIN
        RAISERROR (N'Lỗi: Số lượng tồn kho không đủ để bán!', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END

    -- Trừ kho theo tổng số lượng mỗi SP
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