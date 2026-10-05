// Vercel serverless function: removes a team member completely (staff record + Firebase login).
// Runs on Vercel's free plan, so no Firebase billing plan is needed.
// Needs one environment variable in Vercel: FIREBASE_SERVICE_ACCOUNT (the service-account JSON, as text).
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function admin() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw Object.assign(new Error("not-configured"), { status: 501 });
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return { auth: getAuth(), db: getFirestore() };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed" }); }
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

    await db.doc(`staff/${uid}`).delete();
    try {
      await auth.deleteUser(uid);
    } catch (e) {
      if (e.code !== "auth/user-not-found") return res.status(500).json({ error: "Access was removed but the login could not be deleted." });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    if (e.status === 501) return res.status(501).json({ error: "not-configured" });
    console.error(e);
    return res.status(500).json({ error: "Something went wrong." });
  }
}
