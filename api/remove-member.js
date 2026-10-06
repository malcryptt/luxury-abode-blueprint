// Vercel serverless function: removes a team member completely (staff record + Firebase login).
// Runs on Vercel's free plan, so no Firebase billing plan is needed.
// Needs one environment variable in Vercel: FIREBASE_SERVICE_ACCOUNT (the service-account JSON, as text).
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/** Reads FIREBASE_SERVICE_ACCOUNT, forgiving the usual paste mistakes (wrapping quotes, base64, "\\n" in the key). */
function serviceAccount() {
  let raw = (process.env.FIREBASE_SERVICE_ACCOUNT || "").trim();
  if (!raw) throw Object.assign(new Error("not-configured"), { status: 501 });
  const bad = () => Object.assign(new Error("bad-config"), { status: 500, code: "bad-config" });
  let sa;
  try {
    if (!raw.startsWith("{") && !raw.startsWith('"')) raw = Buffer.from(raw, "base64").toString("utf8").trim();
    sa = JSON.parse(raw);
    if (typeof sa === "string") sa = JSON.parse(sa); // the whole value was pasted as a quoted string
  } catch { throw bad(); }
  if (!sa || !sa.client_email || !sa.private_key || !sa.project_id) throw bad();
  sa.private_key = String(sa.private_key).replace(/\\n/g, "\n");
  return sa;
}

function admin() {
  if (!getApps().length) {
    try { initializeApp({ credential: cert(serviceAccount()) }); }
    catch (e) { throw e.status ? e : Object.assign(new Error("bad-config"), { status: 500, code: "bad-config" }); }
  }
  return { auth: getAuth(), db: getFirestore() };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Open /api/remove-member in a browser to check the setup. It reports whether the setting is present and valid, never its contents.
  if (req.method === "GET") {
    try { const sa = serviceAccount(); return res.status(200).json({ ok: true, configured: true, projectId: sa.project_id }); }
    catch (e) { return res.status(200).json({ ok: false, configured: e.status !== 501, problem: e.status === 501 ? "FIREBASE_SERVICE_ACCOUNT is not set in Vercel" : "FIREBASE_SERVICE_ACCOUNT is set but is not a valid service-account JSON" }); }
  }
  if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).json({ error: "Method not allowed" }); }
  try {
    const { auth, db } = admin();

    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Please sign in." });
    let caller;
    try { caller = await auth.verifyIdToken(token, true); } catch { return res.status(401).json({ error: "Please sign in again." }); }

    const me = await db.doc(`staff/${caller.uid}`).get();
    if (!me.exists || me.data().role !== "admin") return res.status(403).json({ error: "Only admins can remove team members." });

    const uid = String((req.body && req.body.uid) || "");
    // Firebase uids are plain letters and digits. Anything else (such as a "/") could point at a different document.
    if (!/^[A-Za-z0-9]{6,128}$/.test(uid)) return res.status(400).json({ error: "Missing or invalid member." });
    if (uid === caller.uid) return res.status(400).json({ error: "You cannot remove yourself." });
    const target = await db.doc(`staff/${uid}`).get();
    if (target.exists && String(target.data().email || "").toLowerCase() === "hello@zexlabs.com.ng") return res.status(403).json({ error: "This is the technical admin account and cannot be removed." });

    await db.doc(`staff/${uid}`).delete();
    try {
      await auth.deleteUser(uid);
    } catch (e) {
      if (e.code !== "auth/user-not-found") return res.status(500).json({ error: "Access was removed but the login could not be deleted." });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    if (e.status === 501) return res.status(501).json({ error: "not-configured" });
    if (e.code === "bad-config") return res.status(500).json({ error: "bad-config" });
    console.error(e);
    return res.status(500).json({ error: "Something went wrong." });
  }
}
