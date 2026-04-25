import { useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Upload, FileText, AlertTriangle, Trash2, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";

import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { pdfApi, projectsApi } from "@/lib/api";
import {
  EXPENSE_CATEGORIES,
  type ParsedTransaction,
  type PdfParseResponse,
} from "@/lib/types";
import { formatMoney } from "@/lib/format";

interface PreviewRow extends ParsedTransaction {
  __id: string;
  __selected: boolean;
}

const PdfImportPage = () => {
  const [params] = useSearchParams();
  const initialProject = params.get("project_id") ?? "";
  const fileRef = useRef<HTMLInputElement>(null);

  const [projectId, setProjectId] = useState(initialProject);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<PdfParseResponse | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);

  const projectsQ = useQuery({ queryKey: ["projects"], queryFn: () => projectsApi.list() });

  const parseMut = useMutation({
    mutationFn: ({ projectId, file }: { projectId: string; file: File }) =>
      pdfApi.parse(projectId, file),
    onSuccess: (data) => {
      setParsed(data);
      setRows(
        data.transactions.map((t, idx) => ({
          ...t,
          __id: `${t.index ?? idx}-${t.transaction_date}-${t.amount}`,
          __selected: !t.is_likely_duplicate,
        })),
      );
      toast.success(`Parsed ${data.candidate_count} transactions`);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Failed to parse PDF"),
  });

  const confirmMut = useMutation({
    mutationFn: () => {
      if (!parsed) throw new Error("Nothing to confirm");
      const confirmed = rows
        .filter((r) => r.__selected)
        .map(({ __id, __selected, index, is_likely_duplicate, duplicate_reason, ...rest }) => ({
          ...rest,
          selected: true,
        }));
      return pdfApi.confirm({
        project_id: parsed.project_id,
        filename: parsed.filename,
        file_hash: parsed.file_hash,
        statement_date: parsed.statement_date,
        statement_period_start: parsed.statement_period_start,
        statement_period_end: parsed.statement_period_end,
        candidate_count: parsed.candidate_count,
        transactions: confirmed,
      });
    },
    onSuccess: (res) => {
      toast.success(`Saved ${res.created_count} expenses`);
      reset();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Failed to save expenses"),
  });

  const reset = () => {
    setFile(null);
    setParsed(null);
    setRows([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleParse = () => {
    if (!projectId) return toast.error("Select a project first");
    if (!file) return toast.error("Choose a PDF file");
    if (!file.name.toLowerCase().endsWith(".pdf")) return toast.error("File must be a PDF");
    parseMut.mutate({ projectId, file });
  };

  const updateRow = (id: string, patch: Partial<PreviewRow>) => {
    setRows((prev) => prev.map((r) => (r.__id === id ? { ...r, ...patch } : r)));
  };
  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.__id !== id));

  const selectedCount = rows.filter((r) => r.__selected).length;
  const selectedTotal = rows.filter((r) => r.__selected).reduce((s, r) => s + r.amount, 0);
  const allChecked = rows.length > 0 && selectedCount === rows.length;
  const statementPeriod =
    parsed && (parsed.statement_period_start || parsed.statement_period_end)
      ? `${parsed.statement_period_start ?? "?"} - ${parsed.statement_period_end ?? "?"}`
      : "-";
  const toggleAll = () =>
    setRows((prev) => prev.map((r) => ({ ...r, __selected: !allChecked })));

  return (
    <div>
      <PageHeader
        eyebrow="04 / Import"
        title="PDF Import"
        description="Upload a credit-card statement PDF. Review extracted transactions, edit if needed, then save them as expenses."
      />

      {!parsed ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 panel p-6 space-y-4">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Project
              </Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {(projectsQ.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Statement PDF
              </Label>
              <div
                className="mt-1 border-2 border-dashed border-border rounded-md p-8 text-center hover:bg-muted/40 transition-colors cursor-pointer"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                {file ? (
                  <div>
                    <div className="font-mono text-sm break-all">{file.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="font-mono text-sm">Click to browse PDF</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Text-based PDFs only — scanned/image PDFs are not supported.
                    </div>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {file && (
                <Button variant="outline" onClick={reset}>
                  Clear
                </Button>
              )}
              <Button onClick={handleParse} disabled={parseMut.isPending || !file || !projectId}>
                {parseMut.isPending ? "Parsing…" : "Parse PDF"}
              </Button>
            </div>
          </div>

          <div className="panel p-6">
            <h3 className="font-mono text-base text-brand-dark mb-3">How it works</h3>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <Step n={1} text="Pick a project and upload a credit card statement PDF." />
              <Step n={2} text="Backend extracts candidate transactions and returns a preview." />
              <Step n={3} text="Review, edit, deselect, or remove rows you don't want." />
              <Step n={4} text="Confirm — selected rows are saved as expenses on the project." />
            </ol>
            <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
              <p className="flex gap-2 items-start">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-warning flex-shrink-0" />
                Account summaries, payments, credits and CR rows are automatically ignored.
              </p>
            </div>
          </div>
        </div>
      ) : (
        // Preview & confirm
        <div className="space-y-6">
          <div className="panel p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Meta label="File" value={parsed.filename} mono />
            <Meta label="Statement date" value={parsed.statement_date ?? "-"} />
            <Meta label="Period" value={statementPeriod} />
            <Meta label="Candidates" value={String(parsed.candidate_count)} />
          </div>

          {parsed.duplicate_file && (
            <div className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 flex gap-2 items-start">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
              <div className="text-sm">
                This PDF appears to have been imported before. Review carefully to avoid duplicates.
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-md border border-border bg-card px-4 py-2.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Selected
              </div>
              <div className="data-point text-base">
                {selectedCount} / {rows.length}
              </div>
            </div>
            <div className="rounded-md border border-border bg-card px-4 py-2.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Selected total
              </div>
              <div className="data-point text-base">{formatMoney(selectedTotal)}</div>
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={reset}>
                <X className="h-4 w-4 mr-1.5" /> Cancel import
              </Button>
              <Button
                onClick={() => confirmMut.mutate()}
                disabled={confirmMut.isPending || selectedCount === 0}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                {confirmMut.isPending ? "Saving…" : `Save ${selectedCount} expenses`}
              </Button>
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-brand-light/40 text-[10px] uppercase tracking-wider">
                    <th className="text-left font-mono font-medium px-3 py-2.5 w-10">
                      <Checkbox checked={allChecked} onCheckedChange={toggleAll} />
                    </th>
                    <th className="text-left font-mono font-medium px-3 py-2.5">Trans. Date</th>
                    <th className="text-left font-mono font-medium px-3 py-2.5">Post Date</th>
                    <th className="text-left font-mono font-medium px-3 py-2.5">Description</th>
                    <th className="text-right font-mono font-medium px-3 py-2.5">Amount</th>
                    <th className="text-left font-mono font-medium px-3 py-2.5">Category</th>
                    <th className="text-center font-mono font-medium px-3 py-2.5">Claimed</th>
                    <th className="text-right font-mono font-medium px-3 py-2.5 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.__id}
                      className={`border-t border-border ${r.is_likely_duplicate ? "bg-warning/5" : ""}`}
                    >
                      <td className="px-3 py-2">
                        <Checkbox
                          checked={r.__selected}
                          onCheckedChange={(v) => updateRow(r.__id, { __selected: !!v })}
                        />
                      </td>
                      <td className="px-3 py-2 data-point text-xs whitespace-nowrap">
                        {r.transaction_date}
                      </td>
                      <td className="px-3 py-2 data-point text-xs whitespace-nowrap">
                        {r.post_date ?? "—"}
                      </td>
                      <td className="px-3 py-2 min-w-[220px]">
                        <Input
                          value={r.description}
                          onChange={(e) => updateRow(r.__id, { description: e.target.value })}
                          className="h-8 text-sm"
                        />
                        {r.is_likely_duplicate && (
                          <div className="mt-1 space-y-1">
                            <Badge
                              variant="outline"
                              className="font-mono text-[9px] uppercase tracking-wider border-warning/40 text-warning"
                            >
                              possible duplicate
                            </Badge>
                            {r.duplicate_reason && (
                              <div className="text-[11px] text-warning">{r.duplicate_reason}</div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right data-point whitespace-nowrap">
                        {formatMoney(r.amount, r.currency)}
                      </td>
                      <td className="px-3 py-2 min-w-[160px]">
                        <Select
                          value={r.category}
                          onValueChange={(v) => updateRow(r.__id, { category: v })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EXPENSE_CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Switch
                          checked={r.is_claimed}
                          onCheckedChange={(v) => updateRow(r.__id, { is_claimed: v })}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeRow(r.__id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center text-sm text-muted-foreground py-12">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        All rows removed. Cancel and re-upload to start over.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Step = ({ n, text }: { n: number; text: string }) => (
  <li className="flex gap-3">
    <span className="font-mono text-xs h-5 w-5 rounded-sm bg-brand-dark text-brand-foreground grid place-items-center flex-shrink-0">
      {n}
    </span>
    <span>{text}</span>
  </li>
);

const Meta = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div>
    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
      {label}
    </div>
    <div className={mono ? "data-point text-sm break-all" : "text-sm"}>{value}</div>
  </div>
);

export default PdfImportPage;
