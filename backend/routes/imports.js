// ========================================
// Import Routes (Nhập kho)
// ========================================
const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');

const BASE_SELECT = `
  SELECT i.id, i.employee_id, i.provider_id, i.create_time,
         CONCAT_WS(' ', pe.first_name, pe.middle_name, pe.last_name) AS employee_name,
         pr.name AS provider_name
  FROM IMPORT i
  LEFT JOIN EMPLOYEE e ON i.employee_id = e.id
  LEFT JOIN PERSON pe ON e.id = pe.id
  LEFT JOIN PROVIDER pr ON i.provider_id = pr.id
`;

// GET /api/imports
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`${BASE_SELECT} ORDER BY i.id DESC`);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('GET /imports error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

// GET /api/imports/search
router.get('/search', async (req, res) => {
  try {
    const { type, keyword } = req.query;
    const pool = await getPool();
    const keywordInt = parseInt(keyword) || 0;

    const result = await pool.request()
      .input('keywordInt', sql.Int, keywordInt)
      .input('keyword', sql.NVarChar, keyword)
      .query(`
        ${BASE_SELECT}
        WHERE i.id = @keywordInt
           OR pe.first_name LIKE '%' + @keyword + '%'
           OR pe.last_name LIKE '%' + @keyword + '%'
           OR pr.name LIKE '%' + @keyword + '%'
        ORDER BY i.id DESC
      `);

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('GET /imports/search error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

// GET /api/imports/:id/details
router.get('/:id/details', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(`
        SELECT d.import_id, d.product_id, d.import_quantity, d.unit_price,
               p.name AS product_name
        FROM IMPORT_DETAIL d
        JOIN PRODUCT p ON d.product_id = p.id
        WHERE d.import_id = @id
      `);

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('GET /imports/:id/details error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

// POST /api/imports - Tạo phiếu nhập (Transaction)
router.post('/', async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const { employee_id, provider_id, details } = req.body;

    if (!employee_id || !provider_id || !details || !details.length) {
      return res.json({ success: false, message: 'Thiếu thông tin phiếu nhập!' });
    }

    await transaction.begin();

    // 1. Insert IMPORT
    const impResult = await new sql.Request(transaction)
      .input('employee_id', sql.Int, employee_id)
      .input('provider_id', sql.Int, provider_id)
      .query(`
        INSERT INTO IMPORT (employee_id, provider_id) VALUES (@employee_id, @provider_id);
        SELECT SCOPE_IDENTITY() AS id;
      `);

    const importId = impResult.recordset[0].id;

    // 2. Insert IMPORT_DETAIL (trigger sẽ tự cộng kho)
    for (const item of details) {
      await new sql.Request(transaction)
        .input('import_id', sql.Int, importId)
        .input('product_id', sql.Int, item.product_id)
        .input('import_quantity', sql.Int, item.import_quantity)
        .input('unit_price', sql.Decimal(18, 2), item.unit_price)
        .query(`
          INSERT INTO IMPORT_DETAIL (import_id, product_id, import_quantity, unit_price)
          VALUES (@import_id, @product_id, @import_quantity, @unit_price)
        `);
    }

    await transaction.commit();
    res.json({ success: true, message: 'Tạo phiếu nhập thành công!' });
  } catch (err) {
    try { await transaction.rollback(); } catch (e) {}
    console.error('POST /imports error:', err);
    res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
  }
});

module.exports = router;
