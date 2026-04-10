// ========================================
// Provider Routes
// ========================================
const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');

// GET /api/providers
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT id, name, email, phone FROM PROVIDER ORDER BY id');
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('GET /providers error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

// GET /api/providers/search
router.get('/search', async (req, res) => {
  try {
    const { type, keyword } = req.query;
    const pool = await getPool();
    const keywordInt = parseInt(keyword) || 0;

    const result = await pool.request()
      .input('keywordInt', sql.Int, keywordInt)
      .input('keyword', sql.NVarChar, keyword)
      .query(`
        SELECT id, name, email, phone FROM PROVIDER
        WHERE id = @keywordInt OR name LIKE '%' + @keyword + '%'
        ORDER BY id
      `);

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('GET /providers/search error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

// POST /api/providers
router.post('/', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!name) return res.json({ success: false, message: 'Tên NCC không được rỗng!' });

    const pool = await getPool();
    await pool.request()
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email || null)
      .input('phone', sql.NVarChar, phone || null)
      .query('INSERT INTO PROVIDER (name, email, phone) VALUES (@name, @email, @phone)');

    res.json({ success: true, message: 'Thêm nhà cung cấp thành công!' });
  } catch (err) {
    console.error('POST /providers error:', err);
    res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
  }
});

// PUT /api/providers/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email || null)
      .input('phone', sql.NVarChar, phone || null)
      .query('UPDATE PROVIDER SET name = @name, email = @email, phone = @phone WHERE id = @id');

    res.json({ success: true, message: 'Cập nhật nhà cung cấp thành công!' });
  } catch (err) {
    console.error('PUT /providers error:', err);
    res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
  }
});

module.exports = router;
