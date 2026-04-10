// ========================================
// Employee Routes
// ========================================
const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');

// GET /api/employees - Danh sách nhân viên
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT e.id, e.employee_code, e.employment_type, e.position, e.is_active,
             CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name) AS full_name,
             p.first_name, p.middle_name, p.last_name, p.gender,
             p.house_num, p.street, p.district, p.province,
             a.username, a.role AS account_role,
             (SELECT TOP 1 pp.phone_num FROM PERSON_PHONE pp WHERE pp.person_id = e.id) AS phone_num
      FROM EMPLOYEE e
      JOIN PERSON p ON e.id = p.id
      LEFT JOIN ACCOUNT a ON a.employee_id = e.id
      ORDER BY e.id
    `);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('GET /employees error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

// POST /api/employees - Thêm nhân viên mới (Transaction)
router.post('/', async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const { first_name, middle_name, last_name, gender, phone_num,
            house_num, street, district, province,
            position, employment_type, password } = req.body;

    await transaction.begin();

    // 1. Insert PERSON
    const personResult = await new sql.Request(transaction)
      .input('first_name', sql.NVarChar, first_name || null)
      .input('middle_name', sql.NVarChar, middle_name || null)
      .input('last_name', sql.NVarChar, last_name || null)
      .input('gender', sql.NVarChar, gender || null)
      .input('house_num', sql.NVarChar, house_num || null)
      .input('street', sql.NVarChar, street || null)
      .input('district', sql.NVarChar, district || null)
      .input('province', sql.NVarChar, province || null)
      .query(`
        INSERT INTO PERSON (first_name, middle_name, last_name, gender, house_num, street, district, province)
        VALUES (@first_name, @middle_name, @last_name, @gender, @house_num, @street, @district, @province);
        SELECT SCOPE_IDENTITY() AS id;
      `);

    const personId = personResult.recordset[0].id;

    // 2. Tạo employee_code
    const empCode = 'NV' + String(personId).padStart(3, '0');

    // 3. Insert EMPLOYEE
    await new sql.Request(transaction)
      .input('id', sql.Int, personId)
      .input('employee_code', sql.NVarChar, empCode)
      .input('position', sql.NVarChar, position || 'Nhân viên')
      .input('employment_type', sql.NVarChar, employment_type || 'Toàn thời gian')
      .query(`
        INSERT INTO EMPLOYEE (id, employee_code, position, employment_type, is_active)
        VALUES (@id, @employee_code, @position, @employment_type, 1)
      `);

    // 4. Insert PERSON_PHONE
    if (phone_num) {
      await new sql.Request(transaction)
        .input('person_id', sql.Int, personId)
        .input('phone_num', sql.NVarChar, phone_num)
        .query(`INSERT INTO PERSON_PHONE (person_id, phone_num) VALUES (@person_id, @phone_num)`);
    }

    // 5. Insert ACCOUNT
    const username = empCode.toLowerCase();
    await new sql.Request(transaction)
      .input('employee_id', sql.Int, personId)
      .input('username', sql.NVarChar, username)
      .input('password', sql.NVarChar, password || '123456')
      .query(`
        INSERT INTO ACCOUNT (employee_id, username, password, role)
        VALUES (@employee_id, @username, @password, 'employee')
      `);

    await transaction.commit();

    res.json({
      success: true,
      message: `Thêm nhân viên ${empCode} thành công! Tài khoản: ${username} / ${password || '123456'}`
    });
  } catch (err) {
    await transaction.rollback();
    console.error('POST /employees error:', err);
    res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
  }
});

// PUT /api/employees/:id - Cập nhật nhân viên
router.put('/:id', async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const { id } = req.params;
    const { position, employment_type, phone_num, house_num, street, district, province } = req.body;

    await transaction.begin();

    // Update EMPLOYEE
    await new sql.Request(transaction)
      .input('id', sql.Int, parseInt(id))
      .input('position', sql.NVarChar, position)
      .input('employment_type', sql.NVarChar, employment_type)
      .query(`UPDATE EMPLOYEE SET position = @position, employment_type = @employment_type WHERE id = @id`);

    // Update PERSON (address)
    await new sql.Request(transaction)
      .input('id', sql.Int, parseInt(id))
      .input('house_num', sql.NVarChar, house_num || null)
      .input('street', sql.NVarChar, street || null)
      .input('district', sql.NVarChar, district || null)
      .input('province', sql.NVarChar, province || null)
      .query(`UPDATE PERSON SET house_num = @house_num, street = @street, district = @district, province = @province WHERE id = @id`);

    // Update PERSON_PHONE
    await new sql.Request(transaction)
      .input('person_id', sql.Int, parseInt(id))
      .query(`DELETE FROM PERSON_PHONE WHERE person_id = @person_id`);

    if (phone_num) {
      await new sql.Request(transaction)
        .input('person_id', sql.Int, parseInt(id))
        .input('phone_num', sql.NVarChar, phone_num)
        .query(`INSERT INTO PERSON_PHONE (person_id, phone_num) VALUES (@person_id, @phone_num)`);
    }

    // Update ACCOUNT (password) if provided
    if (req.body.password && req.body.password.trim() !== '') {
      await new sql.Request(transaction)
        .input('employee_id', sql.Int, parseInt(id))
        .input('password', sql.NVarChar, req.body.password)
        .query(`UPDATE ACCOUNT SET password = @password WHERE employee_id = @employee_id`);
    }

    await transaction.commit();
    res.json({ success: true, message: 'Cập nhật thành công!' });
  } catch (err) {
    await transaction.rollback();
    console.error('PUT /employees error:', err);
    res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
  }
});

// PUT /api/employees/:id/status - Khóa/Mở khóa
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .input('is_active', sql.Bit, is_active ? 1 : 0)
      .query(`UPDATE EMPLOYEE SET is_active = @is_active WHERE id = @id`);

    res.json({ success: true, message: 'Cập nhật trạng thái thành công!' });
  } catch (err) {
    console.error('PUT /employees/:id/status error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

// PUT /api/employees/:id/role - Đổi phân quyền
router.put('/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const pool = await getPool();
    await pool.request()
      .input('employee_id', sql.Int, parseInt(id))
      .input('role', sql.NVarChar, role)
      .query(`UPDATE ACCOUNT SET role = @role WHERE employee_id = @employee_id`);

    res.json({ success: true, message: 'Đổi phân quyền thành công!' });
  } catch (err) {
    console.error('PUT /employees/:id/role error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

module.exports = router;
