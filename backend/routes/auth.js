// ========================================
// Auth Routes - Đăng nhập / Xác thực
// ========================================
const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.json({ success: false, message: 'Thiếu thông tin đăng nhập!' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .input('password', sql.NVarChar, password)
      .query(`
        SELECT a.employee_id, a.username, a.role,
               e.employee_code, e.position, e.is_active,
               CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name) AS full_name
        FROM ACCOUNT a
        JOIN EMPLOYEE e ON a.employee_id = e.id
        JOIN PERSON p ON e.id = p.id
        WHERE a.username = @username AND a.password = @password
      `);

    if (result.recordset.length === 0) {
      return res.json({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu!' });
    }

    const user = result.recordset[0];

    if (!user.is_active) {
      return res.json({ success: false, message: 'Tài khoản đã bị khóa!' });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const employeeId = req.headers['x-employee-id'];
    if (!employeeId) {
      return res.json({ success: false, message: 'Chưa đăng nhập!' });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('employee_id', sql.Int, parseInt(employeeId))
      .query(`
        SELECT a.employee_id, a.username, a.role,
               e.employee_code, e.position, e.is_active,
               CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name) AS full_name
        FROM ACCOUNT a
        JOIN EMPLOYEE e ON a.employee_id = e.id
        JOIN PERSON p ON e.id = p.id
        WHERE a.employee_id = @employee_id
      `);

    if (result.recordset.length === 0) {
      return res.json({ success: false, message: 'Không tìm thấy tài khoản!' });
    }

    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    console.error('Auth/me error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

module.exports = router;
