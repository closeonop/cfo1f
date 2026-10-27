import type { Employee, User } from "./types";
export interface HrField { key: string; label: string; type: string; required: boolean; options: string[]; reference: string | null }
export interface HrModule { key: string; label: string; group: string; description: string; employeeScoped: boolean; access: string; fields: HrField[] }
export interface HrRecord { id: number; kind: string; employeeId: number | null; ownerId: number; data: Record<string, unknown>; createdAt: string; updatedAt: string }
export const groupSlug = (group: string) => group.toLowerCase().replace(/ /g, "-");
export const isHr = (user: User) => ["ADMIN", "HR"].includes(user.role);
export const manages = (user: User, employee: Employee | undefined) => isHr(user) || (user.role === "MANAGER" && employee?.managerId === user.employeeId);
export function canWrite(user: User, module: HrModule, employee: Employee | undefined) {
  if (module.access === "hiring") return isHr(user) || (module.key === "interview" && user.role === "MANAGER");
  if (module.key === "leave-balance") return isHr(user);
  if (module.employeeScoped) return manages(user, employee) || (["self", "request"].includes(module.access) && employee?.id === user.employeeId) || (module.access === "reward" && user.role === "CFO");
  return module.access === "hr" ? isHr(user) : module.access === "project" ? isHr(user) || user.role === "MANAGER" : user.role === "ADMIN" || (isHr(user) && module.key === "policy");
}
export const visibleModule = (user: User, module: HrModule) => (module.access !== "hr" || isHr(user)) && (module.access !== "hiring" || isHr(user) || user.role === "MANAGER") && (module.key !== "hr-settings" || user.role === "ADMIN");

export function humanize(value: unknown) {
  const text=String(value??"").replace(/_/g," ").toLowerCase();
  return text==="todo"?"To do":text.charAt(0).toUpperCase()+text.slice(1);
}
