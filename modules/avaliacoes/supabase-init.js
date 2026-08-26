import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL.includes('PREENCHA')) {
  throw new Error('Configuração do Supabase ausente.');
}

const TABLE = 'avd_app_state';
const RECORDS_TABLE = 'avd_records';
const DB_ID = 'db';
const REST_URL = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1`;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const importPreviewCache = new Map();
// Gravações locais invalidam o cache; a janela maior evita baixar novamente
// dezenas de milhares de avaliações durante a navegação entre telas.
const DB_CACHE_MS = 120000;
let dbCache = null;
let dbCacheExpiresAt = 0;
let dbLoadPromise = null;
let optionRecordsCache = null;
let optionRecordsCacheExpiresAt = 0;
let optionRecordsPromise = null;
const questionFields = Array.from({ length: 20 }, (_, index) => `Q${index + 1}`);
const pointFields = Array.from({ length: 20 }, (_, index) => `PT_Q${index + 1}`);
const questionLimitsByYearNumber = { 1: 10, 2: 10, 3: 10, 4: 15, 5: 15, 6: 20, 7: 20, 8: 20, 9: 20 };
const recordColumns = [
  'id', 'importacao_id', 'duplicate_key', 'avaliacao', 'unidade', 'ano', 'turma', 'disciplina', 'nome',
  'email', 'nivel', 'raca', 'inclusao', 'pontos', 'pontos_possiveis', 'percentual_acertos',
  ...questionFields.map((field) => field.toLowerCase()),
  ...pointFields.map((field) => field.toLowerCase()),
];
const normalizedRecordFieldSet = new Set([
  'id', 'importacaoId', 'AVALIACAO', 'UNIDADE', 'ANO', 'TURMA', 'DISCIPLINA', 'NOME', 'EMAIL',
  'NIVEL', 'RAÇA', 'INCLUSÃO', 'PONTOS', 'PONTOS POSSIVEIS', '% ACERTOS',
  ...questionFields, ...pointFields,
]);
const roles = {
  ADMINISTRADOR: 'ADMINISTRADOR',
  GESTOR_SEMED: 'GESTOR SEMED',
  GESTOR_UNIDADE: 'GESTOR UNIDADE',
};
const DEFAULT_ADMIN = { email: 'detic@uberabadigital.com.br' };
const screens = ['dashboard', 'relatorios', 'comparativo', 'bncc', 'curriculoMunicipal', 'importacoes', 'qualidade', 'admin', 'habilidadesAplicadas', 'analise'];
const filterMap = {
  avaliacao: 'AVALIACAO',
  unidade: 'UNIDADE',
  ano: 'ANO',
  turma: 'TURMA',
  disciplina: 'DISCIPLINA',
  aluno: 'NOME',
  nivel: 'NIVEL',
  raca: 'RAÇA',
  inclusao: 'INCLUSÃO',
};
const filterDbColumnMap = {
  avaliacao: 'avaliacao', unidade: 'unidade', ano: 'ano', turma: 'turma', disciplina: 'disciplina',
  aluno: 'nome', nivel: 'nivel', raca: 'raca', inclusao: 'inclusao',
};
const optionRecordColumns = ['id', 'avaliacao', 'unidade', 'ano', 'turma', 'disciplina', 'nome', 'nivel', 'raca', 'inclusao'];
const filterOrder = ['avaliacao', 'unidade', 'ano', 'turma', 'disciplina', 'aluno', 'nivel', 'raca', 'inclusao'];
const questionAnalysisFilterOrder = ['avaliacao', 'ano', 'disciplina', 'questao'];

function seed() {
  const now = new Date().toISOString();
  const permissions = Object.fromEntries(Object.values(roles).map((role) => [role, Object.fromEntries(screens.map((screen) => [screen, true]))]));
  permissions[roles.GESTOR_SEMED].admin = false;
  permissions[roles.GESTOR_SEMED].importacoes = false;
  permissions[roles.GESTOR_UNIDADE].admin = false;
  permissions[roles.GESTOR_UNIDADE].importacoes = false;
  permissions[roles.GESTOR_UNIDADE].comparativo = false;
  permissions[roles.GESTOR_UNIDADE].analise = false;
  return {
    version: 2,
    users: [
      { id: id('usr_'), unidadeEscolar: 'SEMED', email: DEFAULT_ADMIN.email, perfil: roles.ADMINISTRADOR, ativo: true, criadoEm: now, atualizadoEm: now },
      { id: id('usr_'), unidadeEscolar: 'SEMED', email: 'gestor.semed@semed.local', perfil: roles.GESTOR_SEMED, ativo: true, criadoEm: now, atualizadoEm: now },
    ],
    permissions,
    records: [],
    importPreviews: [],
    habilidadesAplicadas: [],
    imports: [],
    logs: [],
    refreshTokens: [],
  };
}

function id(prefix = '') {
  return `${prefix}${crypto.randomUUID()}`;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function ensureDb(value) {
  const base = seed();
  const db = value && typeof value === 'object' ? value : {};
  let changed = !value || typeof value !== 'object';
  for (const [key, val] of Object.entries(base)) {
    if (Array.isArray(val) && !Array.isArray(db[key])) {
      db[key] = val;
      changed = true;
    } else if (!Array.isArray(val) && (!db[key] || typeof db[key] !== 'object')) {
      db[key] = val;
      changed = true;
    }
  }
  db.permissions ||= base.permissions;
  for (const role of Object.values(roles)) {
    db.permissions[role] ||= {};
    for (const screen of screens) {
      if (!(screen in db.permissions[role])) {
        db.permissions[role][screen] = true;
        changed = true;
      }
    }
  }
  const existingAdmin = db.users.find((user) => normalizeEmail(user.email) === DEFAULT_ADMIN.email)
    || db.users.find((user) => user.perfil === roles.ADMINISTRADOR && normalizeEmail(user.email) === 'admin@semed.local');
  if (existingAdmin && (normalizeEmail(existingAdmin.email) !== DEFAULT_ADMIN.email || existingAdmin.ativo !== true || existingAdmin.senha || existingAdmin.password)) {
    existingAdmin.email = DEFAULT_ADMIN.email;
    delete existingAdmin.senha;
    delete existingAdmin.password;
    delete existingAdmin.senhaHash;
    existingAdmin.ativo = true;
    existingAdmin.atualizadoEm = new Date().toISOString();
    changed = true;
  }
  for (const admin of base.users) {
    const existing = db.users.find((user) => normalizeEmail(user.email) === admin.email);
    if (!existing) {
      db.users.push(admin);
      changed = true;
    }
  }
  for (const account of db.users) {
    for (const field of ['senha', 'password', 'senhaHash']) {
      if (field in account) { delete account[field]; changed = true; }
    }
  }
  return { db, changed };
}

function supabaseError(error) {
  const message = error?.message || String(error || '');
  if (message.includes('Failed to fetch') || error instanceof TypeError) {
    return { status: 503, error: 'Não foi possível acessar o Supabase.', detail: `Falha de conexão com ${SUPABASE_URL}. Confira se o projeto está ativo e se o supabase.sql foi executado.` };
  }
  return { status: 500, error: 'Falha ao acessar Supabase.', detail: message };
}

async function supabaseRequest(path, options = {}) {
  let response;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    response = await fetch(`${REST_URL}${path}`, {
      ...options,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session?.access_token || SUPABASE_ANON_KEY}`,
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    throw supabaseError(error);
  }
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }
  if (!response.ok) {
    throw {
      status: response.status,
      error: payload?.message || payload?.error || 'Falha ao acessar Supabase.',
      detail: payload?.details || payload?.hint || text,
    };
  }
  return payload;
}

