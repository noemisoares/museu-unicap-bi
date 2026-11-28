require('dotenv').config();
const express = require('express');
const pool = require('./db');
const {
  InputError, validateCheckIn, validateSatisfaction, validatePedagogical,
} = require('./validation');

const TERMINALS = Object.freeze({
  checkIn: 'Check-in Recepcao',
  satisfaction: 'Totem Saida 01',
  pedagogical: 'Formulario Pedagogico Web',
});

function createApp(database = pool) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  const health = async (_req, res) => {
    await database.query('SELECT 1');
    res.json({ ok: true });
  };
  app.get(['/saude', '/api/v1/saude'], health);

  app.get('/terminais', async (_req, res) => {
    const { rows } = await database.query(
      'SELECT id, nome, tipo, localizacao, status FROM core.terminal ORDER BY nome',
    );
    res.json(rows);
  });

  app.get('/topicos', async (_req, res) => {
    const { rows } = await database.query(
      'SELECT id, nome, descricao, tipo FROM core.topico WHERE ativo ORDER BY nome',
    );
    res.json(rows);
  });

  app.get('/api/v1/topicos', async (_req, res) => {
    const { rows } = await database.query(
      `SELECT id, nome AS label, COALESCE(icon, 'help_outline') AS icon
       FROM core.topico
       WHERE ativo = TRUE AND tipo IN ('SATISFACAO', 'AMBOS')
       ORDER BY nome`,
    );
    res.json(rows);
  });

  app.post('/api/v1/checkins', async (req, res) => {
    const input = validateCheckIn(req.body);
    const { rows } = await database.query(
      `SELECT core.registrar_checkin(
        $1::text, $2::integer, $3::text, $4::text, $5::text, $6::text,
        $7::text, $8::text, $9::text, $10::text, $11::text, $12::boolean
      ) AS result`,
      [
        input.visitType, input.visitorCount, input.visitorAgeRange,
        input.institutionalBond, input.federationUnit, input.municipality,
        input.neighborhood, TERMINALS.checkIn, null,
        input.contact?.email ?? null, input.contact?.phone ?? null,
        input.contact?.communicationConsent ?? false,
      ],
    );
    const { protocol, checkedInAt } = rows[0].result;
    res.status(201).json({ protocol, checkedInAt });
  });

  app.post('/api/v1/avaliacoes-satisfacao', async (req, res) => {
    const input = validateSatisfaction(req.body);
    if (input.topicIds.length > 0) {
      const { rows: availableTopics } = await database.query(
        `SELECT id FROM core.topico
         WHERE id = ANY($1::uuid[]) AND ativo = TRUE AND tipo IN ('SATISFACAO', 'AMBOS')`,
        [input.topicIds],
      );
      if (availableTopics.length !== input.topicIds.length) {
        throw new InputError('Selecione apenas tópicos de satisfação ativos.');
      }
    }
    const { rows } = await database.query(
      'SELECT core.registrar_satisfacao($1::integer, $2::uuid[], $3::text) AS result',
      [input.rating, input.topicIds, TERMINALS.satisfaction],
    );
    const { protocol, evaluatedAt } = rows[0].result;
    res.status(201).json({ protocol, evaluatedAt });
  });

  app.post('/api/v1/avaliacoes-pedagogicas', async (req, res) => {
    const input = validatePedagogical(req.body);
    const { rows } = await database.query(
      `SELECT core.registrar_pedagogica(
        $1::text, $2::text, $3::text[], $4::integer, $5::integer, $6::text,
        $7::text, $8::text, $9::boolean, $10::text, $11::text, $12::text
      ) AS result`,
      [
        input.institutionName, input.network, input.cycles,
        input.studentCount, input.curriculumAlignmentScore,
        input.mediatorsRating, input.materialsRating, input.suggestions,
        input.interestedInFutureVisits, input.contactChannel,
        input.contactValue, TERMINALS.pedagogical,
      ],
    );
    const { protocol, evaluatedAt } = rows[0].result;
    res.status(201).json({ protocol, evaluatedAt });
  });

  app.use('/api/v1', (_req, res) => {
    res.status(404).json({ code: 'NOT_FOUND', message: 'Rota não encontrada.' });
  });

  app.use((error, _req, res, _next) => {
    if (error instanceof InputError) {
      return res.status(400).json({ code: 'INVALID_REQUEST', message: error.message });
    }
    if (error?.type === 'entity.too.large') {
      return res.status(413).json({ code: 'PAYLOAD_TOO_LARGE', message: 'Requisição muito grande.' });
    }
    if (error instanceof SyntaxError && error.status === 400) {
      return res.status(400).json({ code: 'INVALID_JSON', message: 'JSON inválido.' });
    }
    if (error?.code === '23505') {
      return res.status(409).json({ code: 'CONFLICT', message: 'Registro duplicado.' });
    }
    if (['22P02', '23503', '23514'].includes(error?.code)) {
      return res.status(400).json({ code: 'INVALID_REQUEST', message: 'Dados inválidos.' });
    }
    console.error('[api] request failed', { code: error?.code ?? 'UNKNOWN' });
    return res.status(503).json({ code: 'SERVICE_UNAVAILABLE', message: 'Serviço indisponível.' });
  });

  return app;
}

const app = createApp();
if (require.main === module) {
  app.listen(process.env.PORT || 3000, () => console.log('API no ar'));
}

module.exports = app;
module.exports.createApp = createApp;
