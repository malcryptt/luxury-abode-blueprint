const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

/**
 * Removes a team member completely: their staff record AND their Firebase login.
 * Only a signed-in admin may call it, and never on themselves.
 */
exports.removeTeamMember = onCall(async (request) => {
  const caller = request.auth?.uid;
  if (!caller) throw new HttpsError("unauthenticated", "Please sign in.");
  const db = getFirestore();
  const me = await db.doc(`staff/${caller}`).get();
  if (!me.exists || me.data().role !== "admin") throw new HttpsError("permission-denied", "Only admins can remove team members.");

  const uid = String(request.data?.uid ?? "");
  if (!uid) throw new HttpsError("invalid-argument", "Missing member.");
  if (uid === caller) throw new HttpsError("failed-precondition", "You cannot remove yourself.");

  await db.doc(`staff/${uid}`).delete();
  try {
    await getAuth().deleteUser(uid);
  } catch (e) {
    if (e.code !== "auth/user-not-found") throw new HttpsError("internal", "The access was removed but the login could not be deleted.");
  }
  return { ok: true };
});