async function readDb() {
  if (dbCache && Date.now() < dbCacheExpiresAt) return dbCache;
  if (dbLoadPromise) return dbLoadPromise;
  dbLoadPromise = loadDbFresh();
  try {
    return await dbLoadPromise;
  } finally {
    dbLoadPromise = null;
  }
}

async function loadDbFresh() {
  const rows = await supabaseRequest(`/${TABLE}?select=value&id=eq.${encodeURIComponent(DB_ID)}&limit=1`);
  const data = Array.isArray(rows) ? rows[0] : null;
  const normalized = ensureDb(data?.value || seed());
  if (!data || normalized.changed) await writeDb(normalized.db);
  try {
    normalized.db.records = await readRecords();
    normalized.db.recordsExternal = true;
    delete normalized.db.recordsSetupError;
  } catch (error) {
    if (!isMissingRecordsTable(error)) throw error;
    normalized.db.records = Array.isArray(normalized.db.records) ? normalized.db.records : [];
    normalized.db.recordsExternal = false;
    normalized.db.recordsSetupError = 'Execute o supabase.sql atualizado no Supabase para criar a tabela avd_records antes de importar planilhas.';
  }
  dbCache = normalized.db;
  dbCacheExpiresAt = Date.now() + DB_CACHE_MS;
  return normalized.db;
}

async function readStateDb() {
  const rows = await supabaseRequest(`/${TABLE}?select=value&id=eq.${encodeURIComponent(DB_ID)}&limit=1`);
  const data = Array.isArray(rows) ? rows[0] : null;
  const normalized = ensureDb(data?.value || seed());
  normalized.db.records = [];
  normalized.db.recordsExternal = true;
  if (!data || normalized.changed) await writeStateDb(normalized.db);
  return normalized.db;
}

async function writeStateDb(db) {
  const normalized = ensureDb(db);
  const stateDb = { ...normalized.db, records: [], importPreviews: [] };
  await supabaseRequest(`/${TABLE}`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: DB_ID, value: stateDb, updated_at: new Date().toISOString() }),
  });
  if (dbCache?.records) {
    const cachedRecords = dbCache.records;
    dbCache = { ...normalized.db, records: cachedRecords, recordsExternal: true };
    dbCacheExpiresAt = Date.now() + DB_CACHE_MS;
  }
}

async function writeDb(db) {
  const normalized = ensureDb(db);
  const stateDb = { ...normalized.db, records: [], importPreviews: [] };
  await supabaseRequest(`/${TABLE}`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: DB_ID, value: stateDb, updated_at: new Date().toISOString() }),
  });
  dbCache = { ...normalized.db, records: db.records || [] };
  dbCacheExpiresAt = Date.now() + DB_CACHE_MS;
  return dbCache;
}

function invalidateDbCache() {
  dbCache = null;
  dbCacheExpiresAt = 0;
  optionRecordsCache = null;
  optionRecordsCacheExpiresAt = 0;
}

async function readOptionRecords(user) {
  const scopeKey = `${user?.perfil || ''}|${user?.unidadeEscolar || ''}`;
  if (optionRecordsCache?.scopeKey === scopeKey && Date.now() < optionRecordsCacheExpiresAt) return optionRecordsCache.rows;
  if (optionRecordsPromise?.scopeKey === scopeKey) return optionRecordsPromise.promise;
  const promise = readRecords({}, user, optionRecordColumns);
  optionRecordsPromise = { scopeKey, promise };
  try {
    const rows = await promise;
    optionRecordsCache = { scopeKey, rows };
    optionRecordsCacheExpiresAt = Date.now() + DB_CACHE_MS;
    return rows;
  } finally {
    optionRecordsPromise = null;
  }
}

function isMissingRecordsTable(error) {
  const text = `${error?.error || ''} ${error?.detail || ''} ${error?.message || ''}`;
  return error?.status === 404 || text.includes(RECORDS_TABLE) || text.includes('schema cache') || text.includes('Could not find') || (text.includes('column') && text.includes('does not exist'));
}

async function readRecords(filters = {}, user = null, columns = recordColumns) {
  const records = [];
  const pageSize = 1000;
  const serverFilters = [];
  for (const [key, column] of Object.entries(filterDbColumnMap)) {
    const value = filters[key];
    if (value && !Array.isArray(value) && key !== 'disciplina') {
      serverFilters.push(`${column}=eq.${encodeURIComponent(value)}`);
    }
  }
  if (user?.perfil === roles.GESTOR_UNIDADE && user.unidadeEscolar) {
    serverFilters.push(`unidade=eq.${encodeURIComponent(user.unidadeEscolar)}`);
  }
  const filterSuffix = serverFilters.length ? `&${serverFilters.join('&')}` : '';
  for (let offset = 0; ; offset += pageSize) {
    let rows;
    try {
      rows = await supabaseRequest(`/${RECORDS_TABLE}?select=${columns.join(',')}${filterSuffix}&order=id.asc`, {
        headers: {
          Range: `${offset}-${offset + pageSize - 1}`,
        },
      });
    } catch (error) {
      if (isMissingRecordsTable(error)) {
        throw { status: 500, error: 'Tabela de registros não encontrada.', detail: 'Execute o supabase.sql atualizado no Supabase para criar a tabela avd_records antes de importar planilhas.' };
      }
      throw error;
    }
    for (const row of rows || []) {
      records.push(recordFromDb(row));
    }
    if (!rows || rows.length < pageSize) break;
  }
  return records;
}

async function upsertRecords(rows, { invalidate = true } = {}) {
  const chunkSize = 500;
  const chunks = [];
  for (let index = 0; index < rows.length; index += chunkSize) {
    chunks.push(rows.slice(index, index + chunkSize).map(recordToDb));
  }
  let nextChunk = 0;
  async function uploadWorker() {
    while (nextChunk < chunks.length) {
      const chunk = chunks[nextChunk++];
      await uploadRecordChunk(chunk);
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, chunks.length) }, () => uploadWorker()));
  if (invalidate) invalidateDbCache();
}

async function uploadRecordChunk(chunk) {
  try {
    await supabaseRequest(`/${RECORDS_TABLE}?on_conflict=id`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(chunk),
    });
  } catch (error) {
    if (isMissingRecordsTable(error)) {
      throw { status: 500, error: 'Tabela de registros não encontrada.', detail: 'Execute o supabase.sql atualizado no Supabase para criar a tabela avd_records antes de importar planilhas.' };
    }
    throw error;
  }
}

function recordFromDb(row) {
  const record = { ...(row.data || {}) };
  Object.assign(record, {
    id: row.id,
    importacaoId: row.importacao_id,
    AVALIACAO: row.avaliacao ?? record.AVALIACAO ?? '',
    UNIDADE: row.unidade ?? record.UNIDADE ?? '',
    ANO: row.ano ?? record.ANO ?? '',
    TURMA: row.turma ?? record.TURMA ?? '',
    DISCIPLINA: row.disciplina ?? record.DISCIPLINA ?? '',
    NOME: row.nome ?? record.NOME ?? '',
    EMAIL: row.email ?? record.EMAIL ?? '',
    NIVEL: row.nivel ?? record.NIVEL ?? '',
    RAÇA: row.raca ?? record.RAÇA ?? '',
    INCLUSÃO: row.inclusao ?? record.INCLUSÃO ?? '',
    PONTOS: Number(row.pontos ?? record.PONTOS ?? 0),
    'PONTOS POSSIVEIS': Number(row.pontos_possiveis ?? record['PONTOS POSSIVEIS'] ?? 0),
    '% ACERTOS': Number(row.percentual_acertos ?? record['% ACERTOS'] ?? 0),
  });
  for (const field of questionFields) record[field] = row[field.toLowerCase()] ?? record[field] ?? '';
  for (const field of pointFields) record[field] = Number(row[field.toLowerCase()] ?? record[field] ?? 0);
  return normalizeRecord(record);
}

