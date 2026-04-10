// ========================================
// Customer Routes
// ========================================
const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');

const BASE_SELECT = `
  SELECT c.id, c.customer_code,
         CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name) AS full_name,
         p.first_name, p.middle_name, p.last_name, p.gender,
         p.province, p.district, p.street, p.house_num,
         CONCAT_WS(' ', p.house_num, p.street, p.district, p.province) AS address,
         pp.phone_num
  FROM CUSTOMER c
  JOIN PERSON p ON c.id = p.id
  LEFT JOIN PERSON_PHONE pp ON p.id = pp.person_id
`;

// GET /api/customers
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`${BASE_SELECT} ORDER BY c.id`);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('GET /customers error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

// GET /api/customers/search
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
        WHERE c.id = @keywordInt
           OR c.customer_code LIKE '%' + @keyword + '%'
           OR p.first_name LIKE '%' + @keyword + '%'
           OR p.last_name LIKE '%' + @keyword + '%'
        ORDER BY c.id
      `);

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('GET /customers/search error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

// POST /api/customers - Thêm khách hàng mới (Transaction)
router.post('/', async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const { first_name, middle_name, last_name, gender, phone_num,
            house_num, street, district, province } = req.body;

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
        INSERT INTO PERSON (first_name, middle_name, last_name, gender, province, district, street, house_num)
        VALUES (@first_name, @middle_name, @last_name, @gender, @province, @district, @street, @house_num);
        SELECT SCOPE_IDENTITY() AS id;
      `);

    const personId = personResult.recordset[0].id;

    // 2. Tạo customer_code
    const custCode = 'KH' + String(personId).padStart(3, '0');

    // 3. Insert CUSTOMER
    await new sql.Request(transaction)
      .input('id', sql.Int, personId)
      .input('customer_code', sql.NVarChar, custCode)
      .query(`INSERT INTO CUSTOMER (id, customer_code) VALUES (@id, @customer_code)`);

    // 4. Insert PERSON_PHONE
    if (phone_num) {
      await new sql.Request(transaction)
        .input('person_id', sql.Int, personId)
        .input('phone_num', sql.NVarChar, phone_num)
        .query(`INSERT INTO PERSON_PHONE (person_id, phone_num) VALUES (@person_id, @phone_num)`);
    }

    await transaction.commit();
    res.json({ success: true, message: 'Thêm khách hàng thành công!' });
  } catch (err) {
    await transaction.rollback();
    console.error('POST /customers error:', err);
    res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
  }
});

// PUT /api/customers/:id - Cập nhật khách hàng
router.put('/:id', async (req, res) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    const { id } = req.params;
    const { first_name, middle_name, last_name, gender, phone_num,
            house_num, street, district, province } = req.body;

    await transaction.begin();

    // Update PERSON
    await new sql.Request(transaction)
      .input('id', sql.Int, parseInt(id))
      .input('first_name', sql.NVarChar, first_name || null)
      .input('middle_name', sql.NVarChar, middle_name || null)
      .input('last_name', sql.NVarChar, last_name || null)
      .input('gender', sql.NVarChar, gender || null)
      .input('province', sql.NVarChar, province || null)
      .input('district', sql.NVarChar, district || null)
      .input('street', sql.NVarChar, street || null)
      .input('house_num', sql.NVarChar, house_num || null)
      .query(`
        UPDATE PERSON SET first_name = @first_name, middle_name = @middle_name,
               last_name = @last_name, gender = @gender, province = @province,
               district = @district, street = @street, house_num = @house_num
        WHERE id = @id
      `);

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

    await transaction.commit();
    res.json({ success: true, message: 'Cập nhật khách hàng thành công!' });
  } catch (err) {
    await transaction.rollback();
    console.error('PUT /customers error:', err);
    res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
  }
});

module.exports = router;
