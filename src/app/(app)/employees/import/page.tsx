"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, Download, FileUp, TriangleAlert, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { api, downloadFile, ApiError } from "@/lib/api";
import type { ImportPreview, ImportResult } from "@/lib/types";

const FIELDS: { key: string; label: string }[] = [
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "employee_code", label: "Employee code" },
  { key: "job_role", label: "Job role" },
  { key: "team", label: "Team" },
  { key: "manager_email", label: "Manager email" },
  { key: "start_date", label: "Start date" },
  { key: "status", label: "Status" },
  { key: "tier", label: "Tier" },
  { key: "salary", label: "Salary" },
];

const FIELD_OPTIONS = [...FIELDS.map((f) => ({ value: f.key, label: f.label })), { value: "ignore", label: "— Ignore this column —" }];

type Step = 1 | 2 | 3 | 4;

export default function ImportWizardPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [duplicateMode, setDuplicateMode] = useState("SKIP");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickFile(f: File | null) {
    setFile(f);
    setPreview(null);
    setResult(null);
    setError(null);
    setStep(1);
    // reading the file IS the next step — run it straight away so the user
    // lands on the column check without another click
    if (f) void runPreview(f, duplicateMode);
  }

  async function runPreview(f: File, mode: string, newMapping?: Record<string, string>) {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("duplicateMode", mode);
      if (newMapping) fd.append("mapping", JSON.stringify(newMapping));
      const res = await api<ImportPreview>("/employees/import/preview", {
        method: "POST",
        formData: fd,
      });
      setPreview(res);
      setMapping(res.mapping);
      setStep(2);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "The file couldn't be read. Save it as CSV (UTF-8) and try again."
      );
    } finally {
      setBusy(false);
    }
  }

  async function rePreview(newMapping: Record<string, string>) {
    if (!file) return;
    setMapping(newMapping);
    await runPreview(file, duplicateMode, newMapping);
  }

  async function confirmImport() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("duplicateMode", duplicateMode);
      fd.append("mapping", JSON.stringify(mapping));
      const res = await api<ImportResult>("/employees/import", { method: "POST", formData: fd });
      setResult(res);
      setStep(4);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Import failed. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    if (!result) return;
    setBusy(true);
    try {
      const res = await api<{ message: string }>(`/employees/import/${result.batchId}/undo`, { method: "POST", body: {} });
      toast.success(res.message);
      setResult({ ...result, created: 0, updated: 0 });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Undo failed.");
    } finally {
      setBusy(false);
    }
  }

  const steps = ["Choose file", "Check columns", "Preview", "Done"];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href="/employees">
            <ChevronLeft aria-hidden="true" /> Back to employees
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Import employees from a CSV</h1>
        <p className="text-sm text-muted-foreground">Four steps. Nothing changes until you confirm at the end.</p>
      </header>

      {/* progress */}
      <ol className="flex items-center gap-2" aria-label="Progress">
        {steps.map((label, i) => {
          const n = (i + 1) as Step;
          const state = step === n ? "current" : step > n ? "done" : "todo";
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                aria-current={state === "current" ? "step" : undefined}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  state === "done"
                    ? "bg-success text-success-foreground"
                    : state === "current"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {state === "done" ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : n}
              </span>
              <span className={`hidden text-sm sm:inline ${state === "todo" ? "text-muted-foreground" : "font-medium"}`}>
                {label}
              </span>
              {i < steps.length - 1 && <span className="h-px flex-1 bg-border" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* step 1 */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Choose your file</CardTitle>
            <CardDescription>
              Start from our template — it has the right column names and example rows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={() => downloadFile("/employees/import/template", "employee-import-template.csv")}>
              <Download aria-hidden="true" /> Download the template
            </Button>
            <div className="space-y-1.5">
              <Label htmlFor="file">Your CSV file</Label>
              <Input
                id="file"
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dup">If someone is already in the system</Label>
              <Select value={duplicateMode} onValueChange={setDuplicateMode}>
                <SelectTrigger id="dup" className="w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SKIP">Skip them (keep what we have)</SelectItem>
                  <SelectItem value="UPDATE">Update them with the file&apos;s values</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {file && (
              <Button disabled={busy} onClick={() => runPreview(file, duplicateMode)}>
                <FileUp aria-hidden="true" /> {busy ? "Reading…" : "Read the file again"}
              </Button>
            )}
            {busy && <p className="text-sm text-muted-foreground">Reading your file…</p>}
          </CardContent>
        </Card>
      )}

      {/* step 2 */}
      {step === 2 && preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Do these columns look right?</CardTitle>
            <CardDescription>We matched your columns automatically. Fix any that are wrong.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {preview.columns.map((col) => (
                <div key={col} className="space-y-1.5">
                  <Label htmlFor={`map-${col}`} className="text-xs uppercase text-muted-foreground">
                    {col}
                  </Label>
                  <Select
                    value={mapping[col] ?? "ignore"}
                    onValueChange={(v) => rePreview({ ...mapping, [col]: v === "ignore" ? "" : v })}
                  >
                    <SelectTrigger id={`map-${col}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={busy}>
                Continue to preview
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* step 3 */}
      {step === 3 && preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Preview — nothing has changed yet</CardTitle>
            <CardDescription>
              <span className="font-medium text-foreground">{preview.create}</span> will be added,{" "}
              <span className="font-medium text-foreground">{preview.update}</span> updated,{" "}
              <span className="font-medium text-foreground">{preview.skip}</span> skipped,{" "}
              <span className="font-medium text-foreground">{preview.error}</span> with errors.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-96 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Person</TableHead>
                    <TableHead>What happens</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((row) => (
                    <TableRow key={row.row}>
                      <TableCell>{row.row}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {[row.data["first_name"], row.data["last_name"]].filter(Boolean).join(" ") ||
                          row.data["email"] ||
                          "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            row.action === "CREATE"
                              ? "success"
                              : row.action === "UPDATE"
                                ? "default"
                                : row.action === "SKIP"
                                  ? "secondary"
                                  : "destructive"
                          }
                        >
                          {row.action === "CREATE"
                            ? "Add"
                            : row.action === "UPDATE"
                              ? "Update"
                              : row.action === "SKIP"
                                ? "Skip"
                                : "Error"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.action === "ERROR" ? (
                          <span className="flex items-start gap-1.5 text-destructive">
                            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                            {row.errors.join(" ")}
                          </span>
                        ) : row.warnings[0] ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={confirmImport} disabled={busy || preview.error > 0 || (preview.create + preview.update === 0)}>
                {busy ? "Importing…" : `Import ${preview.create + preview.update} people`}
              </Button>
            </div>
            {preview.error > 0 && (
              <p className="text-sm text-muted-foreground">
                Fix the red rows in your file (or ignore those columns) to continue. Nothing is saved until you
                press Import.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* step 4 */}
      {step === 4 && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" /> Done
            </CardTitle>
            <CardDescription>
              Added {result.created}, updated {result.updated}, skipped {result.skipped}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(result.created > 0 || result.updated > 0) && (
              <Button variant="outline" onClick={undo} disabled={busy}>
                <Undo2 aria-hidden="true" /> Undo this import
              </Button>
            )}
            <Button asChild>
              <Link href="/employees">Go to employees</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
