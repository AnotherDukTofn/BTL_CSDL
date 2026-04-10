// ========================================
// Manufacturer Routes
// ========================================
const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');

// GET /api/manufacturers
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT id, name FROM MANUFACTURER ORDER BY id');
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('GET /manufacturers error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

// POST /api/manufacturers
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.json({ success: false, message: 'Tên NSX không được rỗng!' });

    const pool = await getPool();
    await pool.request()
      .input('name', sql.NVarChar, name)
      .query('INSERT INTO MANUFACTURER (name) VALUES (@name)');

    res.json({ success: true, message: 'Thêm nhà sản xuất thành công!' });
  } catch (err) {
    console.error('POST /manufacturers error:', err);
    res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
  }
});

module.exports = router;
