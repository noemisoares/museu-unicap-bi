const fs = require('node:fs');
const { Pool } = require('pg');

const ca = process.env.DB_CA_CERT_PATH
  ? fs.readFileSync(process.env.DB_CA_CERT_PATH, 'utf8')
  : process.env.DB_CA_CERT?.replace(/\\n/g, '\n');

module.exports = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
  ssl: process.env.DB_SSL_MODE === 'disable' ? false : { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
});
