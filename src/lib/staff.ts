import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/integrations/firebase/client";

export type Session = { user: User | null; staff: boolean; ready: boolean };

/** Who is browsing: the signed-in user (if any) and whether they are a team member. Never throws. */
export function useSession(): Session {
  const [s, setS] = useState<Session>({ user: null, staff: false, ready: false });
  useEffect(() => {
    let alive = true;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return alive && setS({ user: null, staff: false, ready: true });
      let staff = false;
      try {
        const snap = await getDoc(doc(db, "staff", user.uid));
        const role = snap.exists() ? snap.data().role : null;
        staff = role === "admin" || role === "editor";
      } catch { /* treated as a normal visitor */ }
      if (alive) setS({ user, staff, ready: true });
    });
    return () => { alive = false; unsub(); };
  }, []);
  return s;
}

/** True when a signed-in team member (admin or editor) is browsing. */
export const useIsStaff = () => useSession().staff;

export const signOutUser = () => signOut(auth);
