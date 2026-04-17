// ========================================
// Invoice Routes — Auto Serial FIFO + Auto Warranty
// ========================================
const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');

const BASE_SELECT = `
  SELECT i.id, i.customer_id, i.employee_id, i.create_time,
         CONCAT_WS(' ', pc.first_name, pc.middle_name, pc.last_name) AS customer_name,
         CONCAT_WS(' ', pe.first_name, pe.middle_name, pe.last_name) AS employee_name
  FROM INVOICE i
  LEFT JOIN CUSTOMER c ON i.customer_id = c.id
  LEFT JOIN PERSON pc ON c.id = pc.id
  LEFT JOIN EMPLOYEE e ON i.employee_id = e.id
  LEFT JOIN PERSON pe ON e.id = pe.id
`;

// GET /api/invoices
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`${BASE_SELECT} ORDER BY i.id DESC`);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('GET /invoices error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

// GET /api/invoices/search
router.get('/search', async (req, res) => {
  try {
    const { keyword } = req.query;
    const pool = await getPool();
    const keywordInt = parseInt(keyword) || 0;

    const result = await pool.request()
      .input('keywordInt', sql.Int, keywordInt)
      .input('keyword', sql.NVarChar, keyword)
      .query(`
        ${BASE_SELECT}
        WHERE i.id = @keywordInt
           OR pc.first_name LIKE '%' + @keyword + '%'
           OR pc.last_name LIKE '%' + @keyword + '%'
           OR pe.first_name LIKE '%' + @keyword + '%'
           OR pe.last_name LIKE '%' + @keyword + '%'
        ORDER BY i.id DESC
      `);

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('GET /invoices/search error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

// GET /api/invoices/:id/details — bao gồm serial numbers đã bán
router.get('/:id/details', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(`
        SELECT d.invoice_id, d.product_id, d.buy_quantity, d.unit_price,
               p.name AS product_name
        FROM INVOICE_DETAIL d
        JOIN PRODUCT p ON d.product_id = p.id
        WHERE d.invoice_id = @id
      `);

    // Lấy serial đã bán trong hóa đơn này (từ WARRANTY)
    const serialResult = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(`
        SELECT w.serial_number, w.product_id
        FROM WARRANTY w
        WHERE w.invoice_id = @id
      `);

    const serialMap = {};
    for (const s of serialResult.recordset) {
      if (!serialMap[s.product_id]) serialMap[s.product_id] = [];
      serialMap[s.product_id].push(s.serial_number);
    }

    const data = result.recordset.map(d => ({
      ...d,
      serials: serialMap[d.product_id] || []
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /invoices/:id/details error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

// POST /api/invoices - Tạo hóa đơn: nhận SP+SL, tự gán Serial FIFO + auto WARRANTY
// Body: { customer_id, employee_id, details: [{ product_id, buy_quantity, unit_price }] }
router.post('/', async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const { customer_id, employee_id, details } = req.body;

    if (!customer_id || !employee_id || !details || !details.length) {
      return res.json({ success: false, message: 'Thiếu thông tin hóa đơn!' });
    }

    await transaction.begin();

    // 1. Insert INVOICE
    const invResult = await new sql.Request(transaction)
      .input('customer_id', sql.Int, customer_id)
      .input('employee_id', sql.Int, employee_id)
      .query(`
        INSERT INTO INVOICE (customer_id, employee_id) VALUES (@customer_id, @employee_id);
        SELECT SCOPE_IDENTITY() AS id;
      `);

    const invoiceId = invResult.recordset[0].id;

    // 2. Insert INVOICE_DETAIL (trigger sẽ tự trừ kho)
    for (const item of details) {
      // Fail-fast: kiểm tra số serial còn trong kho trước khi insert INVOICE_DETAIL
      // (Trigger cũng kiểm tra, nhưng làm sớm để trả lỗi rõ ràng và tránh side-effects)
      const availResult = await new sql.Request(transaction)
        .input('product_id', sql.Int, item.product_id)
        .query(`
          SELECT COUNT(*) AS available_qty
          FROM PRODUCT_SERIAL WITH (UPDLOCK, HOLDLOCK)
          WHERE product_id = @product_id AND sell_status = 1
        `);
      const availableQty = availResult.recordset?.[0]?.available_qty ?? 0;
      if (availableQty < item.buy_quantity) {
        throw new Error('Lỗi: Số lượng tồn kho không đủ để bán!');
      }

      await new sql.Request(transaction)
        .input('invoice_id', sql.Int, invoiceId)
        .input('product_id', sql.Int, item.product_id)
        .input('buy_quantity', sql.Int, item.buy_quantity)
        .input('unit_price', sql.Decimal(18, 2), item.unit_price)
        .query(`
          INSERT INTO INVOICE_DETAIL (invoice_id, product_id, buy_quantity, unit_price)
          VALUES (@invoice_id, @product_id, @buy_quantity, @unit_price)
        `);

      // 3. Serial assignment: manual selection or FIFO fallback
      let assignedSerials = [];

      if (item.serials && item.serials.length > 0) {
        // ——— Thu ngân đã chọn serial cụ thể ———
        // Validate: kiểm tra serial có thuộc product này và còn trong kho không
        for (const sn of item.serials) {
          const check = await new sql.Request(transaction)
            .input('serial_number', sql.NVarChar, sn)
            .input('product_id', sql.Int, item.product_id)
            .query(`
              SELECT serial_number FROM PRODUCT_SERIAL
              WHERE serial_number = @serial_number AND product_id = @product_id AND sell_status = 1
            `);
          if (!check.recordset.length) {
            throw new Error(`Serial "${sn}" không hợp lệ hoặc đã bán!`);
          }
          assignedSerials.push({ serial_number: sn });
        }

        // Nếu chọn tay ít hơn buy_quantity, vét thêm bằng FIFO
        const remaining = item.buy_quantity - assignedSerials.length;
        if (remaining > 0) {
          const chosenList = item.serials.map(s => `'${s.replace(/'/g, "''")}'`).join(',');
          const fifoResult = await new sql.Request(transaction)
            .input('product_id', sql.Int, item.product_id)
            .input('qty', sql.Int, remaining)
            .query(`
              SELECT TOP (@qty) serial_number
              FROM PRODUCT_SERIAL
              WHERE product_id = @product_id AND sell_status = 1
                AND serial_number NOT IN (${chosenList})
              ORDER BY serial_number ASC
            `);
          assignedSerials = assignedSerials.concat(fifoResult.recordset);
        }
      } else {
        // ——— Không chọn serial → auto FIFO ———
        const serialResult = await new sql.Request(transaction)
          .input('product_id', sql.Int, item.product_id)
          .input('qty', sql.Int, item.buy_quantity)
          .query(`
            SELECT TOP (@qty) serial_number
            FROM PRODUCT_SERIAL
            WHERE product_id = @product_id AND sell_status = 1
            ORDER BY serial_number ASC
          `);
        assignedSerials = serialResult.recordset;
      }

      if (assignedSerials.length < item.buy_quantity) {
        throw new Error('Lỗi: Số lượng tồn kho không đủ để bán!');
      }

      // 4. Đổi sell_status = 0 + Tạo WARRANTY cho từng serial
      // Lấy warranty_months 1 lần cho sản phẩm
      const prodInfo = await new sql.Request(transaction)
        .input('product_id', sql.Int, item.product_id)
        .query(`SELECT ISNULL(warranty_months, 12) AS wm FROM PRODUCT WHERE id = @product_id`);
      const warrantyMonths = prodInfo.recordset[0]?.wm || 12;

      for (const row of assignedSerials) {
        await new sql.Request(transaction)
          .input('serial_number', sql.NVarChar, row.serial_number)
          .query(`UPDATE PRODUCT_SERIAL SET sell_status = 0 WHERE serial_number = @serial_number`);

        await new sql.Request(transaction)
          .input('invoice_id', sql.Int, invoiceId)
          .input('product_id', sql.Int, item.product_id)
          .input('serial_number', sql.NVarChar, row.serial_number)
          .input('warranty_months', sql.Int, warrantyMonths)
          .query(`
            INSERT INTO WARRANTY (invoice_id, product_id, serial_number, start_date, end_date)
            VALUES (@invoice_id, @product_id, @serial_number,
                    CAST(GETDATE() AS date),
                    CAST(DATEADD(month, @warranty_months, GETDATE()) AS date))
          `);
      }
    }

    await transaction.commit();
    res.json({ success: true, message: 'Tạo hóa đơn thành công! Bảo hành đã được kích hoạt tự động.' });
  } catch (err) {
    try { await transaction.rollback(); } catch (e) { }
    console.error('POST /invoices error:', err);
    const msg = err.message.includes('tồn kho') ? err.message : 'Lỗi: ' + err.message;
    res.status(500).json({ success: false, message: msg });
  }
});

module.exports = router;
