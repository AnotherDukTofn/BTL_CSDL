// ========================================
// Warranty Routes
// ========================================
const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');

// GET /api/warranties
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT w.id, w.invoice_id, w.product_id, w.serial_number, w.start_date, w.end_date,
             p.name AS product_name
      FROM WARRANTY w
      LEFT JOIN PRODUCT p ON w.product_id = p.id
      ORDER BY w.id DESC
    `);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('GET /warranties error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

// GET /api/warranties/search
router.get('/search', async (req, res) => {
  try {
    const { serial } = req.query;
    const pool = await getPool();
    const result = await pool.request()
      .input('serial', sql.NVarChar, serial)
      .query(`
        SELECT w.id, w.invoice_id, w.product_id, w.serial_number, w.start_date, w.end_date,
               p.name AS product_name
        FROM WARRANTY w
        LEFT JOIN PRODUCT p ON w.product_id = p.id
        WHERE w.serial_number LIKE '%' + @serial + '%'
        ORDER BY w.id DESC
      `);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('GET /warranties/search error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

// GET /api/warranties/claims
router.get('/claims', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT wc.id, wc.warranty_id, wc.employee_id, wc.claim_date, wc.description, wc.status,
             w.serial_number, w.product_id, p.name AS product_name,
             CONCAT_WS(' ', pe.first_name, pe.middle_name, pe.last_name) AS employee_name
      FROM WARRANTY_CLAIM wc
      JOIN WARRANTY w ON wc.warranty_id = w.id
      LEFT JOIN PRODUCT p ON w.product_id = p.id
      LEFT JOIN EMPLOYEE e ON wc.employee_id = e.id
      LEFT JOIN PERSON pe ON e.id = pe.id
      ORDER BY wc.id DESC
    `);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('GET /warranties/claims error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

// GET /api/warranties/claims/search
router.get('/claims/search', async (req, res) => {
  try {
    const { serial } = req.query;
    const pool = await getPool();
    const result = await pool.request()
      .input('serial', sql.NVarChar, serial)
      .query(`
        SELECT wc.id, wc.warranty_id, wc.employee_id, wc.claim_date, wc.description, wc.status,
               w.serial_number, w.product_id, p.name AS product_name,
               CONCAT_WS(' ', pe.first_name, pe.middle_name, pe.last_name) AS employee_name
        FROM WARRANTY_CLAIM wc
        JOIN WARRANTY w ON wc.warranty_id = w.id
        LEFT JOIN PRODUCT p ON w.product_id = p.id
        LEFT JOIN EMPLOYEE e ON wc.employee_id = e.id
        LEFT JOIN PERSON pe ON e.id = pe.id
        WHERE w.serial_number LIKE '%' + @serial + '%'
        ORDER BY wc.id DESC
      `);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('GET /warranties/claims/search error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

// POST /api/warranties/claims - Tạo yêu cầu bảo hành
router.post('/claims', async (req, res) => {
  try {
    const { warranty_id, description } = req.body;
    const employeeId = req.headers['x-employee-id'];

    if (!warranty_id || !description) {
      return res.json({ success: false, message: 'Thiếu thông tin yêu cầu bảo hành!' });
    }

    const pool = await getPool();
    await pool.request()
      .input('warranty_id', sql.Int, warranty_id)
      .input('employee_id', sql.Int, parseInt(employeeId) || 1)
      .input('claim_date', sql.Date, new Date())
      .input('description', sql.NVarChar, description)
      .input('status', sql.NVarChar, 'Pending')
      .query(`
        INSERT INTO WARRANTY_CLAIM (warranty_id, employee_id, claim_date, description, status)
        VALUES (@warranty_id, @employee_id, @claim_date, @description, @status)
      `);

    res.json({ success: true, message: 'Tạo yêu cầu bảo hành thành công!' });
  } catch (err) {
    console.error('POST /warranties/claims error:', err);
    res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
  }
});

// PUT /api/warranties/claims/:id/status - Cập nhật trạng thái
router.put('/claims/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const pool = await getPool();

    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .input('status', sql.NVarChar, status)
      .query('UPDATE WARRANTY_CLAIM SET status = @status WHERE id = @id');

    res.json({ success: true, message: 'Cập nhật trạng thái thành công!' });
  } catch (err) {
    console.error('PUT /warranties/claims/:id/status error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

module.exports = router;
