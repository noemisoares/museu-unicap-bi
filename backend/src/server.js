require('dotenv').config();
const express = require('express');
const pool = require('./db');

const app = express();
app.use(express.json());

app.get('/saude', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ ok: false });
  }
});

app.get('/terminais', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nome, tipo, localizacao, status FROM core.terminal ORDER BY nome'
    );
    res.json(rows);
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ erro: 'Falha ao consultar terminais' });
  }
});

app.get('/topicos', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nome, descricao, tipo FROM core.topico WHERE ativo ORDER BY nome'
    );
    res.json(rows);
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ erro: 'Falha ao consultar tópicos' });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('API no ar'));
