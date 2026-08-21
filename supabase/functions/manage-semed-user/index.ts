import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const headers = { ...corsHeaders, "Content-Type": "application/json" };
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const strongPassword = (value: string) => /(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}/.test(value);
const DETIC_EMAIL = "detic@uberabadigital.com.br";
const USER_AREAS = ["Gestão Pedagógica", "Infraestrutura", "Logística", "Tecnologia", "Transporte"] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Método não permitido." }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return respond({ error: "Autenticação obrigatória." }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);
    if (userError || !user || String(user.email || "").toLowerCase() !== DETIC_EMAIL) {
      return respond({ error: "Apenas o administrador DETIC pode gerenciar usuários." }, 403);
    }

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: actor } = await admin.from("semed_people").select("active").eq("user_id", user.id).maybeSingle();
    if (!actor?.active) return respond({ error: "Administrador corporativo inativo." }, 403);

    const input = await req.json().catch(() => ({}));
    const action = String(input.action || "list");

    if (action === "list") {
      const [people, profiles, modules, assignments, roles] = await Promise.all([
        admin.from("semed_people").select("user_id,email,full_name,area,active,must_change_password,password_changed_at,created_at").order("full_name"),
        admin.from("semed_profiles").select("id,code,name,description,active").eq("active", true).order("name"),
        admin.from("semed_modules").select("id,code,name,description,display_order").eq("active", true).order("display_order"),
        admin.from("semed_user_profiles").select("user_id,profile_id,active").eq("active", true),
        admin.from("semed_user_module_roles").select("user_id,module_id,role_code,scope,active").eq("active", true),
      ]);
      for (const result of [people, profiles, modules, assignments, roles]) if (result.error) throw result.error;
      return respond({ users: people.data, profiles: profiles.data, modules: modules.data, assignments: assignments.data, moduleRoles: roles.data });
    }

    if (action !== "save") return respond({ error: "Ação inválida." }, 400);
    const uid = input.uid ? String(input.uid) : "";
    const email = String(input.email || "").trim().toLowerCase();
    const fullName = String(input.fullName || "").trim();
    const area = String(input.area || "").trim();
    const temporaryPassword = String(input.temporaryPassword || "");
    const active = input.active !== false;
    const requestedProfiles = [...new Set((Array.isArray(input.profileCodes) ? input.profileCodes : []).map(String))];
    const requestedRoles = input.moduleRoles && typeof input.moduleRoles === "object" ? input.moduleRoles : {};

    if (!email || !fullName || !area || !requestedProfiles.length) throw new Error("Nome, e-mail, área e ao menos um perfil são obrigatórios.");
    if (!USER_AREAS.includes(area as typeof USER_AREAS[number])) throw new Error("Área de atuação inválida.");
    if (!uid && !strongPassword(temporaryPassword)) throw new Error("A senha temporária deve ter 12 caracteres, letra, número e símbolo.");
    if (uid && temporaryPassword && !strongPassword(temporaryPassword)) throw new Error("A nova senha temporária não atende aos requisitos de segurança.");
    if (email !== DETIC_EMAIL && requestedProfiles.includes("ADMIN_GERAL")) throw new Error("O perfil Administrador Geral é exclusivo do usuário DETIC.");
    if (uid === user.id && (!active || email !== DETIC_EMAIL || !requestedProfiles.includes("ADMIN_GERAL"))) {
      throw new Error("O administrador DETIC não pode remover o próprio acesso administrativo.");
    }

    const { data: allowedProfiles, error: profileError } = await admin.from("semed_profiles").select("id,code").in("code", requestedProfiles).eq("active", true);
    if (profileError) throw profileError;
    if ((allowedProfiles || []).length !== requestedProfiles.length) throw new Error("Um ou mais perfis são inválidos.");

    let target;
    if (uid) {
      const attributes: Record<string, unknown> = { email, email_confirm: true, user_metadata: { full_name: fullName }, ban_duration: active ? "none" : "876000h" };
      if (temporaryPassword) attributes.password = temporaryPassword;
      const { data, error } = await admin.auth.admin.updateUserById(uid, attributes);
      if (error) throw error;
      target = data.user;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email, password: temporaryPassword, email_confirm: true, user_metadata: { full_name: fullName },
      });
      if (error) throw error;
      target = data.user;
    }
    if (!target) throw new Error("Usuário não retornado pelo Supabase Auth.");

    const mustChange = !uid || Boolean(temporaryPassword);
    const { error: personError } = await admin.from("semed_people").upsert({
      user_id: target.id, email, full_name: fullName, area, active,
      must_change_password: mustChange,
      password_changed_at: mustChange ? null : undefined,
      updated_at: new Date().toISOString(),
    });
    if (personError) throw personError;

    const { error: deleteProfilesError } = await admin.from("semed_user_profiles").delete().eq("user_id", target.id);
    if (deleteProfilesError) throw deleteProfilesError;
    const { error: insertProfilesError } = await admin.from("semed_user_profiles").insert(
      (allowedProfiles || []).map((profile) => ({ user_id: target.id, profile_id: profile.id, active: true })),
    );
    if (insertProfilesError) throw insertProfilesError;

    const { data: permittedModules, error: permissionsError } = await admin
      .from("semed_profile_module_permissions").select("module_id").in("profile_id", (allowedProfiles || []).map((profile) => profile.id)).eq("can_view", true);
    if (permissionsError) throw permissionsError;
    const moduleIds = [...new Set((permittedModules || []).map((item) => item.module_id))];
    const { data: moduleRows, error: moduleError } = await admin.from("semed_modules").select("id,code").in("id", moduleIds);
    if (moduleError) throw moduleError;

    await admin.from("semed_user_module_roles").delete().eq("user_id", target.id);
    const roleRows = (moduleRows || []).map((module) => {
      const configured = requestedRoles[module.code] || {};
      return { user_id: target.id, module_id: module.id, role_code: String(configured.roleCode || ""), scope: configured.scope || {}, active: true, managed_by: user.id };
    }).filter((row) => row.role_code);
    if (roleRows.length) {
      const { error } = await admin.from("semed_user_module_roles").insert(roleRows);
      if (error) throw error;
    }

    const roleFor = (code: string, fallback: string) => String(requestedRoles[code]?.roleCode || fallback);
    const scopeFor = (code: string) => requestedRoles[code]?.scope || {};
    const allowedCodes = new Set((moduleRows || []).map((module) => module.code));

    if (allowedCodes.has("monitor")) {
      const { error } = await admin.from("monitor_profiles").upsert({ user_id: target.id, full_name: fullName, email, area, role: roleFor("monitor", "servidor"), active, updated_by: user.id, updated_at: new Date().toISOString() });
      if (error) throw error;
    } else await admin.from("monitor_profiles").update({ active: false, updated_by: user.id }).eq("user_id", target.id);

    if (allowedCodes.has("os_semed")) {
      const { error } = await admin.from("os_profiles").upsert({ user_id: target.id, full_name: fullName, email, role: roleFor("os_semed", "Solicitante"), unit_name: String(scopeFor("os_semed").unit_name || ""), active, updated_at: new Date().toISOString() });
      if (error) throw error;
    } else await admin.from("os_profiles").update({ active: false }).eq("user_id", target.id);

    if (allowedCodes.has("votacao")) {
      const { error } = await admin.from("votacao_accounts").upsert({ user_id: target.id, access_kind: roleFor("votacao", "MESARIO"), unit_id: scopeFor("votacao").unit_id || null, active, updated_at: new Date().toISOString() });
      if (error) throw error;
    } else await admin.from("votacao_accounts").update({ active: false }).eq("user_id", target.id);

    await admin.from("semed_audit").insert({
      user_id: user.id, module_code: "portal", action: uid ? "UPDATE_USER_ACCESS" : "CREATE_USER_ACCESS",
      entity_type: "auth.users", entity_id: target.id,
      metadata: { email, fullName, area, active, profileCodes: requestedProfiles, passwordReset: Boolean(temporaryPassword) },
    });

    return respond({ user: { user_id: target.id, email, full_name: fullName, area, active, must_change_password: mustChange } });
  } catch (error) {
    return respond({ error: error instanceof Error ? error.message : String(error) }, 400);
  }
});
