import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "/supabase-config.js";

const CLIENT_KEY = Symbol.for("semed.portal.supabase");
export const ACCESS_CACHE_KEY = "semed.access-context.v3";
export const ACCESS_CACHE_TTL = 60_000;

export const MODULE_ROUTES = Object.freeze({
  avaliacoes: "/avaliacoes/",
  monitor: "/modules/monitor/",
  votacao: "/modules/votacao/",
  comunicacao: "/comunicacao/",
  inteligencia: "/modules/inteligencia/",
});

const routeEntries = Object.entries(MODULE_ROUTES);
let contextRequest;

export function getPortalClient() {
  if (!globalThis[CLIENT_KEY]) {
    globalThis[CLIENT_KEY] = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return globalThis[CLIENT_KEY];
}

export function moduleCodeFromPath(pathname = location.pathname) {
  const normalized = `/${String(pathname || "").replace(/^\/+|\/+$/g, "")}/`.toLowerCase();
  return routeEntries.find(([, route]) => normalized.startsWith(route.toLowerCase()))?.[0] || "";
}

export function moduleCodeFromHref(href = "") {
  try { return moduleCodeFromPath(new URL(href, location.href).pathname); }
  catch { return ""; }
}

function readCache(userId, allowStale = false) {
  try {
    const cached = JSON.parse(sessionStorage.getItem(ACCESS_CACHE_KEY) || "null");
    if (cached?.userId !== userId || !cached.context?.user?.active) return null;
    if (!allowStale && Date.now() - cached.storedAt >= ACCESS_CACHE_TTL) return null;
    return cached.context;
  } catch { return null; }
}

function writeCache(session, context) {
  try { sessionStorage.setItem(ACCESS_CACHE_KEY, JSON.stringify({ userId: session.user.id, storedAt: Date.now(), context })); }
  catch { /* armazenamento indisponível: a sessão continua válida */ }
}

export function invalidateAccessContext() {
  contextRequest = undefined;
  try { sessionStorage.removeItem(ACCESS_CACHE_KEY); } catch {}
}

export async function getPortalSession() {
  const { data, error } = await getPortalClient().auth.getSession();
  if (error) throw error;
  return data.session || null;
}

export async function getAccessContext(session, { force = false, retry = true } = {}) {
  if (!session?.user?.id) return null;
  if (!force) {
    const cached = readCache(session.user.id);
    if (cached) return cached;
    if (contextRequest) return contextRequest;
  }
  contextRequest = (async () => {
    const client = getPortalClient();
    let result = await client.rpc("get_my_access_context");
    if (retry && (result.error || !result.data?.user?.active)) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      result = await client.rpc("get_my_access_context");
    }
    const context = result.data || readCache(session.user.id, true);
    if (!context?.user?.active) throw result.error || new Error("Usuário corporativo inativo.");
    writeCache(session, context);
    return context;
  })().finally(() => { contextRequest = undefined; });
  return contextRequest;
}

export function moduleAccess(context, code) {
  return (context?.modules || []).find((item) => item.code === code) || null;
}

export function canAccess(context, code, operation = "view") {
  if (context?.portal_admin) return true;
  return Boolean(moduleAccess(context, code)?.permissions?.[operation]);
}

export async function signOutPortal() {
  invalidateAccessContext();
  await getPortalClient().auth.signOut();
}

export function portalSelectionUrl(returnPath = "") {
  const url = new URL("/", location.origin);
  if (returnPath) url.searchParams.set("return", returnPath);
  else url.searchParams.set("select", "1");
  return url;
}
