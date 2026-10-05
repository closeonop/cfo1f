"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Download, Plus, TriangleAlert, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth, useSession } from "@/components/auth-provider";
import { api, downloadFile, ApiError } from "@/lib/api";
import { dateFmt, moneyFmt } from "@/lib/format";
import type { Employee, JobRole, Tier } from "@/lib/types";

interface EmployeeForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employeeCode: string;
  jobRoleId: string;
  tierId: string;
  managerId: string;
  team: string;
  startDate: string;
  status: string;
  salary: string;
  salaryReason: string;
}

const EMPTY_FORM: EmployeeForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  employeeCode: "",
  jobRoleId: "none",
  tierId: "none",
  managerId: "none",
  team: "",
  startDate: "",
  status: "ACTIVE",
  salary: "",
  salaryReason: "",
};

function toForm(e: Employee, showSalary: boolean): EmployeeForm {
  return {
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.email ?? "",
    phone: e.phone ?? "",
    employeeCode: e.employeeCode ?? "",
    jobRoleId: e.jobRoleId ? String(e.jobRoleId) : "none",
    tierId: e.tierId ? String(e.tierId) : "none",
    managerId: e.managerId ? String(e.managerId) : "none",
    team: e.team ?? "",
    startDate: e.startDate,
    status: e.status,
    salary: showSalary && e.baseSalary != null ? String(e.baseSalary) : "",
    salaryReason: "",
  };
}

