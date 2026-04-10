// ========================================
// Database Connection - SQL Server (mssql)
// ========================================
let sql = require('mssql');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

if (process.env.DB_TRUSTED === 'true') {
  sql = require('mssql/msnodesqlv8');
}

const config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'SqlPtit',
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  beforeConnect: (conn) => {
    if (conn && conn.conn_str) {
      conn.conn_str = conn.conn_str.replace('SQL Server Native Client 11.0', 'ODBC Driver 17 for SQL Server');
    }
  }
};

// Cấu hình Windows Authentication
if (process.env.DB_TRUSTED === 'true') {
  config.driver = 'msnodesqlv8';
  config.options.trustedConnection = true;
} else {
  config.user = process.env.DB_USER || 'sa';
  config.password = process.env.DB_PASSWORD || '123456';
}

let poolPromise;

function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(config).then(pool => {
      console.log('✅ Đã kết nối SQL Server:', config.database);
      return pool;
    }).catch(err => {
      poolPromise = null;
      console.error('Lỗi kết nối CSDL:', err);
      throw err;
    });
  }
  return poolPromise;
}

module.exports = { sql, getPool };
