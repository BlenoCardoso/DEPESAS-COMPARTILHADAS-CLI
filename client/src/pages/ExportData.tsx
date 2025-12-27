import { useAuth } from "@/_core/hooks/useAuth";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Download, FileJson, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type ExportPayloadV2 = {
  schemaVersion: 2;
  exportedAt: string;
  app: "depesa-compartilhada";
  userId?: string | null;
  data: {
    personalExpenses: any[];
    tasks: any[];
    reminders: any[];
    calendarEvents: any[];
    groups: Array<{
      group: any;
      role?: string;
      joinedAt?: string;
      categories: any[];
      templates: any[];
      sharedExpenses: any[];
    }>;
  };
};

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

export default function ExportData() {
  const { isAuthenticated, user } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/" });
  const utils = trpc.useUtils();
  const [isExporting, setIsExporting] = useState(false);

  const personalExpensesQuery = trpc.personalExpenses.list.useQuery(undefined, { enabled: isAuthenticated });
  const tasksQuery = trpc.tasks.list.useQuery(undefined, { enabled: isAuthenticated });
  const remindersQuery = trpc.reminders.list.useQuery(undefined, { enabled: isAuthenticated });
  const calendarQuery = trpc.calendar.list.useQuery(undefined, { enabled: isAuthenticated });
  const groupsQuery = trpc.groups.list.useQuery(undefined, { enabled: isAuthenticated });

  const isLoading =
    personalExpensesQuery.isLoading ||
    tasksQuery.isLoading ||
    remindersQuery.isLoading ||
    calendarQuery.isLoading ||
    groupsQuery.isLoading;

  const localCounts = useMemo(() => {
    return {
      personalExpenses: (personalExpensesQuery.data as any[])?.length ?? 0,
      tasks: (tasksQuery.data as any[])?.length ?? 0,
      reminders: (remindersQuery.data as any[])?.length ?? 0,
      calendarEvents: (calendarQuery.data as any[])?.length ?? 0,
      groups: (groupsQuery.data as any[])?.length ?? 0,
    };
  }, [calendarQuery.data, groupsQuery.data, personalExpensesQuery.data, remindersQuery.data, tasksQuery.data]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const [personalExpenses, tasks, reminders, calendarEvents, groups] = await Promise.all([
        utils.personalExpenses.list.fetch(undefined),
        utils.tasks.list.fetch(undefined),
        utils.reminders.list.fetch(undefined),
        utils.calendar.list.fetch(undefined),
        utils.groups.list.fetch(undefined),
      ]);

      const groupBackups = await Promise.all(
        (Array.isArray(groups) ? groups : []).map(async (g: any) => {
          const groupId = g?.group?.id;
          if (!groupId) {
            return {
              group: g?.group,
              role: g?.role,
              joinedAt: g?.joinedAt ? new Date(g.joinedAt).toISOString() : undefined,
              categories: [],
              templates: [],
              sharedExpenses: [],
            };
          }

          const [categories, templates, sharedExpenses] = await Promise.all([
            utils.expenseCategories.list.fetch({ groupId }),
            utils.expenseTemplates.list.fetch({ groupId }),
            utils.sharedExpenses.list.fetch({ groupId }),
          ]);

          return {
            group: g.group,
            role: g.role,
            joinedAt: g.joinedAt ? new Date(g.joinedAt).toISOString() : undefined,
            categories: Array.isArray(categories) ? categories : [],
            templates: Array.isArray(templates) ? templates : [],
            sharedExpenses: Array.isArray(sharedExpenses) ? sharedExpenses : [],
          };
        })
      );

      const payload: ExportPayloadV2 = {
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        app: "depesa-compartilhada",
        userId: user?.id ?? null,
        data: {
          personalExpenses: (personalExpenses as any[]) ?? [],
          tasks: (tasks as any[]) ?? [],
          reminders: (reminders as any[]) ?? [],
          calendarEvents: (calendarEvents as any[]) ?? [],
          groups: groupBackups,
        },
      };

      const safeEmail = String(user?.email || "usuario").replace(/[^a-z0-9_-]+/gi, "_");
      const date = new Date().toISOString().slice(0, 10);
      downloadJson(`backup_${safeEmail}_${date}.json`, payload);
      toast.success("Backup exportado");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao exportar");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <PageContainer className="space-y-3">
        <Card className="overflow-hidden rounded-3xl border border-border/60 bg-card/80 shadow-sm">
          <CardHeader className="space-y-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-lg">Exportar dados</CardTitle>
                <CardDescription>Baixe um arquivo JSON com seus dados pessoais.</CardDescription>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background/60 text-muted-foreground ring-1 ring-border/60">
                <FileJson className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">Despesas pessoais</p>
                <p className="text-lg font-semibold">{localCounts.personalExpenses}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">Tarefas</p>
                <p className="text-lg font-semibold">{localCounts.tasks}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">Lembretes</p>
                <p className="text-lg font-semibold">{localCounts.reminders}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">Calendário</p>
                <p className="text-lg font-semibold">{localCounts.calendarEvents}</p>
              </div>
              <div className="col-span-2 rounded-2xl border border-border/60 bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">Grupos (backup por grupo)</p>
                <p className="text-lg font-semibold">{localCounts.groups}</p>
              </div>
            </div>

            <Button className="w-full rounded-2xl gap-2" onClick={() => void handleExport()} disabled={isLoading || isExporting}>
              {isLoading || isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Baixar backup (JSON)
            </Button>

            <p className="text-[11px] text-muted-foreground">
              Este backup inclui: dados pessoais + por grupo (categorias, recorrentes e despesas compartilhadas).
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    </div>
  );
}
