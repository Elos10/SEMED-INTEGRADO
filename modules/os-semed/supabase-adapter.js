import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "../../supabase-config.js";

const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

function throwIfError(result) {
  if (result.error) throw result.error;
  return result.data;
}

window.OS_SUPABASE = {
  async login(email, password) {
    const auth = throwIfError(await client.auth.signInWithPassword({ email, password }));
    const profile = throwIfError(await client.from("os_profiles").select("*").eq("user_id", auth.user.id).eq("active", true).single());
    return { authUser: auth.user, profile };
  },
  async restoreSession() {
    const { data: { session } } = await client.auth.getSession();
    if (!session?.user) return null;
    const profile = throwIfError(await client.from("os_profiles").select("*").eq("user_id", session.user.id).eq("active", true).single());
    return { authUser: session.user, profile };
  },
  async logout() { throwIfError(await client.auth.signOut()); },
  async loadOrders() {
    const rows = throwIfError(await client.from("os_orders").select("*").order("opened_at", { ascending: false }));
    return rows.map((row) => ({ ...row.payload, id: row.id, active: row.active, openedAt: row.opened_at, openedBy: row.opened_by_email, persisted: true }));
  },
  async saveOrder(order) {
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error("Sessão expirada.");
    const record = {
      id: order.id,
      opened_by: user.id,
      opened_by_email: order.openedBy,
      assigned_to_email: order.assignedToEmail || "",
      active: order.active !== false,
      opened_at: order.openedAt,
      payload: order,
    };
    if (order.persisted) {
      const changes = { assigned_to_email: record.assigned_to_email, active: record.active, payload: { ...order, persisted: undefined } };
      throwIfError(await client.from("os_orders").update(changes).eq("id", order.id));
    } else {
      record.payload = { ...order, persisted: undefined };
      throwIfError(await client.from("os_orders").insert(record));
      order.persisted = true;
    }
  },
  async deleteOrder(id) { throwIfError(await client.from("os_orders").delete().eq("id", id)); },
  async loadReads() {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return [];
    const rows = throwIfError(await client.from("os_notification_reads").select("order_id").eq("user_id", user.id));
    return rows.map((row) => row.order_id);
  },
  async markRead(orderId) {
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error("Sessão expirada.");
    throwIfError(await client.from("os_notification_reads").upsert({ user_id: user.id, order_id: orderId }));
  },
};

window.dispatchEvent(new Event("os-supabase-ready"));
