// ========================================
// Product Routes
// ========================================
const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');

const BASE_SELECT = `
  SELECT p.id, p.name, p.category_id, p.manufacturer_id,
         c.name AS category_name, m.name AS manufacturer_name,
         p.in_unit_price, p.out_unit_price,
         ISNULL((SELECT COUNT(*) FROM PRODUCT_SERIAL ps WHERE ps.product_id = p.id AND ps.sell_status = 1), 0) AS stock_quantity
  FROM PRODUCT p
  LEFT JOIN CATEGORY c ON p.category_id = c.id
  LEFT JOIN MANUFACTURER m ON p.manufacturer_id = m.id
`;

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`${BASE_SELECT} ORDER BY p.id`);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('GET /products error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

// GET /api/products/search
router.get('/search', async (req, res) => {
  try {
    const { type, keyword } = req.query;
    const pool = await getPool();
    let whereClause = '';

    if (type === 'id') {
      const keywordInt = parseInt(keyword) || 0;
      whereClause = `WHERE p.id = ${keywordInt}`;
    } else {
      whereClause = `WHERE p.id = ${parseInt(keyword) || 0} OR p.name LIKE N'%' + @keyword + '%'`;
    }

    const result = await pool.request()
      .input('keyword', sql.NVarChar, keyword)
      .query(`${BASE_SELECT} ${whereClause} ORDER BY p.id`);

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('GET /products/search error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

// GET /api/products/filter
router.get('/filter', async (req, res) => {
  try {
    const { categoryId, manufacturerId } = req.query;
    const pool = await getPool();
    const request = pool.request();

    let conditions = [];
    if (categoryId) {
      request.input('categoryId', sql.Int, parseInt(categoryId));
      conditions.push('p.category_id = @categoryId');
    }
    if (manufacturerId) {
      request.input('manufacturerId', sql.Int, parseInt(manufacturerId));
      conditions.push('p.manufacturer_id = @manufacturerId');
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const result = await request.query(`${BASE_SELECT} ${whereClause} ORDER BY p.id`);

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('GET /products/filter error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

// POST /api/products - Thêm sản phẩm
router.post('/', async (req, res) => {
  try {
    const { name, category_id, manufacturer_id, in_unit_price, out_unit_price, stock_quantity } = req.body;
    const pool = await getPool();
    await pool.request()
      .input('name', sql.NVarChar, name)
      .input('category_id', sql.Int, category_id || null)
      .input('manufacturer_id', sql.Int, manufacturer_id || null)
      .input('in_unit_price', sql.Decimal(18, 2), in_unit_price || 0)
      .input('out_unit_price', sql.Decimal(18, 2), out_unit_price || 0)
      .input('stock_quantity', sql.Int, stock_quantity || 0)
      .query(`
        INSERT INTO PRODUCT (name, category_id, manufacturer_id, in_unit_price, out_unit_price, stock_quantity)
        VALUES (@name, @category_id, @manufacturer_id, @in_unit_price, @out_unit_price, @stock_quantity)
      `);

    res.json({ success: true, message: 'Thêm sản phẩm thành công!' });
  } catch (err) {
    console.error('POST /products error:', err);
    res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
  }
});

// PUT /api/products/:id - Cập nhật sản phẩm
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category_id, manufacturer_id, out_unit_price } = req.body;
    const pool = await getPool();

    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .input('name', sql.NVarChar, name)
      .input('category_id', sql.Int, category_id || null)
      .input('manufacturer_id', sql.Int, manufacturer_id || null)
      .input('out_unit_price', sql.Decimal(18, 2), out_unit_price || 0)
      .query(`
        UPDATE PRODUCT
        SET name = @name, category_id = @category_id,
            manufacturer_id = @manufacturer_id, out_unit_price = @out_unit_price
        WHERE id = @id
      `);

    res.json({ success: true, message: 'Cập nhật sản phẩm thành công!' });
  } catch (err) {
    console.error('PUT /products error:', err);
    res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
  }
});

// GET /api/products/:id/batches - Lấy tồn kho theo lô (Import)
router.get('/:id/batches', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(`
        SELECT ps.import_id, i.create_time, idt.unit_price as exact_import_price, idt.import_quantity as original_quantity, COUNT(ps.serial_number) as stock_quantity
        FROM PRODUCT_SERIAL ps
        LEFT JOIN IMPORT_DETAIL idt ON ps.import_id = idt.import_id AND ps.product_id = idt.product_id
        LEFT JOIN IMPORT i ON ps.import_id = i.id
        WHERE ps.product_id = @id AND ps.sell_status = 1
        GROUP BY ps.import_id, i.create_time, idt.unit_price, idt.import_quantity
        ORDER BY i.create_time ASC
      `);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('GET /products/:id/batches error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

// GET /api/products/:id/available-serials - Danh sách serial còn trong kho
router.get('/:id/available-serials', async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(`
        SELECT ps.serial_number, ps.import_id
        FROM PRODUCT_SERIAL ps
        WHERE ps.product_id = @id AND ps.sell_status = 1
        ORDER BY ps.import_id ASC, ps.serial_number ASC
      `);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('GET /products/:id/available-serials error:', err);
    res.status(500).json({ success: false, message: 'Lỗi server!' });
  }
});

module.exports = router;
