import { useAuth } from "@/_core/hooks/useAuth";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { AlertCircle, FileJson, Loader2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type ExportPayloadV1 = {
  schemaVersion: 1;
  exportedAt: string;
  app: string;
  userId?: string | null;
  data: {
    personalExpenses?: any[];
    tasks?: any[];
    reminders?: any[];
    calendarEvents?: any[];
  };
};

type ExportPayloadV2 = {
  schemaVersion: 2;
  exportedAt: string;
  app: string;
  userId?: string | null;
  data: {
    personalExpenses?: any[];
    tasks?: any[];
    reminders?: any[];
    calendarEvents?: any[];
    groups?: Array<{
      group: any;
      role?: string;
      joinedAt?: string;
      categories?: any[];
      templates?: any[];
      sharedExpenses?: any[];
    }>;
  };
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseDate(value: any): Date {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

function normalizeTaskPriority(value: any): "low" | "medium" | "high" {
  const v = String(value ?? "").toLowerCase();
  if (v === "low" || v === "medium" || v === "high") return v;
  return "medium";
}

type ImportTargetMode = "new-groups" | "existing-group";

export default function ImportData() {
  const { isAuthenticated, user } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/" });
  const utils = trpc.useUtils();

  const [rawText, setRawText] = useState<string>("");
  const [payload, setPayload] = useState<(ExportPayloadV1 | ExportPayloadV2) | null>(null);
  const [error, setError] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [importTargetMode, setImportTargetMode] = useState<ImportTargetMode>("new-groups");
  const [groupMapping, setGroupMapping] = useState<Record<string, string>>({});
  const [bulkDestination, setBulkDestination] = useState<string>("__new__");

  const groupsQuery = trpc.groups.list.useQuery(undefined, { enabled: isAuthenticated });
  const groupsList = Array.isArray(groupsQuery.data) ? groupsQuery.data : [];

  const createPersonalExpense = trpc.personalExpenses.create.useMutation();
  const createTask = trpc.tasks.create.useMutation();
  const createReminder = trpc.reminders.create.useMutation();
  const createCalendarEvent = trpc.calendar.create.useMutation();

  const createGroup = trpc.groups.create.useMutation();
  const createExpenseCategory = trpc.expenseCategories.create.useMutation();
  const createExpenseTemplate = trpc.expenseTemplates.create.useMutation();
  const createSharedExpense = trpc.sharedExpenses.create.useMutation();

  const counts = useMemo(() => {
    return {
      personalExpenses: payload?.data?.personalExpenses?.length ?? 0,
      tasks: payload?.data?.tasks?.length ?? 0,
      reminders: payload?.data?.reminders?.length ?? 0,
      calendarEvents: payload?.data?.calendarEvents?.length ?? 0,
      groups: (payload as any)?.data?.groups?.length ?? 0,
    };
  }, [payload]);

  const isSchemaV2 = payload?.schemaVersion === 2;
  const v2Groups = (isSchemaV2 ? (payload as ExportPayloadV2).data.groups ?? [] : []) as any[];
  const canImport = Boolean(payload);

  const handleFile = async (file: File | null) => {
    setError("");
    setPayload(null);
    setRawText("");
    setImportTargetMode("new-groups");
    setGroupMapping({});
    setBulkDestination("__new__");

    if (!file) return;

    try {
      const text = await file.text();
      setRawText(text);
      const json = JSON.parse(text);

      if (!isObject(json)) throw new Error("Arquivo inválido");
      if (json.schemaVersion !== 1 && json.schemaVersion !== 2) throw new Error("Versão de backup não suportada");
      if (!isObject((json as any).data)) throw new Error("Backup sem campo data");

      const parsedPayload = json as ExportPayloadV1 | ExportPayloadV2;
      setPayload(parsedPayload);

      if (parsedPayload.schemaVersion === 2) {
        const groups = (parsedPayload as ExportPayloadV2).data.groups ?? [];
        const initial: Record<string, string> = {};
        groups.forEach((g, idx) => {
          const key = String(g?.group?.id ?? `${idx}`);
          initial[key] = "__new__";
        });
        setGroupMapping(initial);
      }
    } catch (err: any) {
      setError(err?.message || "Falha ao ler o arquivo");
    }
  };

  const handleImport = async () => {
    if (!isAuthenticated) return;
    if (!payload) {
      setError("Selecione um arquivo de backup válido");
      return;
    }

    const currentUserId = user?.id;
    if (!currentUserId) {
      setError("Você precisa estar autenticado para importar");
      return;
    }

    setIsImporting(true);
    setError("");

    try {
      const importedGroupIds: string[] = [];

      const personalExpenses = payload.data.personalExpenses ?? [];
      const tasks = payload.data.tasks ?? [];
      const reminders = payload.data.reminders ?? [];
      const calendarEvents = payload.data.calendarEvents ?? [];

      for (const item of personalExpenses) {
        const title = String(item?.title || "").trim();
        const amount = Number(item?.amount || 0);
        if (!title || !Number.isFinite(amount) || amount <= 0) continue;

        await createPersonalExpense.mutateAsync({
          title,
          description: item?.description ? String(item.description) : undefined,
          amount: Math.round(amount),
          currency: item?.currency ? String(item.currency) : "BRL",
          category: item?.category ? String(item.category) : undefined,
          date: parseDate(item?.date),
        });
      }

      for (const item of tasks) {
        const title = String(item?.title || "").trim();
        if (!title) continue;

        await createTask.mutateAsync({
          title,
          description: item?.description ? String(item.description) : undefined,
          priority: normalizeTaskPriority(item?.priority),
          dueDate: item?.dueDate ? parseDate(item.dueDate) : undefined,
        });
      }

      for (const item of reminders) {
        const title = String(item?.title || "").trim();
        if (!title) continue;

        await createReminder.mutateAsync({
          title,
          description: item?.description ? String(item.description) : undefined,
          category: item?.category ? String(item.category) : undefined,
          reminderDate: parseDate(item?.reminderDate || item?.date),
        });
      }

      for (const item of calendarEvents) {
        const title = String(item?.title || "").trim();
        if (!title) continue;

        await createCalendarEvent.mutateAsync({
          title,
          description: item?.description ? String(item.description) : undefined,
          startDate: parseDate(item?.startDate || item?.date),
          endDate: item?.endDate ? parseDate(item.endDate) : undefined,
          allDay: Boolean(item?.allDay ?? false),
          color: item?.color ? String(item.color) : undefined,
        });
      }

      // Groups (schema v2)
      if ((payload as ExportPayloadV2).schemaVersion === 2) {
        const p2 = payload as ExportPayloadV2;
        const groups = p2.data.groups ?? [];

        for (const entry of groups) {
          const mappingKey = String(entry?.group?.id ?? "");
          const mapped = importTargetMode === "existing-group" ? groupMapping[mappingKey] : "__new__";

          let targetGroupId: string | null = null;

          if (importTargetMode === "existing-group" && mapped && mapped !== "__new__") {
            targetGroupId = mapped;
          } else {
            const groupName = String(entry?.group?.name ?? "Grupo importado").trim() || "Grupo importado";
            const groupDescription = entry?.group?.description ? String(entry.group.description).trim() : undefined;
            const created = await createGroup.mutateAsync({
              name: groupName,
              description: groupDescription || undefined,
            });
            targetGroupId = (created as any)?.groupId || null;
          }

          if (!targetGroupId) continue;
          if (!importedGroupIds.includes(targetGroupId)) importedGroupIds.push(targetGroupId);

          // Custom categories
          for (const cat of entry?.categories ?? []) {
            const name = String(cat?.name ?? "").trim();
            if (!name) continue;
            await createExpenseCategory.mutateAsync({
              groupId: targetGroupId,
              name,
              icon: cat?.icon ? String(cat.icon) : undefined,
            });
          }

          // Recurring templates
          for (const tpl of entry?.templates ?? []) {
            const title = String(tpl?.title ?? "").trim();
            const amount = Number(tpl?.amount ?? 0);
            if (!title || !Number.isFinite(amount) || amount <= 0) continue;

            await createExpenseTemplate.mutateAsync({
              groupId: targetGroupId,
              title,
              description: tpl?.description ? String(tpl.description) : undefined,
              amount: Math.round(amount),
              currency: tpl?.currency ? String(tpl.currency) : "BRL",
              category: tpl?.category ? String(tpl.category) : undefined,
              paidBy: currentUserId,
              splitMode: "single",
              customSplits: undefined,
              frequency: tpl?.frequency ? String(tpl.frequency) : "monthly",
              dayOfWeek: typeof tpl?.dayOfWeek === "number" ? tpl.dayOfWeek : undefined,
              dayOfMonth: typeof tpl?.dayOfMonth === "number" ? tpl.dayOfMonth : undefined,
              monthOfYear: typeof tpl?.monthOfYear === "number" ? tpl.monthOfYear : undefined,
              nextDueDate: parseDate(tpl?.nextDueDate),
            } as any);
          }

          // Shared expenses
          for (const item of entry?.sharedExpenses ?? []) {
            const expense = isObject(item?.expense) ? (item as any).expense : item;
            const title = String((expense as any)?.title ?? "").trim();
            const amount = Number((expense as any)?.amount ?? 0);
            if (!title || !Number.isFinite(amount) || amount <= 0) continue;

            await createSharedExpense.mutateAsync({
              groupId: targetGroupId,
              title,
              description: (expense as any)?.description ? String((expense as any).description) : undefined,
              amount: Math.round(amount),
              currency: (expense as any)?.currency ? String((expense as any).currency) : "BRL",
              category: (expense as any)?.category ? String((expense as any).category) : undefined,
              date: parseDate((expense as any)?.date),
              paidBy: currentUserId,
              allowMemberEdits: false,
              splitMode: "single",
              customSplits: undefined,
            } as any);
          }
        }
      }

      await Promise.all([
        utils.personalExpenses.list.invalidate(),
        utils.tasks.list.invalidate(),
        utils.reminders.list.invalidate(),
        utils.calendar.list.invalidate(),
        utils.groups.list.invalidate(),
      ]);

      // Invalidate group-scoped lists for any touched group(s)
      if (importedGroupIds.length > 0) {
        await Promise.all(
          importedGroupIds.flatMap((gid) => [
            utils.sharedExpenses.list.invalidate({ groupId: gid }),
            utils.expenseCategories.list.invalidate({ groupId: gid }),
            utils.expenseTemplates.list.invalidate({ groupId: gid }),
          ])
        );
      }

      toast.success("Importação concluída");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Falha ao importar");
      toast.error("Falha ao importar");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <PageContainer className="space-y-3">
        <Card className="overflow-hidden rounded-3xl border border-border/60 bg-card/80 shadow-sm">
          <CardHeader className="space-y-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-lg">Importar dados</CardTitle>
                <CardDescription>Restaure um backup JSON exportado pelo app.</CardDescription>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background/60 text-muted-foreground ring-1 ring-border/60">
                <FileJson className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Arquivo JSON</Label>
              <Input
                type="file"
                accept="application/json,.json"
                className="rounded-2xl"
                onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-[11px] text-muted-foreground">
                Schema v1: despesas pessoais, tarefas, lembretes e calendário. Schema v2: também recria grupos, categorias,
                recorrentes e despesas compartilhadas.
              </p>
            </div>

            {isSchemaV2 && counts.groups > 0 ? (
              <div className="rounded-2xl border border-border/60 bg-background/30 p-3 space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium">Onde importar os dados de grupos?</p>
                  <p className="text-[11px] text-muted-foreground">
                    Você pode recriar os grupos (recomendado) ou importar tudo em um grupo existente.
                  </p>
                </div>

                <RadioGroup value={importTargetMode} onValueChange={(v) => setImportTargetMode(v as ImportTargetMode)} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="new-groups" id="import-new-groups" />
                    <Label htmlFor="import-new-groups" className="text-sm">Criar novos grupos</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="existing-group" id="import-existing-group" />
                    <Label htmlFor="import-existing-group" className="text-sm">Escolher destino por grupo</Label>
                  </div>
                </RadioGroup>

                {importTargetMode === "existing-group" ? (
                  <div className="space-y-3">
                    <p className="text-[11px] text-muted-foreground">
                      Para cada grupo do backup, escolha um grupo existente (ou deixe como “Criar novo”). Por segurança, tudo entra como
                      “pago por você”.
                    </p>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Aplicar para todos</Label>
                      <Select
                        value={bulkDestination}
                        onValueChange={(v) => {
                          setBulkDestination(v);
                          setGroupMapping((prev) => {
                            const next: Record<string, string> = { ...prev };
                            v2Groups.forEach((entry: any, idx: number) => {
                              const key = String(entry?.group?.id ?? `${idx}`);
                              next[key] = v;
                            });
                            return next;
                          });
                        }}
                      >
                        <SelectTrigger className="w-full rounded-2xl">
                          <SelectValue placeholder="Selecionar destino" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__new__">Criar novo grupo</SelectItem>
                          {groupsList.map((g: any) => (
                            <SelectItem key={g.group.id} value={g.group.id}>
                              {g.group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      {v2Groups.map((entry: any, idx: number) => {
                        const key = String(entry?.group?.id ?? `${idx}`);
                        const name = String(entry?.group?.name ?? `Grupo ${idx + 1}`);
                        const value = groupMapping[key] ?? "__new__";

                        return (
                          <div key={key} className="rounded-2xl border border-border/60 bg-background/40 p-3 space-y-2">
                            <p className="text-xs font-medium">{name}</p>
                            <Select
                              value={value}
                              onValueChange={(v) => setGroupMapping((prev) => ({ ...prev, [key]: v }))}
                            >
                              <SelectTrigger className="w-full rounded-2xl">
                                <SelectValue placeholder="Selecionar destino" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__new__">Criar novo grupo</SelectItem>
                                {groupsList.map((g: any) => (
                                  <SelectItem key={g.group.id} value={g.group.id}>
                                    {g.group.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {payload ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
                  <p className="text-xs text-muted-foreground">Despesas pessoais</p>
                  <p className="text-lg font-semibold">{counts.personalExpenses}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
                  <p className="text-xs text-muted-foreground">Tarefas</p>
                  <p className="text-lg font-semibold">{counts.tasks}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
                  <p className="text-xs text-muted-foreground">Lembretes</p>
                  <p className="text-lg font-semibold">{counts.reminders}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
                  <p className="text-xs text-muted-foreground">Calendário</p>
                  <p className="text-lg font-semibold">{counts.calendarEvents}</p>
                </div>
                <div className="col-span-2 rounded-2xl border border-border/60 bg-background/40 p-3">
                  <p className="text-xs text-muted-foreground">Grupos (schema v2)</p>
                  <p className="text-lg font-semibold">{counts.groups}</p>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-3 text-sm">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
                  <div className="min-w-0">
                    <p className="font-medium text-destructive">Erro</p>
                    <p className="text-xs text-muted-foreground break-words">{error}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <Button className="w-full rounded-2xl gap-2" onClick={handleImport} disabled={!canImport || isImporting}>
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Importar agora
            </Button>

            {rawText ? (
              <details className="rounded-2xl border border-border/60 bg-background/30 p-3">
                <summary className="cursor-pointer text-xs text-muted-foreground">Ver conteúdo do arquivo</summary>
                <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-words text-[11px] text-muted-foreground">
{rawText}
                </pre>
              </details>
            ) : null}
          </CardContent>
        </Card>
      </PageContainer>
    </div>
  );
}
