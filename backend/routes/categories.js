// ========================================
// Category Routes
// ========================================
const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT id, name FROM CATEGORY ORDER BY id');
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('GET /categories error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

// POST /api/categories
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.json({ success: false, message: 'Tên danh mục không được rỗng!' });

    const pool = await getPool();
    await pool.request()
      .input('name', sql.NVarChar, name)
      .query('INSERT INTO CATEGORY (name) VALUES (@name)');

    res.json({ success: true, message: 'Thêm danh mục thành công!' });
  } catch (err) {
    console.error('POST /categories error:', err);
    res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
  }
});

module.exports = router;
