// ========================================
// Invoice Routes
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

// GET /api/invoices/:id/details
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

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('GET /invoices/:id/details error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

// POST /api/invoices - Tạo hóa đơn mới (Transaction)
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
      await new sql.Request(transaction)
        .input('invoice_id', sql.Int, invoiceId)
        .input('product_id', sql.Int, item.product_id)
        .input('buy_quantity', sql.Int, item.buy_quantity)
        .input('unit_price', sql.Decimal(18, 2), item.unit_price)
        .query(`
          INSERT INTO INVOICE_DETAIL (invoice_id, product_id, buy_quantity, unit_price)
          VALUES (@invoice_id, @product_id, @buy_quantity, @unit_price)
        `);
    }

    await transaction.commit();
    res.json({ success: true, message: 'Tạo hóa đơn thành công!' });
  } catch (err) {
    try { await transaction.rollback(); } catch (e) {}
    console.error('POST /invoices error:', err);
    // Trả lỗi trigger (ví dụ: hết hàng)
    const msg = err.message.includes('tồn kho') ? err.message : 'Lỗi: ' + err.message;
    res.status(500).json({ success: false, message: msg });
  }
});

module.exports = router;
