import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "../../supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const clone = (value) => JSON.parse(JSON.stringify(value));

export function createEmptyElectionState() {
  return { settings: { title: "Urna Escolar" }, units: [], accessAccounts: [], candidates: [], boothAssignments: [], votingSessions: [], votes: [] };
}

function mergeRows(rows = []) {
  const registry = rows.find((row) => row.key === "registry")?.data || {};
  const voting = rows.find((row) => row.key === "voting")?.data || {};
  return { ...createEmptyElectionState(), ...registry, ...voting };
}

async function loadRows() {
  const { data, error } = await supabase.from("votacao_state").select("key,data,version,updated_at").in("key", ["registry", "voting"]);
  if (error) throw error;
  return data || [];
}

export async function loadElectionState() { return mergeRows(await loadRows()); }

function split(state) {
  return {
    registry: { settings: state.settings, units: state.units, accessAccounts: state.accessAccounts, candidates: state.candidates },
    voting: { boothAssignments: state.boothAssignments, votingSessions: state.votingSessions, votes: state.votes },
  };
}

export async function signInElection(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const { data: access, error: accessError } = await supabase.from("votacao_accounts").select("access_kind,unit_id,active").eq("user_id", data.user.id).single();
  if (accessError || !access?.active) { await supabase.auth.signOut(); throw accessError || new Error("Acesso eleitoral desativado."); }
  return { user: data.user, access };
}

export async function signOutElection() { await supabase.auth.signOut(); }

export async function ensureElectionSeed() { return loadRows(); }

export function subscribeToElectionState({ onChange, onReady, onError }) {
  let active = true;
  const refresh = async () => { try { const rows = await loadRows(); if (!active) return; const state = mergeRows(rows); onChange(state); onReady?.(state); } catch (error) { onError?.(error); } };
  refresh();
  const channel = supabase.channel("votacao-state").on("postgres_changes", { event: "*", schema: "public", table: "votacao_state" }, refresh).subscribe();
  return () => { active = false; supabase.removeChannel(channel); };
}

export async function replaceElectionState(nextState) {
  const rows = await loadRows();
  const registryVersion = rows.find((row) => row.key === "registry")?.version;
  const votingVersion = rows.find((row) => row.key === "voting")?.version;
  const parts = split(nextState);
  const { error } = await supabase.rpc("update_votacao_states", { p_registry_version: registryVersion, p_voting_version: votingVersion, p_registry: parts.registry, p_voting: parts.voting });
  if (error) throw error;
}

export async function runElectionStateTransaction(mutator) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const rows = await loadRows();
    const current = mergeRows(rows);
    const draft = clone(current);
    const result = await mutator(draft, current);
    const parts = split(draft);
    const { error } = await supabase.rpc("update_votacao_states", {
      p_registry_version: rows.find((row) => row.key === "registry")?.version,
      p_voting_version: rows.find((row) => row.key === "voting")?.version,
      p_registry: parts.registry,
      p_voting: parts.voting,
    });
    if (!error) return result;
    if (!String(error.message).includes("version conflict") || attempt === 2) throw error;
  }
}