function recordToDb(row) {
  const normalized = normalizeRecord(row);
  const extraData = Object.fromEntries(Object.entries(normalized).filter(([key]) => !normalizedRecordFieldSet.has(key)));
  const payload = {
    id: normalized.id,
    importacao_id: normalized.importacaoId,
    duplicate_key: storageRecordKey(normalized),
    avaliacao: emptyToNull(normalized.AVALIACAO),
    unidade: emptyToNull(normalized.UNIDADE),
    ano: emptyToNull(normalized.ANO),
    turma: emptyToNull(normalized.TURMA),
    disciplina: emptyToNull(normalized.DISCIPLINA),
    nome: emptyToNull(normalized.NOME),
    email: emptyToNull(normalized.EMAIL),
    nivel: emptyToNull(normalized.NIVEL),
    raca: emptyToNull(normalized.RAÇA),
    inclusao: emptyToNull(normalized.INCLUSÃO),
    pontos: Number(normalized.PONTOS || 0),
    pontos_possiveis: Number(normalized['PONTOS POSSIVEIS'] || 0),
    percentual_acertos: Number(normalized['% ACERTOS'] || 0),
    // Colunas funcionais já estão normalizadas acima. O JSON preserva somente
    // metadados/campos adicionais, evitando duplicar toda a linha no envio.
    data: extraData,
    updated_at: new Date().toISOString(),
  };
  for (const field of questionFields) payload[field.toLowerCase()] = emptyToNull(normalized[field]);
  for (const field of pointFields) payload[field.toLowerCase()] = Number(normalized[field] || 0);
  return payload;
}

function emptyToNull(value) {
  const text = String(value ?? '').trim();
  return text ? text : null;
}

