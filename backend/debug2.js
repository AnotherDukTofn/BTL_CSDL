const { sql, getPool } = require('./db');
async function test() {
  const p = await getPool();
  const r = await p.request().query(`
    SELECT top 5 ps.import_id, ps.product_id, idt.import_quantity as original_quantity, count(ps.serial_number) as stock_quantity
    FROM PRODUCT_SERIAL ps
    LEFT JOIN IMPORT_DETAIL idt ON ps.import_id = idt.import_id AND ps.product_id = idt.product_id
    GROUP BY ps.import_id, ps.product_id, idt.import_quantity
    ORDER BY ps.import_id DESC
  `);
  console.log('LATEST BATCHES:', r.recordset);
  process.exit();
}
test();
