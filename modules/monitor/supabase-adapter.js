window.supabaseReady = (async () => {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.57.4');
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = await import('../../supabase-config.js');
  const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  const db = { client };
  const ref = (collection, id = null) => ({ collection, id });
  const collection = (_db, name) => ref(name);
  const doc = (first, second, third) => first?.collection ? ref(first.collection, second || crypto.randomUUID()) : ref(second, third);
  const serverTimestamp = () => new Date().toISOString();
  const snapshot = (row) => ({ id: row?.user_id || row?.id, exists: () => !!row, data: () => row ? (row.data || { fullName: row.full_name, email: row.email, role: row.role, active: row.active }) : undefined });
  async function getDoc(target) {
    if (target.collection === 'users') { const { data, error } = await client.from('monitor_profiles').select('*').eq('user_id', target.id).maybeSingle(); if (error) throw error; return snapshot(data); }
    const { data, error } = await client.from('monitor_records').select('*').eq('collection', target.collection).eq('id', target.id).maybeSingle(); if (error) throw error; return snapshot(data);
  }
  async function getDocs(target) {
    const name = target.collection || target.base?.collection;
    if (name === 'users') { const { data, error } = await client.from('monitor_profiles').select('*'); if (error) throw error; return { docs: (data || []).map(snapshot) }; }
    if (name === 'audit') { const { data, error } = await client.from('monitor_audit').select('*').order('created_at', { ascending: false }); if (error) throw error; return { docs: (data || []).map((row) => snapshot({ id: row.id, data: row })) }; }
    const { data, error } = await client.from('monitor_records').select('*').eq('collection', name); if (error) throw error; return { docs: (data || []).map(snapshot) };
  }
  const where = (field, op, value) => ({ type: 'where', field, op, value });
  const orderBy = (field, direction) => ({ type: 'order', field, direction });
  const query = (base, ...clauses) => ({ base, collection: base.collection, clauses });
  async function setDoc(target, data) {
    if (target.collection === 'users') { const { error } = await client.from('monitor_profiles').upsert({ user_id: target.id, full_name: data.fullName, email: data.email, role: data.role, active: data.active !== false, updated_at: new Date().toISOString() }); if (error) throw error; return; }
    if (target.collection === 'audit') { const { error } = await client.from('monitor_audit').insert({ id: target.id, user_id: data.userId || null, user_name: data.userName, action: data.action, entity: data.entity, record_id: data.recordId, old_data: data.oldData, new_data: data.newData, created_at: data.createdAt || new Date().toISOString() }); if (error) throw error; return; }
    const { data: { user } } = await client.auth.getUser();
    const { error } = await client.from('monitor_records').upsert({ collection: target.collection, id: target.id, data, active: data.active !== false, created_by: user?.id, updated_by: user?.id, updated_at: new Date().toISOString() }); if (error) throw error;
  }
  async function updateDoc(target, changes) { const current = await getDoc(target); await setDoc(target, { ...(current.data() || {}), ...changes }); }
  function writeBatch() { const tasks = []; return { set: (target, data) => tasks.push(() => setDoc(target, data)), update: (target, data) => tasks.push(() => updateDoc(target, data)), commit: async () => { for (const task of tasks) await task(); } }; }
  const withUid = (user) => user ? { ...user, uid: user.id } : null;
  const auth = { currentUser: null, authStateReady: async () => { const { data } = await client.auth.getUser(); auth.currentUser = withUid(data.user); } };
  const authSdk = {
    signInWithEmailAndPassword: async (_auth, email, password) => { const { data, error } = await client.auth.signInWithPassword({ email, password }); if (error) { if (error.code === 'invalid_credentials') error.code = 'invalid-credential'; throw error; } auth.currentUser = withUid(data.user); return { user: auth.currentUser }; },
    signOut: async () => { await client.auth.signOut(); auth.currentUser = null; },
  };
  const functionsSdk = { httpsCallable: (_functions, name) => async (payload) => { const functionName = name === 'manageUser' ? 'manage-semed-user' : name; const { data, error } = await client.functions.invoke(functionName, { body: payload }); if (error) throw error; if (data?.error) throw new Error(data.error); return { data }; } };
  return { client, db, auth, functions: {}, authSdk, functionsSdk, dataSdk: { collection, doc, getDoc, getDocs, query, where, orderBy, setDoc, updateDoc, writeBatch, serverTimestamp } };
})();
