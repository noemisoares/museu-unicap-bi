class InputError extends Error {}

function object(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new InputError('Envie um objeto JSON.');
  }
  return value;
}

function keys(value, allowed) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new InputError('Campo não permitido.');
  }
}

function choice(value, allowed, field) {
  if (!allowed.includes(value)) throw new InputError(`${field} inválido.`);
  return value;
}

function text(value, field, maxLength, optional = false) {
  if (optional && (value === null || value === undefined || value === '')) return null;
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new InputError(`${field} inválido.`);
  }
  return value.trim();
}

function integer(value, field, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new InputError(`${field} inválido.`);
  }
  return value;
}

function boolean(value, field) {
  if (typeof value !== 'boolean') throw new InputError(`${field} inválido.`);
  return value;
}

function validateCheckIn(payload) {
  const input = object(payload);
  keys(input, [
    'visitType', 'visitorCount', 'visitorAgeRange', 'institutionalBond',
    'federationUnit', 'municipality', 'neighborhood', 'contact',
  ]);
  const federationUnit = text(input.federationUnit, 'UF', 5).toUpperCase();
  if (federationUnit !== 'OUTRO' && !/^[A-Z]{2}$/.test(federationUnit)) {
    throw new InputError('UF inválida.');
  }
  const municipality = text(input.municipality, 'Município', 100);
  const neighborhood = text(input.neighborhood, 'Bairro', 100, true);
  if (municipality !== 'Recife' && neighborhood !== null) {
    throw new InputError('Bairro permitido apenas para Recife.');
  }

  let contact = null;
  if (input.contact !== null && input.contact !== undefined) {
    const submittedContact = object(input.contact);
    keys(submittedContact, ['phone', 'email', 'communicationConsent']);
    const communicationConsent = boolean(submittedContact.communicationConsent, 'Consentimento');
    const phone = text(submittedContact.phone, 'Telefone', 30, true);
    const email = text(submittedContact.email, 'E-mail', 254, true);
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new InputError('E-mail inválido.');
    }
    const phoneDigits = phone?.replace(/\D/g, '').length ?? 0;
    if (phone && (!/^\+?[\d\s().-]+$/.test(phone) || phoneDigits < 8 || phoneDigits > 15)) {
      throw new InputError('Telefone inválido.');
    }
    if (communicationConsent && !phone && !email) {
      throw new InputError('Informe um meio de contato para autorizar a comunicação.');
    }
    contact = communicationConsent ? { phone, email, communicationConsent } : null;
  }

  return {
    visitType: choice(input.visitType, ['individual', 'familia', 'escola', 'academico'], 'Tipo de visita'),
    visitorCount: integer(input.visitorCount, 'Quantidade de visitantes', 1, 10000),
    visitorAgeRange: choice(input.visitorAgeRange, ['crianca', 'jovem', 'adulto', 'senior'], 'Faixa etária'),
    institutionalBond: choice(input.institutionalBond, ['comunidade', 'aluno', 'professor', 'egresso'], 'Vínculo'),
    federationUnit,
    municipality,
    neighborhood,
    contact,
  };
}

function validateSatisfaction(payload) {
  const input = object(payload);
  keys(input, ['rating', 'topicIds']);
  const rating = integer(input.rating, 'Nota', 1, 5);
  if (!Array.isArray(input.topicIds) || input.topicIds.length > 20) {
    throw new InputError('Tópicos inválidos.');
  }
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!input.topicIds.every((id) => typeof id === 'string' && uuid.test(id))) {
    throw new InputError('Tópicos inválidos.');
  }
  return { rating, topicIds: [...new Set(input.topicIds)] };
}

function validatePedagogical(payload) {
  const input = object(payload);
  keys(input, [
    'institutionName', 'network', 'cycles', 'studentCount',
    'curriculumAlignmentScore', 'mediatorsRating', 'materialsRating',
    'suggestions', 'interestedInFutureVisits', 'contactChannel', 'contactValue',
  ]);
  const allowedCycles = ['fund1', 'fund2', 'medio', 'eja', 'superior'];
  if (!Array.isArray(input.cycles) || input.cycles.length === 0 ||
      !input.cycles.every((cycle) => allowedCycles.includes(cycle))) {
    throw new InputError('Ciclos de ensino inválidos.');
  }
  const interestedInFutureVisits = boolean(input.interestedInFutureVisits, 'Autorização de contato');
  const contactChannel = input.contactChannel === null
    ? null : choice(input.contactChannel, ['whatsapp', 'phone'], 'Canal de contato');
  const contactValue = text(input.contactValue, 'Contato', 100, true);
  if (Boolean(contactChannel) !== Boolean(contactValue)) {
    throw new InputError('Informe canal e telefone juntos.');
  }
  if (!interestedInFutureVisits && contactValue) {
    throw new InputError('Autorize o contato antes de informar o telefone.');
  }
  return {
    institutionName: text(input.institutionName, 'Instituição', 200),
    network: choice(input.network, ['estadual', 'municipal', 'privada', 'federal'], 'Rede'),
    cycles: [...new Set(input.cycles)],
    studentCount: integer(input.studentCount, 'Quantidade de estudantes', 1, 10000),
    curriculumAlignmentScore: integer(input.curriculumAlignmentScore, 'Nota do currículo', 1, 5),
    mediatorsRating: choice(input.mediatorsRating, ['excelente', 'muito_bom', 'regular', 'insuficiente'], 'Avaliação dos mediadores'),
    materialsRating: choice(input.materialsRating, ['adequado', 'inadequado', 'nao_utilizado'], 'Avaliação dos materiais'),
    suggestions: text(input.suggestions, 'Sugestões', 1000, true),
    interestedInFutureVisits,
    contactChannel,
    contactValue,
  };
}

module.exports = { InputError, validateCheckIn, validateSatisfaction, validatePedagogical };