export default function EmployeesPage() {
  const { user, company } = useSession();
  const { reload } = useAuth();
  const canManage = ["ADMIN", "CFO", "HR"].includes(user.role);
  const canSeeSalary = user.role === "ADMIN" || user.role === "CFO";

  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [sorting, setSorting] = useState([{ id: "firstName", desc: false }]);

  const [editing, setEditing] = useState<Employee | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<EmployeeForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Employee[]>("/employees").then(setEmployees).catch(() => toast.error("Could not load employees."));
    Promise.all([api<Tier[]>("/tiers"), api<JobRole[]>("/job-roles"), api<string[]>("/employees/teams")])
      .then(([t, r, teams]) => {
        setTiers(t);
        setRoles(r);
        setTeams(teams);
      })
      .catch(() => {});
  }, []);
  useEffect(load, [load]);

  const filtered = useMemo(() => {
    return (employees ?? []).filter((e) => {
      if (q) {
        const hay = `${e.firstName} ${e.lastName} ${e.email ?? ""} ${e.employeeCode ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (tierFilter !== "all" && String(e.tierId ?? "none") !== tierFilter) return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (teamFilter !== "all" && (e.team ?? "No team") !== teamFilter) return false;
      return true;
    });
  }, [employees, q, tierFilter, statusFilter, teamFilter]);

  const columnHelper = createColumnHelper<Employee>();
  const columns = useMemo(
    () => [
      columnHelper.accessor("firstName", {
        header: "Name",
        cell: (info) => (
          <Link
            href={`/employees/${info.row.original.id}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {info.row.original.firstName} {info.row.original.lastName}
          </Link>
        ),
      }),
      columnHelper.accessor("jobRole", { header: "Role" }),
      columnHelper.accessor("team", { header: "Team", cell: (i) => i.getValue() ?? "—" }),
      columnHelper.accessor("tier", {
        header: "Tier",
        cell: (i) => (
          <span className="inline-flex items-center gap-1.5">
            {i.getValue() ?? "—"}
            {i.row.original.salaryOutsideTier && (
              <TriangleAlert
                className="h-4 w-4 text-warning"
                aria-label={`Salary is ${i.row.original.salaryOutsideTier.toLowerCase()} this tier's range`}
              />
            )}
          </span>
        ),
      }),
      columnHelper.accessor("manager", { header: "Manager", cell: (i) => i.getValue() ?? "—" }),
      columnHelper.accessor("startDate", { header: "Started", cell: (i) => dateFmt(i.getValue()) }),
      ...(canSeeSalary
        ? [
            columnHelper.accessor("baseSalary", {
              header: "Salary",
              cell: (i) => <span className="tabular">{moneyFmt(i.getValue(), company.currency, company.locale)}</span>,
            }),
          ]
        : []),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (i) => (
          <Badge variant={i.getValue() === "ACTIVE" ? "success" : "secondary"}>
            {i.getValue() === "ACTIVE" ? "Active" : "Inactive"}
          </Badge>
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canSeeSalary]
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(e: Employee) {
    setEditing(e);
    setForm(toForm(e, canSeeSalary));
    setFormError(null);
    setFormOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    const body: Record<string, unknown> = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email || null,
      phone: form.phone || null,
      employeeCode: form.employeeCode || null,
      jobRoleId: form.jobRoleId === "none" ? null : Number(form.jobRoleId),
      tierId: form.tierId === "none" ? null : Number(form.tierId),
      managerId: form.managerId === "none" ? null : Number(form.managerId),
      team: form.team || null,
      startDate: form.startDate,
      status: form.status,
    };
    if (form.salary.trim()) {
      const salary = Number(form.salary.replace(/,/g, ""));
      if (!isNaN(salary)) {
        body.salary = salary;
        body.salaryReason = form.salaryReason || (editing ? "Direct salary update" : "Initial salary");
      }
    }
    try {
      if (editing) {
        await api(`/employees/${editing.id}`, { method: "PUT", body });
        toast.success("Employee saved.");
      } else {
        await api("/employees", { method: "POST", body });
        toast.success("Employee added.");
      }
      setFormOpen(false);
      load();
      // a new employee could be the current user's own record
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function exportCsv() {
    try {
      await downloadFile("/employees/export", "employees.csv");
      toast.success("Export downloaded.");
    } catch {
      toast.error("Export failed. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground">
            {employees == null ? "Loading…" : `${filtered.length} of ${employees.length} people`}
          </p>
        </header>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportCsv}>
              <Download aria-hidden="true" /> Export
            </Button>
            <Button variant="outline" asChild>
              <Link href="/employees/import">
                <Upload aria-hidden="true" /> Import CSV
              </Link>
            </Button>
            <Button onClick={openAdd}>
              <Plus aria-hidden="true" /> Add employee
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search name, email or code…"
          className="w-56"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search employees"
        />
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-40" aria-label="Filter by tier">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tiers</SelectItem>
            <SelectItem value="none">No tier</SelectItem>
            {tiers.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-40" aria-label="Filter by team">
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teams</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
                    <TableHead key={header.id} aria-sort={header.column.getIsSorted() === "asc" ? "ascending" : header.column.getIsSorted() === "desc" ? "descending" : undefined}>
                      {header.column.getCanSort() ? (
                        <button
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {employees == null ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-10 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-10 text-center">
                    <p className="font-medium">No employees yet.</p>
                    <p className="text-sm text-muted-foreground">
                      Add one by hand, or{" "}
                      <Link href="/employees/import" className="text-primary underline">
                        import a CSV
                      </Link>{" "}
                      to bring everyone over at once.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} onDoubleClick={() => openEdit(row.original)}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit employee" : "Add an employee"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Only fill what changes. To change pay, set a new salary and a reason — history is kept."
                : "Only name, start date and salary are truly needed; you can add the rest later."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name *</Label>
              <Input id="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name *</Label>
              <Input id="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="employeeCode">Employee code</Label>
              <Input id="employeeCode" value={form.employeeCode} onChange={(e) => setForm({ ...form, employeeCode: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="team">Team</Label>
              <Input id="team" list="team-options" value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} />
              <datalist id="team-options">
                {teams.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jobRoleId">Job role</Label>
              <Select value={form.jobRoleId} onValueChange={(v) => setForm({ ...form, jobRoleId: v })}>
                <SelectTrigger id="jobRoleId">
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tierId">Tier</Label>
              <Select value={form.tierId} onValueChange={(v) => setForm({ ...form, tierId: v })}>
                <SelectTrigger id="tierId">
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {tiers.filter((t) => !t.archived).map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="managerId">Manager</Label>
              <Select value={form.managerId} onValueChange={(v) => setForm({ ...form, managerId: v })}>
                <SelectTrigger id="managerId">
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {(employees ?? [])
                    .filter((e) => e.id !== editing?.id && e.status === "ACTIVE")
                    .map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.firstName} {e.lastName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start date *</Label>
              <Input id="startDate" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
            </div>
            {canSeeSalary && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="salary">Salary (monthly)</Label>
                  <Input
                    id="salary"
                    inputMode="decimal"
                    className="tabular"
                    value={form.salary}
                    onChange={(e) => setForm({ ...form, salary: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="salaryReason">Reason for pay change</Label>
                  <Input
                    id="salaryReason"
                    placeholder={editing ? "e.g. annual review" : "Initial salary"}
                    value={form.salaryReason}
                    onChange={(e) => setForm({ ...form, salaryReason: e.target.value })}
                  />
                </div>
              </>
            )}
            {editing && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger id="status" className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive (left the company)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {formError && (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2">
                {formError}
              </p>
            )}
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save changes" : "Add employee"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
