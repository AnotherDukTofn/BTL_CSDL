const { sql, getPool } = require('./db');

async function migrate() {
  try {
    console.log('Connecting to database...');
    const pool = await getPool();

    // 1. Add warranty_months column to PRODUCT
    console.log('Adding warranty_months column to PRODUCT...');
    try {
      await pool.request().query(`ALTER TABLE PRODUCT ADD warranty_months int DEFAULT 12`);
      console.log('✅ Column warranty_months added.');
    } catch (e) {
      if (e.message.includes('already')) {
        console.log('⚠️  Column warranty_months already exists, skipping.');
      } else throw e;
    }

    // 2. Set default warranty_months = 12 for existing products
    await pool.request().query(`UPDATE PRODUCT SET warranty_months = 12 WHERE warranty_months IS NULL`);
    console.log('✅ Default warranty_months set to 12 for existing products.');

    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
