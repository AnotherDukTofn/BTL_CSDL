const { getPool } = require('./db');

async function main() {
  const pool = await getPool();

  // So khớp tồn kho ở PRODUCT vs số serial khả dụng (sell_status=1)
  const result = await pool.request().query(`
    SELECT
      p.id,
      p.name,
      p.stock_quantity AS product_stock_quantity,
      ISNULL(SUM(CASE WHEN ps.sell_status = 1 THEN 1 ELSE 0 END), 0) AS available_serials,
      COUNT(ps.serial_number) AS total_serials
    FROM PRODUCT p
    LEFT JOIN PRODUCT_SERIAL ps ON ps.product_id = p.id
    GROUP BY p.id, p.name, p.stock_quantity
    ORDER BY p.id;
  `);

  const rows = result.recordset || [];
  const mismatches = rows.filter(r => (r.product_stock_quantity ?? 0) !== (r.available_serials ?? 0));

  console.log(`Total products: ${rows.length}`);
  console.log(`Mismatches (PRODUCT.stock_quantity != available_serials): ${mismatches.length}`);
  if (mismatches.length) {
    console.table(mismatches.map(r => ({
      id: r.id,
      name: r.name,
      product_stock_quantity: r.product_stock_quantity,
      available_serials: r.available_serials,
      total_serials: r.total_serials,
    })));
  }

  const statusDist = await pool.request().query(`
    SELECT sell_status, COUNT(*) AS cnt
    FROM PRODUCT_SERIAL
    GROUP BY sell_status
    ORDER BY sell_status DESC;
  `);
  console.log('PRODUCT_SERIAL sell_status distribution:');
  console.table(statusDist.recordset || []);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('stock-audit failed:', err);
    process.exit(1);
  });

