const { sql, getPool } = require('./db');

function pad(num, width) {
  return String(num).padStart(width, '0');
}

async function main() {
  const pool = await getPool();

  // Backfill: tạo thêm PRODUCT_SERIAL (sell_status=1) nếu PRODUCT.stock_quantity > available serials
  // Lưu ý: import_id để NULL vì không biết lô nhập gốc.
  const products = await pool.request().query(`
    SELECT
      p.id,
      p.stock_quantity,
      ISNULL((SELECT COUNT(*) FROM PRODUCT_SERIAL ps WHERE ps.product_id = p.id AND ps.sell_status = 1), 0) AS available_serials
    FROM PRODUCT p
    ORDER BY p.id;
  `);

  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    let created = 0;

    for (const p of products.recordset || []) {
      const want = p.stock_quantity ?? 0;
      const have = p.available_serials ?? 0;
      const missing = want - have;
      if (missing <= 0) continue;

      // Tìm số thứ tự tiếp theo dựa trên các serial backfill trước đó
      const prefix = `BF-SP${pad(p.id, 3)}-`;
      const maxResult = await new sql.Request(tx)
        .input('product_id', sql.Int, p.id)
        .input('prefix', sql.NVarChar, prefix)
        .query(`
          SELECT MAX(TRY_CONVERT(int, RIGHT(serial_number, 4))) AS max_seq
          FROM PRODUCT_SERIAL
          WHERE product_id = @product_id AND serial_number LIKE @prefix + '%'
        `);
      let seq = (maxResult.recordset?.[0]?.max_seq ?? 0) + 1;

      for (let i = 0; i < missing; i++) {
        const serial = `${prefix}${pad(seq++, 4)}`;
        await new sql.Request(tx)
          .input('serial_number', sql.NVarChar, serial)
          .input('product_id', sql.Int, p.id)
          .query(`
            INSERT INTO PRODUCT_SERIAL (serial_number, product_id, import_id, sell_status)
            VALUES (@serial_number, @product_id, NULL, 1)
          `);
        created++;
      }
    }

    await tx.commit();
    console.log(`Backfill completed. Created serials: ${created}`);
  } catch (err) {
    try { await tx.rollback(); } catch (e) {}
    throw err;
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('backfill-serials failed:', err);
    process.exit(1);
  });

