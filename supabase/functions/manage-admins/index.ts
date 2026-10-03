import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Not signed in" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admins only" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === "list") {
      const { data: roles, error } = await admin.from("user_roles").select("id, user_id, role").in("role", ["admin", "editor"]);
      if (error) throw error;
      const list = await Promise.all(roles.map(async (r) => {
        const { data } = await admin.auth.admin.getUserById(r.user_id);
        return { id: r.id, user_id: r.user_id, role: r.role, email: data.user?.email ?? r.user_id };
      }));
      return json({ admins: list, me: user.id });
    }

    if (action === "add") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const role = body.role === "editor" ? "editor" : "admin";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) return json({ error: "Invalid email" }, 400);
      if (password.length < 8 || password.length > 72) return json({ error: "Password must be 8–72 characters" }, 400);

      let userId: string | undefined;
      const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (created?.user) userId = created.user.id;
      else {
        // user may already exist — find them and set the given password
        let page = 1;
        while (!userId && page < 50) {
          const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
          const found = data.users.find((u) => u.email?.toLowerCase() === email);
          if (found) userId = found.id;
          if (data.users.length < 200) break;
          page++;
        }
        if (!userId) return json({ error: createErr?.message ?? "Could not create user" }, 400);
        await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
      }
      // One staff role per person: swap any existing one for the chosen role.
      await admin.from("user_roles").delete().eq("user_id", userId).in("role", ["admin", "editor"]);
      const { error } = await admin.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "setRole") {
      const role = body.role === "editor" ? "editor" : "admin";
      const { data: row } = await admin.from("user_roles").select("user_id").eq("id", body.roleId).in("role", ["admin", "editor"]).maybeSingle();
      if (!row) return json({ error: "Not found" }, 404);
      if (row.user_id === user.id) return json({ error: "You can't change your own role" }, 400);
      const { error } = await admin.from("user_roles").update({ role }).eq("id", body.roleId);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "remove") {
      const { data: role } = await admin.from("user_roles").select("user_id").eq("id", body.roleId).in("role", ["admin", "editor"]).maybeSingle();
      if (!role) return json({ error: "Not found" }, 404);
      if (role.user_id === user.id) return json({ error: "You can't remove yourself" }, 400);
      const { error } = await admin.from("user_roles").delete().eq("id", body.roleId);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
