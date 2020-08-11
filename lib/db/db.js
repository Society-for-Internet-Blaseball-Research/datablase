const { Pool } = require('pg');

const pool = new Pool();

async function all(text, params) {
  const results = await pool.query(text, params);

  return results.rows;
}

async function one(text, params) {
  const results = await pool.query(text, params);

  return results.rows[0];
}

async function allWithCount(text, params) {
  const results = await all(text, params);

  return {
    count: results.length,
    results,
  };
}

module.exports = {
  queryRaw: (text, params) => pool.query(text, params),
  all,
  one,
  allWithCount,
};
