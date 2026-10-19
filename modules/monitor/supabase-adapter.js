window.supabaseReady = (async () => {
  if (!('SEMED_MODULE_ACCESS' in window)) {
    await new Promise((resolve, reject) => {
      const started = Date.now();
      const check = () => {
        if ('SEMED_MODULE_ACCESS' in window) return resolve();
        if (Date.now() - started > 10000) return reject(new Error('A sessão central do Portal não foi carregada.'));
        requestAnimationFrame(check);
      };
      check();
    });
  }
  const access = await window.SEMED_MODULE_ACCESS;
  if (!access?.supabase) return null;
  const client = access.supabase;
  const db = { client };
  const ref = (collection, id = null) => ({ collection, id });
  const collection = (_db, name) => ref(name);
  const doc = (first, second, third) => first?.collection ? ref(first.collection, second || crypto.randomUUID()) : ref(second, third);
  const serverTimestamp = () => new Date().toISOString();
  const snapshot = (row) => ({ id: row?.user_id || row?.id, exists: () => !!row, data: () => row ? (row.data ? { ...row.data, active: row.active !== false } : { fullName: row.full_name, email: row.email, area: row.area || '', role: row.role, active: row.active }) : undefined });
  const recordsCache = new Map();
  const recordsRequests = new Map();
  const clearRecordsCache = (name = null) => { if (name) recordsCache.delete(name); else recordsCache.clear(); };
  async function loadActiveRecords(name) {
    const cached = recordsCache.get(name);
    if (cached && Date.now() - cached.at < 5000) return cached.rows;
    if (!recordsRequests.has(name)) {
      const request = client.from('monitor_records').select('id,collection,data,active').eq('collection', name).eq('active', true)
        .then(({ data, error }) => { if (error) throw error; const rows = data || []; recordsCache.set(name, { at: Date.now(), rows }); return rows; })
        .finally(() => recordsRequests.delete(name));
      recordsRequests.set(name, request);
    }
    return recordsRequests.get(name);
  }
  async function getDoc(target) {
    if (target.collection === 'users') { const { data, error } = await client.from('monitor_profiles').select('user_id,full_name,email,area,role,active').eq('user_id', target.id).maybeSingle(); if (error) throw error; return snapshot(data); }
    const { data, error } = await client.from('monitor_records').select('id,collection,data,active').eq('collection', target.collection).eq('id', target.id).maybeSingle(); if (error) throw error; return snapshot(data);
  }
  async function getDocs(target) {
    const name = target.collection || target.base?.collection;
    if (name === 'users') { const { data, error } = await client.from('monitor_profiles').select('user_id,full_name,email,area,role,active').eq('active', true); if (error) throw error; return { docs: (data || []).map(snapshot) }; }
    if (name === 'audit') { const { data, error } = await client.from('monitor_audit').select('*').order('created_at', { ascending: false }); if (error) throw error; return { docs: (data || []).map((row) => snapshot({ id: row.id, data: row })) }; }
    let rows = [...await loadActiveRecords(name)];
    for (const clause of target.clauses || []) {
      if (clause.type === 'where') {
        rows = rows.filter((row) => {
          const current = clause.field === 'active' ? row.active : row.data?.[clause.field];
          return clause.op === '==' ? current === clause.value : true;
        });
      }
      if (clause.type === 'order') {
        const direction = clause.direction === 'asc' ? 1 : -1;
        rows.sort((a, b) => String(a.data?.[clause.field] || '').localeCompare(String(b.data?.[clause.field] || '')) * direction);
      }
    }
    return { docs: rows.map(snapshot) };
  }
  const where = (field, op, value) => ({ type: 'where', field, op, value });
  const orderBy = (field, direction) => ({ type: 'order', field, direction });
  const query = (base, ...clauses) => ({ base, collection: base.collection, clauses });
  async function setDoc(target, data) {
    if (target.collection === 'users') { const { error } = await client.from('monitor_profiles').upsert({ user_id: target.id, full_name: data.fullName, email: data.email, area: data.area || '', role: data.role, active: data.active !== false, updated_at: new Date().toISOString() }); if (error) throw error; return; }
    if (target.collection === 'audit') { const { error } = await client.from('monitor_audit').insert({ id: target.id, user_id: data.userId || null, user_name: data.userName, action: data.action, entity: data.entity, record_id: data.recordId, old_data: data.oldData, new_data: data.newData, created_at: data.createdAt || new Date().toISOString() }); if (error) throw error; return; }
    const { data: { user } } = await client.auth.getUser();
    const { error } = await client.from('monitor_records').upsert({ collection: target.collection, id: target.id, data, active: data.active !== false, created_by: user?.id, updated_by: user?.id, updated_at: new Date().toISOString() }); if (error) throw error; clearRecordsCache(target.collection);
  }
  async function updateDoc(target, changes) { const current = await getDoc(target); await setDoc(target, { ...(current.data() || {}), ...changes }); }
  async function runWriteTasks(tasks, concurrency = 6) {
    let next = 0;
    async function worker() { while (next < tasks.length) { const task = tasks[next++]; await task(); } }
    await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  }
  function writeBatch() { const tasks = []; return { set: (target, data) => tasks.push(() => setDoc(target, data)), update: (target, data) => tasks.push(() => updateDoc(target, data)), commit: async () => runWriteTasks(tasks) }; }
  const withUid = (user) => user ? { ...user, uid: user.id } : null;
  const auth = { currentUser: null, authStateReady: async () => { const { data } = await client.auth.getUser(); auth.currentUser = withUid(data.user); } };
  const authSdk = {
    signInWithEmailAndPassword: async (_auth, email, password) => { const { data, error } = await client.auth.signInWithPassword({ email, password }); if (error) { if (error.code === 'invalid_credentials') error.code = 'invalid-credential'; throw error; } auth.currentUser = withUid(data.user); return { user: auth.currentUser }; },
    signOut: async () => { await client.auth.signOut(); auth.currentUser = null; },
  };
  const functionsSdk = { httpsCallable: (_functions, name) => async (payload) => { const functionName = name === 'manageUser' ? 'manage-semed-user' : name; const { data, error } = await client.functions.invoke(functionName, { body: payload }); if (error) throw error; if (data?.error) throw new Error(data.error); return { data }; } };
  const financialTables = new Set(['monitor_financial_sources','monitor_financial_annual_budgets','monitor_financial_processes','monitor_financial_entries']);
  const financialApi = {
    load: async () => { const { data, error } = await client.rpc('get_monitor_financial_data'); if (error) throw error; return data || {}; },
    save: async (table, record) => { if (!financialTables.has(table)) throw new Error('Tabela financeira inválida.'); const payload = { ...record }; const id = payload.id; delete payload.id; const query = id ? client.from(table).update(payload).eq('id', id) : client.from(table).insert(payload); const { data, error } = await query.select().single(); if (error) throw error; return data; },
    archive: async (table, id) => { if (!financialTables.has(table)) throw new Error('Tabela financeira inválida.'); const { error } = await client.from(table).update({ active: false }).eq('id', id); if (error) throw error; },
  };
  return { client, db, auth, functions: {}, authSdk, functionsSdk, financialApi, dataSdk: { collection, doc, getDoc, getDocs, query, where, orderBy, setDoc, updateDoc, writeBatch, serverTimestamp } };
})();
