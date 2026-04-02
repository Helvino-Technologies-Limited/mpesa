const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

async function initDb() {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations', 'init.sql'),
      'utf8'
    );
    await pool.query(sql);
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization error:', err);
    throw err;
  }
}

module.exports = { pool, initDb };
