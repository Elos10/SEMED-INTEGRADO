import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const headers = { ...corsHeaders, "Content-Type": "application/json" };
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const strongPassword = (value: string) => /(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}/.test(value);
const DETIC_EMAIL = "detic@uberabadigital.com.br";
const USER_AREAS = ["Gestão SEMED", "Diretoria de Ensino", "Diretoria de Apoio à Educação Básica", "Diretoria de Logística", "Diretoria de Planejamento Gestão e Finanças", "Arte e Cultura", "Formação - Casa do Educador", "Formação - Polo UAB", "Inclusão", "Infraestrutura", "Planejamento Financeiro", "Tecnologia", "Transporte"] as const;
const MODULE_ROLES: Record<string, readonly string[]> = {
  avaliacoes: ["ADMINISTRADOR", "GESTOR DA REDE", "GESTOR DE UNIDADE", "PROFESSOR", "OPERADOR", "CONSULTA"],
  monitor: ["administrador", "gabinete", "assessoria", "diretoria", "departamento", "secao", "servidor"],
  comunicacao: ["administrador", "gestor", "emissor", "destinatario", "auditoria", "publicador"],
  votacao: ["MESARIO"],
};
const SCOPE_MODES = new Set(["ALL", "DIRECTORATE", "AREA", "UNIT", "TEAM", "OWN", "ASSIGNED", "READ_ONLY"]);
const SCOPES_REQUIRING_REFERENCE = new Set(["DIRECTORATE", "AREA", "UNIT"]);

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
    const { data: actor } = await admin.from("semed_people").select("active,account_status,access_starts_at,access_ends_at").eq("user_id", user.id).maybeSingle();
    const today = new Date().toISOString().slice(0, 10);
    if (!actor?.active || actor.account_status !== "ACTIVE" || (actor.access_starts_at && actor.access_starts_at > today) || (actor.access_ends_at && actor.access_ends_at < today)) {
      return respond({ error: "Administrador corporativo sem acesso vigente." }, 403);
    }

    const input = await req.json().catch(() => ({}));
    const action = String(input.action || "list");

    if (action === "list") {
      const [people, profiles, modules, assignments, permissions, roles, overrides] = await Promise.all([
        admin.from("semed_people").select("user_id,email,full_name,area,directorate,unit_name,job_title,manager_name,account_status,access_starts_at,access_ends_at,active,must_change_password,password_changed_at,created_at").order("full_name"),
        admin.from("semed_profiles").select("id,code,name,description,active").eq("active", true).order("name"),
        admin.from("semed_modules").select("id,code,name,description,display_order").eq("active", true).order("display_order"),
        admin.from("semed_user_profiles").select("user_id,profile_id,active").eq("active", true),
        admin.from("semed_profile_module_permissions").select("profile_id,module_id,can_view,can_create,can_edit,can_delete,can_approve,can_admin,can_assign,can_export,can_view_sensitive"),
        admin.from("semed_user_module_roles").select("user_id,module_id,role_code,scope,active").eq("active", true),
        admin.from("semed_user_module_overrides").select("user_id,module_id,can_view,can_create,can_edit,can_delete,can_approve,can_admin,can_assign,can_export,can_view_sensitive,scope,expires_at,active").eq("active", true),
      ]);
      for (const result of [people, profiles, modules, assignments, permissions, roles, overrides]) if (result.error) throw result.error;
      return respond({ users: people.data, profiles: profiles.data, modules: modules.data, assignments: assignments.data, profilePermissions: permissions.data, moduleRoles: roles.data, accessOverrides: overrides.data });
    }

    if (action !== "save") return respond({ error: "Ação inválida." }, 400);
    const uid = input.uid ? String(input.uid) : "";
    const email = String(input.email || "").trim().toLowerCase();
    const fullName = String(input.fullName || "").trim();
    const area = String(input.area || "").trim();
    const directorate = String(input.directorate || "").trim();
    const unitName = String(input.unitName || "").trim();
    const jobTitle = String(input.jobTitle || "").trim();
    const managerName = String(input.managerName || "").trim();
    const accountStatus = String(input.accountStatus || (input.active === false ? "INACTIVE" : "ACTIVE")).toUpperCase();
    const accessStartsAt = input.accessStartsAt ? String(input.accessStartsAt) : null;
    const accessEndsAt = input.accessEndsAt ? String(input.accessEndsAt) : null;
    const temporaryPassword = String(input.temporaryPassword || "");
    const active = input.active !== false && accountStatus === "ACTIVE";
    const requestedProfiles = [...new Set((Array.isArray(input.profileCodes) ? input.profileCodes : []).map(String))];
    const requestedRoles = input.moduleRoles && typeof input.moduleRoles === "object" ? input.moduleRoles : {};
    const requestedOverrides = input.accessOverrides && typeof input.accessOverrides === "object" ? input.accessOverrides : {};

    if (!email || !fullName || !area || !requestedProfiles.length) throw new Error("Nome, e-mail, área e ao menos um perfil são obrigatórios.");
    if (!USER_AREAS.includes(area as typeof USER_AREAS[number])) throw new Error("Área de atuação inválida.");
    if (!['ACTIVE', 'SUSPENDED', 'INACTIVE'].includes(accountStatus)) throw new Error("Situação da conta inválida.");
    if (accessStartsAt && accessEndsAt && accessEndsAt < accessStartsAt) throw new Error("O fim da vigência não pode ser anterior ao início.");
    if (!uid && !strongPassword(temporaryPassword)) throw new Error("A senha temporária deve ter 8 caracteres, letra, número e símbolo.");
    if (uid && temporaryPassword && !strongPassword(temporaryPassword)) throw new Error("A nova senha temporária não atende aos requisitos de segurança.");
    if (email !== DETIC_EMAIL && requestedProfiles.includes("ADMIN_GERAL")) throw new Error("O perfil Administrador Geral é exclusivo do usuário DETIC.");
    if (uid === user.id && (!active || email !== DETIC_EMAIL || !requestedProfiles.includes("ADMIN_GERAL"))) {
      throw new Error("O administrador DETIC não pode remover o próprio acesso administrativo.");
    }
    for (const [moduleCode, configuredValue] of Object.entries(requestedRoles)) {
      const configured = configuredValue && typeof configuredValue === "object" ? configuredValue as Record<string, any> : {};
      const roleCode = String(configured.roleCode || "");
      if (roleCode && !(MODULE_ROLES[moduleCode] || []).includes(roleCode)) throw new Error(`Papel inválido para o sistema ${moduleCode}.`);
      if (moduleCode === "votacao" && roleCode && !configured.scope?.unit_id) throw new Error("Informe a unidade vinculada ao acesso da Urna Eletrônica.");
    }
    for (const [moduleCode, configuredValue] of Object.entries(requestedOverrides)) {
      const configured = configuredValue && typeof configuredValue === "object" ? configuredValue as Record<string, any> : {};
      const scope = configured.scope && typeof configured.scope === "object" ? configured.scope : {};
      const scopeMode = String(scope.mode || "ALL");
      if (!SCOPE_MODES.has(scopeMode)) throw new Error(`Alcance inválido para o sistema ${moduleCode}.`);
      if (configured.can_view && SCOPES_REQUIRING_REFERENCE.has(scopeMode) && !String(scope.value || "").trim()) throw new Error(`Informe a referência do alcance para o sistema ${moduleCode}.`);
      const elevated = ["can_create", "can_edit", "can_delete", "can_approve", "can_admin", "can_assign", "can_export", "can_view_sensitive"].some((key) => configured[key] === true);
      if (elevated && configured.can_view !== true) throw new Error(`O sistema ${moduleCode} possui operações liberadas sem permissão de acesso.`);
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
      user_id: target.id, email, full_name: fullName, area, directorate: directorate || null,
      unit_name: unitName || null, job_title: jobTitle || null, manager_name: managerName || null,
      account_status: accountStatus, access_starts_at: accessStartsAt, access_ends_at: accessEndsAt, active,
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
    const { data: moduleRows, error: moduleError } = await admin.from("semed_modules").select("id,code").in("id", moduleIds).eq("active", true);
    if (moduleError) throw moduleError;

    await admin.from("semed_user_module_roles").delete().eq("user_id", target.id);
    const roleRows = (moduleRows || []).map((module) => {
      const configured = requestedRoles[module.code] || {};
      const roleCode = String(configured.roleCode || "");
      if (roleCode && !(MODULE_ROLES[module.code] || []).includes(roleCode)) throw new Error(`Papel inválido para o sistema ${module.code}.`);
      if (module.code === "votacao" && roleCode && !configured.scope?.unit_id) throw new Error("Informe a unidade vinculada ao acesso da Urna Eletrônica.");
      return { user_id: target.id, module_id: module.id, role_code: roleCode, scope: configured.scope || {}, active: true, managed_by: user.id };
    }).filter((row) => row.role_code);
    if (roleRows.length) {
      const { error } = await admin.from("semed_user_module_roles").insert(roleRows);
      if (error) throw error;
    }

    const { error: deleteOverridesError } = await admin.from("semed_user_module_overrides").delete().eq("user_id", target.id);
    if (deleteOverridesError) throw deleteOverridesError;
    const permissionKeys = ["can_view", "can_create", "can_edit", "can_delete", "can_approve", "can_admin", "can_assign", "can_export", "can_view_sensitive"] as const;
    const overrideRows = (moduleRows || []).map((module) => {
      if (module.code === "votacao") return null;
      const configured = requestedOverrides[module.code];
      if (!configured || typeof configured !== "object") return null;
      const scope = configured.scope && typeof configured.scope === "object" ? configured.scope : {};
      const scopeMode = String(scope.mode || "ALL");
      const scopeValue = String(scope.value || "").trim();
      if (!SCOPE_MODES.has(scopeMode)) throw new Error(`Alcance inválido para o sistema ${module.code}.`);
      if (configured.can_view && SCOPES_REQUIRING_REFERENCE.has(scopeMode) && !scopeValue) throw new Error(`Informe a referência do alcance para o sistema ${module.code}.`);
      const elevated = permissionKeys.some((key) => key !== "can_view" && configured[key] === true);
      if (elevated && configured.can_view !== true) throw new Error(`O sistema ${module.code} possui operações liberadas sem permissão de acesso.`);
      const row: Record<string, unknown> = {
        user_id: target.id, module_id: module.id, active: true, managed_by: user.id,
        scope,
        expires_at: configured.expiresAt || null,
      };
      for (const key of permissionKeys) row[key] = typeof configured[key] === "boolean" ? configured[key] : null;
      return row;
    }).filter(Boolean);
    if (overrideRows.length) {
      const { error } = await admin.from("semed_user_module_overrides").insert(overrideRows);
      if (error) throw error;
    }

    const roleFor = (code: string, fallback: string) => String(requestedRoles[code]?.roleCode || fallback);
    const scopeFor = (code: string) => requestedRoles[code]?.scope || {};
    const allowedCodes = new Set((moduleRows || []).map((module) => module.code));

    if (allowedCodes.has("monitor")) {
      const { error } = await admin.from("monitor_profiles").upsert({ user_id: target.id, full_name: fullName, email, area, role: roleFor("monitor", "servidor"), active, updated_by: user.id, updated_at: new Date().toISOString() });
      if (error) throw error;
    } else await admin.from("monitor_profiles").update({ active: false, updated_by: user.id }).eq("user_id", target.id);

    if (allowedCodes.has("votacao")) {
      const { error } = await admin.from("votacao_accounts").upsert({ user_id: target.id, access_kind: roleFor("votacao", "MESARIO"), unit_id: scopeFor("votacao").unit_id || null, active, updated_at: new Date().toISOString() });
      if (error) throw error;
    } else await admin.from("votacao_accounts").update({ active: false }).eq("user_id", target.id);

    await admin.from("semed_audit").insert({
      user_id: user.id, module_code: "portal", action: uid ? "UPDATE_USER_ACCESS" : "CREATE_USER_ACCESS",
      entity_type: "auth.users", entity_id: target.id,
      metadata: { email, fullName, area, directorate, unitName, jobTitle, managerName, accountStatus, accessStartsAt, accessEndsAt, active, profileCodes: requestedProfiles, moduleOverrides: Object.keys(requestedOverrides), passwordReset: Boolean(temporaryPassword) },
    });

    return respond({ user: { user_id: target.id, email, full_name: fullName, area, directorate, unit_name: unitName, job_title: jobTitle, manager_name: managerName, account_status: accountStatus, access_starts_at: accessStartsAt, access_ends_at: accessEndsAt, active, must_change_password: mustChange } });
  } catch (error) {
    return respond({ error: error instanceof Error ? error.message : String(error) }, 400);
  }
});