async function deleteRecordsByImport(importId) {
  try {
    await supabaseRequest(`/${RECORDS_TABLE}?importacao_id=eq.${encodeURIComponent(importId)}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    });
  } catch (error) {
    if (isMissingRecordsTable(error)) return;
    throw error;
  }
  invalidateDbCache();
}

function parseToken(token) {
  const value = String(token || '');
  if (value.startsWith('avd:')) return value.split(':')[1] || null;
  const legacy = value.match(/^avd-(.+)-\d+$/);
  return legacy?.[1] || null;
}

function currentUser(db, token) {
  const userId = parseToken(token);
  return db.users.find((user) => user.id === userId && user.ativo) || null;
}

function publicUser(user) {
  const { senha, senhaHash, password, ...safe } = user;
  return safe;
}

function log(db, user, acao, detalhes = {}) {
  db.logs.unshift({ id: id('log_'), usuarioId: user?.id || null, usuarioEmail: user?.email || null, acao, detalhes, criadoEm: new Date().toISOString() });
  db.logs = db.logs.slice(0, 5000);
}

function canSee(db, user, screen) {
  return Boolean(user?.ativo) && db.permissions?.[user.perfil]?.[screen] !== false;
}

function recordsForUser(db, user) {
  if (user.perfil === roles.GESTOR_UNIDADE) {
    const userUnit = normalizedComparable(user.unidadeEscolar);
    if (!userUnit) return [];
    return db.records.filter((row) => normalizedComparable(row.UNIDADE) === userUnit);
  }
  return db.records || [];
}

async function centralEvaluationIdentity() {
  const guard = await window.SEMED_MODULE_ACCESS;
  const context = guard?.context;
  const moduleAccess = context?.modules?.find((item) => item.code === 'avaliacoes');
  if (!context?.user?.active || !moduleAccess?.permissions?.view) throw { status: 403, error: 'Perfil corporativo sem acesso ao módulo Avaliações.' };
  const profileCodes = new Set((context.profiles || []).map((profile) => profile.code));
  const perfil = context.portal_admin ? roles.ADMINISTRADOR
    : profileCodes.has('GESTOR_SEMED') || profileCodes.has('AVALIACOES_GESTOR') ? roles.GESTOR_SEMED
    : roles.GESTOR_UNIDADE;
  return { context, moduleAccess, perfil };
}

async function ensureCentralEvaluationUser(db) {
  const { context, moduleAccess, perfil } = await centralEvaluationIdentity();
  const email = normalizeEmail(context.user.email);
  let user = db.users.find((item) => normalizeEmail(item.email) === email);
  const now = new Date().toISOString();
  if (!user) {
    user = { id: id('usr_'), unidadeEscolar: moduleAccess.scope?.unidade || 'SEMED', email, perfil, ativo: true, criadoEm: now, atualizadoEm: now };
    db.users.push(user);
  } else {
    Object.assign(user, { email, perfil, ativo: true, atualizadoEm: now });
    if (moduleAccess.scope?.unidade) user.unidadeEscolar = moduleAccess.scope.unidade;
    delete user.senha; delete user.password; delete user.senhaHash;
  }
  return user;
}

function applyFilters(records, filters = {}) {
  return records.filter((row) => Object.entries(filterMap).every(([key, field]) => {
    const value = filters[key];
    if (!value || (Array.isArray(value) && !value.length)) return true;
    if (key === 'disciplina') return disciplineValuesMatch(row[field], value);
    return valuesMatch(row[field], value);
  }));
}

function filteredRecords(db, user, filters = {}) {
  return applyFilters(recordsForUser(db, user), filters);
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && value !== ''))].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
}

function optionsFor(db, user, filters = {}) {
  const source = recordsForUser(db, user);
  const options = {};
  for (const key of filterOrder) {
    const scoped = applyFilters(source, parentFilters(filters, key));
    options[key] = unique(scoped.map((row) => row[filterMap[key]]));
  }
  return { options, total: applyFilters(source, filters).length };
}

function parentFilters(filters, key) {
  const result = {};
  for (const item of filterOrder) {
    if (item === key) break;
    if (filters[item]) result[item] = filters[item];
  }
  return result;
}

function dashboard(records, filters = {}) {
  const total = records.length;
  const pontos = sum(records, 'PONTOS');
  const possiveis = sum(records, 'PONTOS POSSIVEIS');
  const percentual = possiveis ? round((pontos / possiveis) * 100) : 0;
  const alunosPorNivel = groupCount(records, 'NIVEL');
  const hasDisciplineFilter = Boolean(filters.disciplina && (!Array.isArray(filters.disciplina) || filters.disciplina.length));
  return {
    kpis: { totalAlunos: total, pontosPossiveis: possiveis, acertos: pontos, percentualAcertos: percentual },
    alunosPorNivel,
    desempenhoPorQuestao: questionPerformance(records),
    distribuicaoPercentualNivel: alunosPorNivel.map((item) => ({ ...item, percent: total ? round((item.value / total) * 100) : 0 })),
    rankingUnidades: hasDisciplineFilter ? ranking(records, 'UNIDADE') : rankingByUnitAndDiscipline(records),
    rankingTurmas: ranking(records, 'TURMA'),
  };
}

function sum(rows, field) {
  return rows.reduce((total, row) => total + Number(row[field] || 0), 0);
}

function round(value, digits = 1) {
  return Math.round(Number(value || 0) * 10 ** digits) / 10 ** digits;
}

function groupCount(rows, field) {
  const map = new Map();
  for (const row of rows) map.set(row[field] || 'Não informado', (map.get(row[field] || 'Não informado') || 0) + 1);
  return [...map.entries()].map(([label, value]) => ({ label, value }));
}

function ranking(rows, field) {
  const map = new Map();
  for (const row of rows) {
    const key = row[field] || 'Não informado';
    const item = map.get(key) || { label: key, alunos: 0, pontos: 0, possiveis: 0 };
    item.alunos += 1;
    item.pontos += Number(row.PONTOS || 0);
    item.possiveis += Number(row['PONTOS POSSIVEIS'] || 0);
    map.set(key, item);
  }
  return [...map.values()]
    .map((item) => ({ ...item, percentual: item.possiveis ? round((item.pontos / item.possiveis) * 100) : 0 }))
    .sort((a, b) => b.percentual - a.percentual);
}

function rankingByUnitAndDiscipline(rows) {
  const map = new Map();
  for (const row of rows) {
    const unidade = row.UNIDADE || 'Não informado';
    const disciplina = row.DISCIPLINA || 'Sem disciplina';
    const key = `${unidade}|${disciplina}`;
    const item = map.get(key) || { label: `${unidade} - ${disciplina}`, unidade, disciplina, alunos: 0, pontos: 0, possiveis: 0 };
    item.alunos += 1;
    item.pontos += Number(row.PONTOS || 0);
    item.possiveis += Number(row['PONTOS POSSIVEIS'] || 0);
    map.set(key, item);
  }
  return [...map.values()]
    .map((item) => ({ ...item, percentual: item.possiveis ? round((item.pontos / item.possiveis) * 100) : 0 }))
    .sort((a, b) => String(a.unidade).localeCompare(String(b.unidade), 'pt-BR') || String(a.disciplina).localeCompare(String(b.disciplina), 'pt-BR'));
}

function questionPerformance(records) {
  const limit = questionLimitForRecords(records);
  return Array.from({ length: limit }, (_, index) => {
    const q = `Q${index + 1}`;
    const pt = `PT_Q${index + 1}`;
    const avaliados = records.filter((row) => row[q] !== undefined && row[q] !== '').length;
    const acertos = sum(records, pt);
    const context = questionPriorityContext(records, q, pt);
    return {
      label: q,
      questao: q,
      avaliados,
      acertos,
      percentual: avaliados ? round((acertos / avaliados) * 100) : 0,
      ano: context?.ano || '',
      disciplina: context?.disciplina || '',
      contextoPercentual: context?.percentual ?? null,
      contextoAvaliados: context?.avaliados || 0,
      contextoAcertos: context?.acertos || 0,
    };
  });
}

function questionLimitForRecords(records) {
  const years = unique(records.map((row) => yearNumber(row.ANO))).filter(Boolean);
  if (years.length === 1) return questionLimitsByYearNumber[years[0]] || 20;
  return 20;
}

function yearNumber(value) {
  const match = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function questionPriorityContext(records, questionField, pointField) {
  const groups = new Map();
  for (const row of records) {
    if (row[questionField] === undefined || row[questionField] === '') continue;
    const ano = row.ANO || 'Ano não informado';
    const disciplina = row.DISCIPLINA || 'Disciplina não informada';
    const key = `${ano}|${disciplina}`;
    const item = groups.get(key) || { ano, disciplina, avaliados: 0, acertos: 0, percentual: 0 };
    item.avaliados += 1;
    item.acertos += Number(row[pointField] || 0);
    item.percentual = item.avaliados ? round((item.acertos / item.avaliados) * 100) : 0;
    groups.set(key, item);
  }
  return [...groups.values()]
    .filter((item) => item.avaliados)
    .sort((a, b) => a.percentual - b.percentual || b.avaliados - a.avaliados)[0] || null;
}

function tableRows(records, limit = 500) {
  const groups = new Map();
  for (const row of records) {
    const key = [row.UNIDADE, row.TURMA, row.ANO, row.DISCIPLINA, row.NIVEL].join('|');
    const item = groups.get(key) || { unidade: row.UNIDADE, turma: row.TURMA, ano: row.ANO, disciplina: row.DISCIPLINA, nivel: row.NIVEL, inclusao: row.INCLUSÃO, alunos: 0, pontos: 0, acertos: 0, pontosPossiveis: 0, percentual: 0 };
    item.alunos += 1;
    item.pontos += Number(row.PONTOS || 0);
    item.acertos = item.pontos;
    item.pontosPossiveis += Number(row['PONTOS POSSIVEIS'] || 0);
    item.percentual = item.pontosPossiveis ? round((item.pontos / item.pontosPossiveis) * 100) : 0;
    groups.set(key, item);
  }
  return [...groups.values()]
    .sort((a, b) => compareTableRows(a, b))
    .slice(0, limit);
}

function compareTableRows(a, b) {
  return String(a.unidade || '').localeCompare(String(b.unidade || ''), 'pt-BR', { numeric: true }) ||
    String(a.turma || '').localeCompare(String(b.turma || ''), 'pt-BR', { numeric: true }) ||
    String(a.ano || '').localeCompare(String(b.ano || ''), 'pt-BR', { numeric: true }) ||
    String(a.disciplina || '').localeCompare(String(b.disciplina || ''), 'pt-BR') ||
    String(a.nivel || '').localeCompare(String(b.nivel || ''), 'pt-BR');
}

function diagnosticAnalysis(records) {
  const base = dashboard(records);
  const weak = base.desempenhoPorQuestao.filter((item) => item.avaliados).sort((a, b) => a.percentual - b.percentual).slice(0, 5);
  const criticos = records.filter((row) => normalizeHeader(row.NIVEL).includes('CRITICO')).length;
  return {
    resumo: {
      ...base.kpis,
      percentualGeral: base.kpis.percentualAcertos,
      percentualCritico: records.length ? round((criticos / records.length) * 100) : 0,
    },
    recomendacoes: weak.map((item) => `Priorizar retomada pedagógica da ${item.questao}, analisando descritores, distratores e padrões de erro.`),
    perguntasNorteadoras: [
      'Quais habilidades concentram menor aproveitamento nos filtros selecionados?',
      'Quais turmas precisam de reensino imediato?',
      'Quais questões indicam erro recorrente de leitura, cálculo ou conceito?',
    ],
    pontosDeAtencao: weak.map((item) => {
      const prioridade = item.percentual < 50 ? 'Alta' : item.percentual < 70 ? 'Média' : 'Monitoramento';
      const contextText = [item.disciplina, item.ano].filter(Boolean).join(' | ');
      const contextDetail = contextText ? ` Prioridade localizada em ${contextText}, com ${item.contextoPercentual}% de aproveitamento no recorte.` : '';
      return {
        tipo: prioridade,
        titulo: `${item.questao} - ${item.percentual}%`,
        indicacao: `${item.questao} apresentou ${item.percentual}% de aproveitamento geral, com ${item.acertos} acertos em ${item.avaliados} avaliações.${contextDetail} Recomenda-se retomar a habilidade correspondente e observar os distratores mais frequentes.`,
        label: item.questao,
        ano: item.ano,
        disciplina: item.disciplina,
        contextoPercentual: item.contextoPercentual,
        contextoAvaliados: item.contextoAvaliados,
        contextoAcertos: item.contextoAcertos,
        percentual: item.percentual,
        avaliados: item.avaliados,
        acertos: item.acertos,
        prioridade,
      };
    }),
    questoesPrioritarias: weak,
    turmasPrioritarias: ranking(records, 'TURMA').sort((a, b) => a.percentual - b.percentual).slice(0, 8),
    unidadesPrioritarias: ranking(records, 'UNIDADE').sort((a, b) => a.percentual - b.percentual).slice(0, 8),
  };
}

function statisticalAnalysis(records) {
  const scores = records.map((row) => Number(row['% ACERTOS'] || 0) * 100).filter(Number.isFinite);
  const sorted = [...scores].sort((a, b) => a - b);
  const media = scores.length ? round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const mediana = sorted.length ? round(sorted[Math.floor(sorted.length / 2)]) : 0;
  const variance = scores.length ? scores.reduce((acc, value) => acc + (value - media) ** 2, 0) / scores.length : 0;
  return {
    resumo: {
      mediaPercentual: media,
      medianaPercentual: mediana,
      desvioPadraoPercentual: round(Math.sqrt(variance)),
      minimoPercentual: sorted.length ? round(sorted[0]) : 0,
      maximoPercentual: sorted.length ? round(sorted[sorted.length - 1]) : 0,
      totalRegistros: records.length,
    },
    distribuicaoNivel: groupCount(records, 'NIVEL'),
    questoes: questionPerformance(records),
    unidades: ranking(records, 'UNIDADE'),
    turmas: ranking(records, 'TURMA'),
  };
}

function comparisonByEvaluation(records, evaluations = []) {
  const selected = evaluations.length ? evaluations : unique(records.map((row) => row.AVALIACAO));
  const disciplines = unique(records.map((row) => canonicalDiscipline(row.DISCIPLINA)).filter(Boolean));
  const units = unique(records.map((row) => row.UNIDADE));
  return {
    evaluations: selected,
    disciplines,
    rows: units.map((unit) => {
      const row = { unidade: unit };
      for (const evaluation of selected) {
        row[evaluation] = {};
        for (const discipline of disciplines) {
          const scoped = records.filter((item) => (
            valuesMatch(item.UNIDADE, unit) &&
            valuesMatch(item.AVALIACAO, evaluation) &&
            disciplineComparable(item.DISCIPLINA) === disciplineComparable(discipline)
          ));
          const possiveis = sum(scoped, 'PONTOS POSSIVEIS');
          row[evaluation][discipline] = {
            percentual: possiveis ? round((sum(scoped, 'PONTOS') / possiveis) * 100) : 0,
            alunos: scoped.length,
          };
        }
      }
      return row;
    }),
  };
}

function canonicalDiscipline(value) {
  const comparable = disciplineComparable(value);
  if (comparable === 'LINGUAPORTUGUESA') return 'LINGUA PORTUGUESA';
  if (comparable === 'MATEMATICA') return 'MATEMATICA';
  return String(value || '').trim();
}

function quality(records) {
  const fields = ['ANO', 'DISCIPLINA', 'UNIDADE', 'TURMA', 'NOME', 'PONTOS', 'PONTOS POSSIVEIS', '% ACERTOS', 'NIVEL', 'AVALIACAO', 'EMAIL'];
  return { total: records.length, duplicates: 0, emptyByField: Object.fromEntries(fields.map((field) => [field, records.filter((row) => !row[field]).length])) };
}

function normalizeHeader(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ºª]/g, 'O')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function normalizedComparable(value) {
  return normalizeHeader(value).replace(/[^A-Z0-9]/g, '');
}

function valuesMatch(actual, expected) {
  const values = Array.isArray(expected) ? expected : [expected];
  const normalizedActual = normalizedComparable(actual);
  return values.some((value) => {
    if (value === undefined || value === null || value === '') return true;
    return normalizedActual === normalizedComparable(value);
  });
}

function disciplineComparable(value) {
  const normalized = normalizedComparable(value);
  if (['PORTUGUES', 'LINGUAPORTUGUESA', 'LINGUAPORTUGUES', 'LP'].includes(normalized)) return 'LINGUAPORTUGUESA';
  if (['MATEMATICA', 'MATEMATICA'].includes(normalized)) return 'MATEMATICA';
  return normalized;
}

function disciplineValuesMatch(actual, expected) {
  const values = Array.isArray(expected) ? expected : [expected];
  const normalizedActual = disciplineComparable(actual);
  return values.some((value) => {
    if (value === undefined || value === null || value === '') return true;
    return normalizedActual === disciplineComparable(value);
  });
}

function questionFilterMatch(actual, expected) {
  if (!expected || (Array.isArray(expected) && !expected.length)) return true;
  const values = Array.isArray(expected) ? expected : [expected];
  const actualNumber = Number(String(actual || '').replace(/\D/g, ''));
  return values.some((value) => Number(String(value || '').replace(/\D/g, '')) === actualNumber);
}

function habilidadeKey(item = {}) {
  return [
    normalizedComparable(item.avaliacao),
    normalizedComparable(item.ano),
    normalizedComparable(item.disciplina),
    Number(item.questao || 0),
  ].join('|');
}

function canonicalHeader(header) {
  const normalized = normalizeHeader(header);
  const aliases = {
    AVALIACAO: 'AVALIACAO',
    'AVALIACAO DIAGNOSTICA': 'AVALIACAO',
    UNIDADE: 'UNIDADE',
    'UNIDADE ESCOLAR': 'UNIDADE',
    ESCOLA: 'UNIDADE',
    ANO: 'ANO',
    TURMA: 'TURMA',
    DISCIPLINA: 'DISCIPLINA',
    ALUNO: 'NOME',
    NOME: 'NOME',
    'NOME DO ALUNO': 'NOME',
    NIVEL: 'NIVEL',
    RACA: 'RAÇA',
    EMAIL: 'EMAIL',
    INCLUSAO: 'INCLUSÃO',
    PONTOS: 'PONTOS',
    'PONTOS POSSIVEIS': 'PONTOS POSSIVEIS',
    '% ACERTOS': '% ACERTOS',
    PERCENTUAL: '% ACERTOS',
    'PERCENTUAL DE ACERTOS': '% ACERTOS',
  };
  if (/^Q\d{1,2}$/.test(normalized)) return normalized;
  if (/^PT[_ ]?Q\d{1,2}$/.test(normalized)) return normalized.replace(' ', '_').replace(/^PTQ/, 'PT_Q');
  return aliases[normalized] || normalized;
}

function trimAfterRaca(headers) {
  const index = headers.findIndex((header) => normalizeHeader(header) === 'RACA');
  if (index < 0) return { kept: headers, ignored: [] };
  return { kept: headers.slice(0, index + 1), ignored: headers.slice(index + 1) };
}

async function readExcelFile(file) {
  if (!file) throw { status: 400, error: 'Selecione uma planilha Excel.' };
  const matrix = await readExcelMatrix(file);
  const originalHeaders = (matrix[0] || []).map((header) => String(header || '').trim());
  const { kept, ignored } = trimAfterRaca(originalHeaders);
  const headers = kept.map(canonicalHeader);
  const rows = [];
  for (let lineIndex = 1; lineIndex < matrix.length; lineIndex += 1) {
    const line = matrix[lineIndex];
    const row = Object.fromEntries(headers.map((header, index) => [header, normalizeCell(line[index])]));
    if (Object.values(row).some((value) => String(value || '').trim() !== '')) rows.push(normalizeRecord(row));
    if (lineIndex % 2000 === 0) await yieldToBrowser();
  }
  return { originalHeaders: kept, headers, rows, ignoredColumnsAfterRaca: ignored };
}

function yieldToBrowser() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });
}

async function readExcelMatrix(file) {
  if (typeof Worker !== 'undefined') {
    try {
      const worker = new Worker(new URL('./xlsx-import-worker.js?v=20260826-1', import.meta.url), { type: 'module' });
      const buffer = await file.arrayBuffer();
      return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          worker.terminate();
          reject(new Error('Tempo limite excedido ao processar a planilha.'));
        }, 180000);
        worker.onmessage = ({ data }) => {
          clearTimeout(timeout);
          worker.terminate();
          if (data?.error) reject(new Error(data.error));
          else resolve(data?.matrix || []);
        };
        worker.onerror = (event) => {
          clearTimeout(timeout);
          worker.terminate();
          reject(new Error(event.message || 'Falha no processamento em segundo plano.'));
        };
        worker.postMessage({ buffer }, [buffer]);
      });
    } catch (error) {
      console.warn('Processamento em segundo plano indisponível; usando modo compatível.', error);
    }
  }
  try {
    const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', dense: true, cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error('A planilha não possui abas para leitura.');
    return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  } catch (error) {
    throw { status: 503, error: 'Não foi possível carregar o leitor de Excel.', detail: error.message || 'Verifique a conexão com a internet e tente novamente.' };
  }
}

function normalizeCell(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isInteger(value) ? value : Number(value.toFixed(4));
  return String(value).trim();
}

function normalizeRecord(row) {
  const record = { ...row };
  for (const key of Object.keys(record)) {
    if (/^Q\d{1,2}$/.test(key)) record[key] = String(record[key] || '').trim().toUpperCase();
    if (/^PT_Q\d{1,2}$/.test(key)) record[key] = Number(String(record[key] || '0').replace(',', '.')) || 0;
  }
  if (!record.PONTOS) record.PONTOS = Array.from({ length: 20 }, (_, index) => Number(record[`PT_Q${index + 1}`] || 0)).reduce((a, b) => a + b, 0);
  record.PONTOS = Number(String(record.PONTOS || '0').replace(',', '.')) || 0;
  record['PONTOS POSSIVEIS'] = Number(String(record['PONTOS POSSIVEIS'] || '0').replace(',', '.')) || Math.max(...Array.from({ length: 20 }, (_, index) => record[`Q${index + 1}`] ? index + 1 : 0), 0);
  const possible = Number(record['PONTOS POSSIVEIS'] || 0);
  if (!record['% ACERTOS']) record['% ACERTOS'] = possible ? record.PONTOS / possible : 0;
  return record;
}

function validateImportRows(rows, headers) {
  const required = ['AVALIACAO', 'UNIDADE', 'ANO', 'TURMA', 'DISCIPLINA', 'NOME', 'EMAIL'];
  const schemaWarnings = [];
  const validationErrors = [];
  for (const field of required) {
    if (!headers.includes(field)) {
      schemaWarnings.push({ severity: 'erro', category: 'Coluna obrigatória', row: '-', column: field, message: `Coluna obrigatória ausente: ${field}.` });
    }
  }
  const known = new Set([...required, 'NIVEL', 'RAÇA', 'INCLUSÃO', 'PONTOS', 'PONTOS POSSIVEIS', '% ACERTOS', ...Array.from({ length: 20 }, (_, index) => `Q${index + 1}`), ...Array.from({ length: 20 }, (_, index) => `PT_Q${index + 1}`)]);
  for (const header of headers) {
    if (!known.has(header)) schemaWarnings.push({ severity: 'alerta', category: 'Configuração diferente', row: '-', column: header, message: `Campo fora do padrão reconhecido: ${header}. Ele será preservado no registro.` });
  }
  rows.slice(0, 200).forEach((row, index) => {
    for (const field of required) {
      if (!row[field]) validationErrors.push({ severity: 'erro', category: 'Campo vazio', row: index + 2, column: field, message: `Linha ${index + 2}: campo obrigatório vazio.` });
    }
  });
  return { schemaWarnings, validationErrors };
}

function duplicateKey(row) {
  return ['NOME', 'AVALIACAO', 'TURMA', 'UNIDADE', 'DISCIPLINA'].map((field) => normalizeEmail(row[field])).join('|');
}

function storageRecordKey(row) {
  return [duplicateKey(row), row.importacaoId || 'sem-importacao', row.importRowNumber || row.id || id('linha_')].join('|');
}

async function previewImport(db, user, form) {
  const file = form?.get?.('file');
  const parsed = await readExcelFile(file);
  const checks = validateImportRows(parsed.rows, parsed.headers);
  const existing = await existingDuplicateKeys();
  const seen = new Set();
  let duplicates = 0;
  for (const row of parsed.rows) {
    const key = duplicateKey(row);
    if (seen.has(key) || existing.has(key)) duplicates += 1;
    seen.add(key);
  }
  const previewId = id('prev_');
  for (const [key, preview] of importPreviewCache.entries()) {
    if (preview.usuarioEmail === user.email) importPreviewCache.delete(key);
  }
  importPreviewCache.set(previewId, {
    id: previewId,
    usuarioEmail: user.email,
    nomeArquivo: file?.name || 'planilha.xlsx',
    headers: parsed.headers,
    rows: parsed.rows,
    criadaEm: new Date().toISOString(),
  });
  return {
    previewId,
    fileName: file?.name || 'planilha.xlsx',
    headers: parsed.headers,
    totalRows: parsed.rows.length,
    sample: parsed.rows.slice(0, 20),
    duplicates,
    ignoredColumnsAfterRaca: parsed.ignoredColumnsAfterRaca,
    schemaWarnings: checks.schemaWarnings,
    validationErrors: checks.validationErrors,
  };
}

async function existingDuplicateKeys() {
  if (dbCache?.records?.length && Date.now() < dbCacheExpiresAt) {
    return new Set(dbCache.records.map(duplicateKey));
  }
  const keys = new Set();
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const rows = await supabaseRequest(`/${RECORDS_TABLE}?select=duplicate_key&order=id.asc`, {
      headers: { Range: `${offset}-${offset + pageSize - 1}` },
    });
    for (const row of rows || []) {
      const parts = String(row.duplicate_key || '').split('|');
      keys.add(parts.length > 2 ? parts.slice(0, -2).join('|') : String(row.duplicate_key || ''));
    }
    if (!rows || rows.length < pageSize) break;
  }
  return keys;
}

async function commitImport(db, user, previewId) {
  if (db.recordsExternal !== true) {
    throw { status: 500, error: 'Tabela de registros não encontrada.', detail: db.recordsSetupError || 'Execute o supabase.sql atualizado no Supabase para criar a tabela avd_records antes de importar planilhas.' };
  }
  const preview = importPreviewCache.get(previewId) || (db.importPreviews || []).find((item) => item.id === previewId && item.usuarioEmail === user.email);
  if (!preview) throw { status: 404, error: 'Conferência não encontrada. Confira a planilha novamente.' };
  const importId = id('imp_');
  const recordsToSave = [];
  let novosRegistros = preview.rows.length;
  let registrosAtualizados = 0;
  const importedAt = new Date().toISOString();
  preview.rows.forEach((row, index) => {
    const created = {
      id: id('rec_'),
      ...row,
      importacaoId: importId,
      importRowNumber: index + 2,
      originalDuplicateKey: duplicateKey(row),
      criadoEm: importedAt,
      atualizadoEm: importedAt,
    };
    recordsToSave.push(created);
  });
  const importInfo = {
    id: importId,
    nomeArquivo: preview.nomeArquivo,
    quantidadeRegistros: preview.rows.length,
    novosRegistros,
    registrosAtualizados,
    usuarioEmail: user.email,
    criadaEm: importedAt,
  };
  const importedPoints = sum(recordsToSave, 'PONTOS');
  const importedPossible = sum(recordsToSave, 'PONTOS POSSIVEIS');
  if (db.importSummary) {
    const totalAlunos = Number(db.importSummary.totalAlunos || 0) + recordsToSave.length;
    const acertos = Number(db.importSummary.acertos || 0) + importedPoints;
    const pontosPossiveis = Number(db.importSummary.pontosPossiveis || 0) + importedPossible;
    db.importSummary = {
      totalAlunos,
      acertos,
      pontosPossiveis,
      percentualAcertos: pontosPossiveis ? round((acertos / pontosPossiveis) * 100) : 0,
    };
  }
  db.imports.unshift(importInfo);
  db.importPreviews = (db.importPreviews || []).filter((item) => item.id !== previewId);
  importPreviewCache.delete(previewId);
  log(db, user, 'IMPORTOU_PLANILHA', importInfo);
  await upsertRecords(recordsToSave, { invalidate: false });
  optionRecordsCache = null;
  optionRecordsCacheExpiresAt = 0;
  if (dbCache?.records) {
    dbCache.records.push(...recordsToSave);
    dbCacheExpiresAt = Date.now() + DB_CACHE_MS;
  }
  await writeStateDb(db);
  // A tela atualiza os indicadores uma única vez após a gravação. Evita uma
  // consolidação duplicada de toda a base ainda dentro da confirmação.
  return { ok: true, importacao: importInfo };
}

function questionAnalysis(db, user, filters = {}) {
  const habilidades = db.habilidadesAplicadas || [];
  const hasRequiredFilters = ['avaliacao', 'ano', 'disciplina'].every((key) => {
    const value = filters[key];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });
  if (!hasRequiredFilters) {
    return { filters, options: questionOptions(habilidades, filters), rows: [], inconsistencias: [], kpis: {} };
  }
  const baseFilters = { ...filters };
  delete baseFilters.questao;
  const baseRecords = filteredRecords(db, user, baseFilters);
  const filtered = habilidades.filter((item) => (
    valuesMatch(item.avaliacao, filters.avaliacao) &&
    valuesMatch(item.ano, filters.ano) &&
    disciplineValuesMatch(item.disciplina, filters.disciplina) &&
    questionFilterMatch(item.questao, filters.questao)
  ));
  const recordBuckets = new Map();
  for (const row of baseRecords) {
    const key = [normalizedComparable(row.AVALIACAO), normalizedComparable(row.ANO), disciplineComparable(row.DISCIPLINA)].join('|');
    if (!recordBuckets.has(key)) recordBuckets.set(key, []);
    recordBuckets.get(key).push(row);
  }
  const rows = filtered.map((item) => {
    const q = `Q${item.questao}`;
    const key = [normalizedComparable(item.avaliacao), normalizedComparable(item.ano), disciplineComparable(item.disciplina)].join('|');
    const records = recordBuckets.get(key) || [];
    const distribuicaoRespostas = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    let avaliados = 0;
    let acertos = 0;
    const correta = String(item.alternativaCorreta || '').trim().toUpperCase();
    for (const row of records) {
      const resposta = String(row[q] || '').trim().toUpperCase();
      if (!resposta) continue;
      avaliados += 1;
      if (resposta === correta) acertos += 1;
      if (Object.hasOwn(distribuicaoRespostas, resposta)) distribuicaoRespostas[resposta] += 1;
    }
    return { ...item, questao: q, questaoNumero: item.questao, avaliados, acertos, erros: Math.max(avaliados - acertos, 0), percentual: avaliados ? round((acertos / avaliados) * 100) : 0, distribuicaoRespostas };
  }).sort((a, b) => Number(a.questaoNumero || 0) - Number(b.questaoNumero || 0));
  return { filters, options: questionOptions(habilidades, filters), rows, inconsistencias: [], kpis: { alunosAnalisados: baseRecords.length, habilidadesCadastradas: filtered.length, habilidadesComDados: rows.filter((row) => row.avaliados).length, totalAvaliacoesQuestao: rows.reduce((s, row) => s + row.avaliados, 0), percentualMedio: rows.length ? round(rows.reduce((s, row) => s + row.percentual, 0) / rows.length) : 0 } };
}

function questionOptions(items, filters) {
  const scopedUntil = (targetKey) => {
    const targetIndex = questionAnalysisFilterOrder.indexOf(targetKey);
    return items.filter((item) => questionAnalysisFilterOrder.slice(0, targetIndex).every((key) => {
      if (key === 'disciplina') return disciplineValuesMatch(item.disciplina, filters.disciplina);
      if (key === 'questao') return questionFilterMatch(item.questao, filters.questao);
      return valuesMatch(item[key], filters[key]);
    }));
  };
  return {
    avaliacao: unique(items.map((item) => item.avaliacao)),
    ano: unique(scopedUntil('ano').map((item) => item.ano)),
    disciplina: unique(scopedUntil('disciplina').map((item) => item.disciplina)),
    questao: unique(scopedUntil('questao').map((item) => `Q${item.questao}`)),
  };
}

function routeParts(path) {
  return path.split('?')[0].replace(/^\/api\/?/, '').replace(/^\//, '').split('/').filter(Boolean);
}

function filtersFrom(path) {
  const params = new URLSearchParams(path.split('?')[1] || '');
  const filters = {};
  for (const key of [...filterOrder, 'questao']) {
    const values = params.getAll(key).filter(Boolean);
    if (values.length > 1) filters[key] = values;
    else if (values.length === 1) filters[key] = values[0];
  }
  return filters;
}

async function request(method, path, data = undefined, options = {}) {
  const p = routeParts(path);
  const route = p.join('/');
  if (method === 'GET' && route === 'health') return { ok: true, database: 'Supabase' };
  if (method === 'POST' && route === 'auth/login') {
    const email = normalizeEmail(data?.email);
    const password = String(data?.password || '');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError || !authData.user) throw { status: 401, error: 'E-mail ou senha inválidos.' };
    const db = await readDb();
    const user = await ensureCentralEvaluationUser(db);
    log(db, user, 'LOGIN');
    await writeDb(db);
    return { token: `avd:${user.id}:${Date.now()}`, refreshToken: `refresh:${user.id}:${Date.now()}`, user: publicUser(user), permissions: db.permissions[user.perfil] };
  }
  if (method === 'GET' && route === 'auth/session') {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw { status: 401, error: 'Sessão central não encontrada.' };
    const db = await readDb();
    const user = await ensureCentralEvaluationUser(db);
    await writeDb(db);
    return { token: `avd:${user.id}:${Date.now()}`, refreshToken: '', user: publicUser(user), permissions: db.permissions[user.perfil] };
  }
  if (method === 'POST' && (route === 'imports/preview' || route === 'imports/commit')) {
    const db = await readStateDb();
    const user = currentUser(db, options.token);
    if (!user) throw { status: 401, error: 'Sessão inválida ou expirada.' };
    if (route === 'imports/preview') return previewImport(db, user, data);
    return commitImport(db, user, data?.previewId);
  }
  if (method === 'GET' && (route === 'imports' || route === 'imports/summary')) {
    const db = await readStateDb();
    const user = currentUser(db, options.token);
    if (!user) throw { status: 401, error: 'Sessão inválida ou expirada.' };
    if (route === 'imports') return db.imports || [];
    if (db.importSummary) return db.importSummary;
    const summary = await supabaseRequest('/rpc/avd_records_summary', { method: 'POST', body: '{}' });
    db.importSummary = summary;
    await writeStateDb(db);
    return summary;
  }
  if (method === 'GET' && (route === 'options' || ['dashboard', 'records', 'quality', 'analysis', 'statistics', 'compare', 'analysis/questions'].includes(route))) {
    const db = await readStateDb();
    const user = currentUser(db, options.token);
    if (!user) throw { status: 401, error: 'Sessão inválida ou expirada.' };
    const filters = filtersFrom(path);
    if (route === 'options') {
      db.records = await readOptionRecords(user);
      return optionsFor(db, user, filters);
    }
    db.records = await readRecords(filters, user);
    const scoped = filteredRecords(db, user, filters);
    if (route === 'dashboard') return dashboard(scoped, filters);
    if (route === 'records') return { total: scoped.length, rows: tableRows(scoped, Number(new URLSearchParams(path.split('?')[1] || '').get('limit') || 500)) };
    if (route === 'quality') return quality(scoped);
    if (route === 'analysis') return diagnosticAnalysis(scoped);
    if (route === 'statistics') return statisticalAnalysis(scoped);
    if (route === 'compare') return comparisonByEvaluation(scoped, Array.isArray(filters.avaliacao) ? filters.avaliacao : filters.avaliacao ? [filters.avaliacao] : []);
    return questionAnalysis(db, user, filters);
  }
  const db = await readDb();
  const user = currentUser(db, options.token);
  if (!user) throw { status: 401, error: 'Sessão inválida ou expirada.' };
  if (method === 'GET' && route === 'me') return { user: publicUser(user), permissions: db.permissions[user.perfil] };
  if (method === 'POST' && route === 'auth/logout') { await supabase.auth.signOut(); return { ok: true }; }
  if (method === 'POST' && route === 'auth/change-password') {
    const { error } = await supabase.auth.updateUser({ password: data?.newPassword });
    if (error) throw { status: 400, error: 'Não foi possível alterar a senha.', detail: error.message };
    log(db, user, 'ALTEROU_SENHA');
    await writeDb(db);
    return { ok: true };
  }
  if (method === 'GET' && route === 'options') return optionsFor(db, user, filtersFrom(path));
  if (method === 'GET' && ['dashboard', 'records', 'quality', 'analysis', 'statistics'].includes(route)) {
    const filters = filtersFrom(path);
    const scoped = filteredRecords(db, user, filters);
    if (route === 'dashboard') return dashboard(scoped, filters);
    if (route === 'records') return { total: scoped.length, rows: tableRows(scoped, Number(new URLSearchParams(path.split('?')[1] || '').get('limit') || 500)) };
    if (route === 'quality') return quality(scoped);
    if (route === 'analysis') return diagnosticAnalysis(scoped);
    if (route === 'statistics') return statisticalAnalysis(scoped);
  }
  if (method === 'GET' && route === 'compare') {
    const filters = filtersFrom(path);
    return comparisonByEvaluation(filteredRecords(db, user, filters), Array.isArray(filters.avaliacao) ? filters.avaliacao : filters.avaliacao ? [filters.avaliacao] : []);
  }
  if (method === 'GET' && route === 'analysis/questions') return questionAnalysis(db, user, filtersFrom(path));
  if (method === 'GET' && route === 'habilidades-aplicadas/options') return { avaliacoes: unique(recordsForUser(db, user).map((row) => row.AVALIACAO)) };
  if (method === 'GET' && route === 'habilidades-aplicadas') return db.habilidadesAplicadas || [];
  if (method === 'POST' && route === 'habilidades-aplicadas') {
    const item = { id: id('hab_'), ...(data || {}), questao: Number(data?.questao || 0), criadoPor: user.email, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
    const duplicate = (db.habilidadesAplicadas || []).find((entry) => habilidadeKey(entry) === habilidadeKey(item));
    if (duplicate) throw { status: 409, error: 'Cadastro duplicado.', detail: 'Já existe habilidade cadastrada para esta Avaliação, Ano, Disciplina e Questão.' };
    db.habilidadesAplicadas.unshift(item);
    log(db, user, 'CADASTROU_HABILIDADE_APLICADA', { id: item.id });
    await writeDb(db);
    return item;
  }
  if (method === 'PUT' && p[0] === 'habilidades-aplicadas' && p[1]) {
    const item = (db.habilidadesAplicadas || []).find((entry) => entry.id === p[1]);
    if (!item) throw { status: 404, error: 'Habilidade aplicada não encontrada.' };
    const next = { ...item, ...(data || {}), questao: Number(data?.questao || item.questao || 0), atualizadoEm: new Date().toISOString() };
    const duplicate = (db.habilidadesAplicadas || []).find((entry) => entry.id !== item.id && habilidadeKey(entry) === habilidadeKey(next));
    if (duplicate) throw { status: 409, error: 'Cadastro duplicado.', detail: 'Já existe habilidade cadastrada para esta Avaliação, Ano, Disciplina e Questão.' };
    Object.assign(item, next);
    log(db, user, 'EDITOU_HABILIDADE_APLICADA', { id: item.id });
    await writeDb(db);
    return item;
  }
  if (method === 'DELETE' && p[0] === 'habilidades-aplicadas' && p[1]) {
    const before = (db.habilidadesAplicadas || []).length;
    db.habilidadesAplicadas = (db.habilidadesAplicadas || []).filter((entry) => entry.id !== p[1]);
    if (db.habilidadesAplicadas.length === before) throw { status: 404, error: 'Habilidade aplicada não encontrada.' };
    log(db, user, 'EXCLUIU_HABILIDADE_APLICADA', { id: p[1] });
    await writeDb(db);
    return { ok: true };
  }
  if (method === 'GET' && route === 'admin/users') return db.users.map(publicUser);
  if (method === 'POST' && route === 'admin/users') {
    const item = { id: id('usr_'), unidadeEscolar: data.unidadeEscolar, email: normalizeEmail(data.email), perfil: data.perfil, ativo: data.ativo !== false, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
    db.users.push(item);
    log(db, user, 'CADASTROU_USUARIO', { email: item.email });
    await writeDb(db);
    return publicUser(item);
  }
  if (method === 'PUT' && p[0] === 'admin' && p[1] === 'users' && p[2]) {
    const item = db.users.find((entry) => entry.id === p[2]);
    if (!item) throw { status: 404, error: 'Usuário não encontrado.' };
    Object.assign(item, data || {});
    if (data?.email) item.email = normalizeEmail(data.email);
    item.atualizadoEm = new Date().toISOString();
    await writeDb(db);
    return publicUser(item);
  }
  if (method === 'GET' && route === 'admin/permissions') return { screens, permissions: db.permissions };
  if (method === 'PUT' && route === 'admin/permissions') {
    db.permissions = data.permissions;
    await writeDb(db);
    return { ok: true };
  }
  if (method === 'GET' && route === 'logs') return db.logs.slice(0, 500);
  if (method === 'GET' && route === 'imports') return db.imports || [];
  if (method === 'DELETE' && p[0] === 'imports' && p[1]) {
    const before = db.records.length;
    await deleteRecordsByImport(p[1]);
    db.records = db.records.filter((row) => row.importacaoId !== p[1]);
    db.imports = db.imports.filter((item) => item.id !== p[1]);
    const kpis = dashboard(filteredRecords(db, user, {})).kpis;
    db.importSummary = kpis;
    await writeDb(db);
    return { ok: true, registrosRemovidos: before - db.records.length, totalImportacoes: db.imports.length, kpis };
  }
  if (method === 'POST' && route === 'imports/preview') return previewImport(db, user, data);
  if (method === 'POST' && route === 'imports/commit') return commitImport(db, user, data?.previewId);
  if (method === 'GET' && (route === 'reports/pdf' || route === 'analysis/questions/pdf')) return new Blob(['Relatório disponível na visualização da tela.'], { type: 'application/pdf' });
  if (method === 'GET' && route === 'export/excel') return new Blob([csv(tableRows(filteredRecords(db, user, filtersFrom(path)), 100000))], { type: 'text/csv;charset=utf-8' });
  throw { status: 404, error: 'Rota não encontrada.' };
}

function csv(rows) {
  const headers = Object.keys(rows[0] || { vazio: '' });
  return `\uFEFF${[headers.join(';'), ...rows.map((row) => headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(';'))].join('\n')}`;
}

window.AVD_DB_REQUEST = request;
window.AVD_SUPABASE_CLIENT = { url: SUPABASE_URL, table: TABLE };
