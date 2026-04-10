const { sql, getPool } = require('./db');
async function test() {
  const p = await getPool();
  const r = await p.request().query(`
    SELECT ps.import_id, ps.product_id, COUNT(ps.serial_number) count_serials, idt.import_quantity 
    FROM PRODUCT_SERIAL ps
    LEFT JOIN IMPORT_DETAIL idt ON ps.import_id = idt.import_id AND ps.product_id = idt.product_id
    GROUP BY ps.import_id, ps.product_id, idt.import_quantity
  `);
  console.log('GROUP BY BATCH:', r.recordset);
  process.exit();
}
test();
