const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/server');

async function withServer(database, run) {
  const server = createApp(database).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(origin);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function post(origin, path, body) {
  return fetch(`${origin}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const checkIn = {
  visitType: 'individual',
  visitorCount: 1,
  visitorAgeRange: 'adulto',
  institutionalBond: 'comunidade',
  federationUnit: 'PE',
  municipality: 'Recife',
  neighborhood: 'Boa Vista',
  contact: null,
};

const pedagogical = {
  institutionName: 'Escola Exemplo',
  network: 'estadual',
  cycles: ['medio'],
  studentCount: 25,
  curriculumAlignmentScore: 5,
  mediatorsRating: 'excelente',
  materialsRating: 'adequado',
  suggestions: null,
  interestedInFutureVisits: true,
  contactChannel: 'phone',
  contactValue: '8133334444',
};

test('new and legacy health routes check the database', async () => {
  let calls = 0;
  await withServer({ query: async () => { calls++; return { rows: [{ '?column?': 1 }] }; } }, async (origin) => {
    for (const path of ['/saude', '/api/v1/saude']) {
      const response = await fetch(`${origin}${path}`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ok: true });
    }
  });
  assert.equal(calls, 2);
});

test('satisfaction topics use the filtered API contract', async () => {
  let sql = '';
  await withServer({ query: async (statement) => {
    sql = statement;
    return { rows: [{ id: 'topic-1', label: 'Acolhimento', icon: 'emoji_people' }] };
  } }, async (origin) => {
    const response = await fetch(`${origin}/api/v1/topicos`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [
      { id: 'topic-1', label: 'Acolhimento', icon: 'emoji_people' },
    ]);
  });
  assert.match(sql, /ativo = TRUE AND tipo IN \('SATISFACAO', 'AMBOS'\)/);
});

test('check-in selects its terminal and discards contact without consent', async () => {
  let params;
  await withServer({ query: async (_sql, values) => {
    params = values;
    return { rows: [{ result: { protocol: 'CHK-2026-123456', checkedInAt: '2026-11-27T12:00:00Z' } }] };
  } }, async (origin) => {
    const response = await post(origin, '/api/v1/checkins', {
      ...checkIn,
      contact: { phone: '81999999999', communicationConsent: false },
    });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), {
      protocol: 'CHK-2026-123456', checkedInAt: '2026-11-27T12:00:00Z',
    });
  });
  assert.equal(params[7], 'Check-in Recepcao');
  assert.equal(params[9], null);
  assert.equal(params[10], null);
  assert.equal(params[11], false);
});

test('invalid check-in is rejected before querying the database', async () => {
  let calls = 0;
  await withServer({ query: async () => { calls++; throw Error('should not run'); } }, async (origin) => {
    const response = await post(origin, '/api/v1/checkins', { ...checkIn, visitorCount: 0 });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, 'INVALID_REQUEST');
  });
  assert.equal(calls, 0);
});

test('satisfaction deduplicates topics and selects the exit terminal', async () => {
  let params;
  await withServer({ query: async (sql, values) => {
    if (sql.includes('FROM core.topico')) return { rows: [{ id: values[0][0] }] };
    params = values;
    return { rows: [{ result: { protocol: 'SAT-2026-123456', evaluatedAt: '2026-11-27T12:00:00Z' } }] };
  } }, async (origin) => {
    const id = '00000000-0000-0000-0000-000000000001';
    const response = await post(origin, '/api/v1/avaliacoes-satisfacao', {
      rating: 5, topicIds: [id, id],
    });
    assert.equal(response.status, 201);
  });
  assert.equal(params[2], 'Totem Saida 01');
  assert.deepEqual(params[1], ['00000000-0000-0000-0000-000000000001']);
});

test('inactive satisfaction topics are rejected before recording', async () => {
  let recorded = false;
  await withServer({ query: async (sql) => {
    if (sql.includes('registrar_satisfacao')) recorded = true;
    return { rows: [] };
  } }, async (origin) => {
    const response = await post(origin, '/api/v1/avaliacoes-satisfacao', {
      rating: 4, topicIds: ['00000000-0000-0000-0000-000000000001'],
    });
    assert.equal(response.status, 400);
  });
  assert.equal(recorded, false);
});

test('pedagogical submission sends consent and contact to the RPC', async () => {
  let params;
  await withServer({ query: async (_sql, values) => {
    params = values;
    return { rows: [{ result: { protocol: 'PED-2026-123456', evaluatedAt: '2026-11-27T12:00:00Z' } }] };
  } }, async (origin) => {
    const response = await post(origin, '/api/v1/avaliacoes-pedagogicas', pedagogical);
    assert.equal(response.status, 201);
  });
  assert.equal(params[8], true);
  assert.equal(params[9], 'phone');
  assert.equal(params[10], '8133334444');
  assert.equal(params[11], 'Formulario Pedagogico Web');
});

test('pedagogical contact requires explicit authorization', async () => {
  let calls = 0;
  await withServer({ query: async () => { calls++; throw Error('should not run'); } }, async (origin) => {
    const response = await post(origin, '/api/v1/avaliacoes-pedagogicas', {
      ...pedagogical, interestedInFutureVisits: false,
    });
    assert.equal(response.status, 400);
  });
  assert.equal(calls, 0);
});

test('database failures never expose internal messages or submitted contact', async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    await withServer({ query: async () => { throw Error('private database password'); } }, async (origin) => {
      const response = await post(origin, '/api/v1/avaliacoes-pedagogicas', pedagogical);
      assert.equal(response.status, 503);
      const body = await response.text();
      assert.doesNotMatch(body, /private database password|8133334444/);
      assert.match(body, /SERVICE_UNAVAILABLE/);
    });
  } finally {
    console.error = originalError;
  }
});
