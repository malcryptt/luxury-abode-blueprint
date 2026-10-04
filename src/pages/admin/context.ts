import { useOutletContext } from "react-router-dom";

export type StaffRole = "admin" | "editor";

export interface AdminContext {
  userId: string;
  email: string;
  role: StaffRole;
  /** Called by the inbox so the sidebar badge stays in step. */
  refreshNewCount: () => void;
}

export const useAdmin = () => useOutletContext<AdminContext>();
