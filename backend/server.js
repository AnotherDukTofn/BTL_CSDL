// ========================================
// Server.js - Express Entry Point
// ========================================
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { getPool } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/manufacturers', require('./routes/manufacturers'));
app.use('/api/providers', require('./routes/providers'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/imports', require('./routes/imports'));
app.use('/api/warranties', require('./routes/warranties'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// Khởi động server
async function start() {
  try {
    await getPool(); // Test kết nối DB
    app.listen(PORT, () => {
      console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Không thể kết nối Database:', err.message);
    process.exit(1);
  }
}

start();
