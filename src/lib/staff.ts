import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/integrations/firebase/client";

/** True when a signed-in team member (admin or editor) is browsing. Never throws; false while unknown. */
export function useIsStaff() {
  const [staff, setStaff] = useState(false);
  useEffect(() => {
    let alive = true;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return alive && setStaff(false);
      try {
        const snap = await getDoc(doc(db, "staff", user.uid));
        const role = snap.exists() ? snap.data().role : null;
        if (alive) setStaff(role === "admin" || role === "editor");
      } catch {
        if (alive) setStaff(false);
      }
    });
    return () => { alive = false; unsub(); };
  }, []);
  return staff;
}
