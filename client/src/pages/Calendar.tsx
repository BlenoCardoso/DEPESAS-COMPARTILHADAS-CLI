import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { trpc } from "@/lib/trpc";
import { Loader2, MoreVertical, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const CalendarEmptyIllustration = () => (
  <svg
    viewBox="0 0 220 170"
    role="img"
    aria-hidden="true"
    className="mx-auto h-36 w-48 text-primary/20"
  >
    <ellipse cx="110" cy="152" rx="70" ry="16" fill="currentColor" opacity="0.12" />
    <rect x="34" y="30" width="154" height="106" rx="26" fill="currentColor" opacity="0.16" />
    <rect
      x="26"
      y="44"
      width="148"
      height="100"
      rx="22"
      fill="hsl(var(--card))"
      stroke="hsl(var(--border))"
      strokeWidth="2"
    />
    <rect x="26" y="44" width="148" height="34" rx="18" fill="hsl(var(--muted))" opacity="0.55" />
    <circle cx="62" cy="47" r="12" fill="hsl(var(--primary))" opacity="0.65" />
    <circle cx="138" cy="47" r="12" fill="hsl(var(--secondary))" opacity="0.65" />
    {[0, 1, 2].map((row) => (
      <g key={row} transform={`translate(46 ${92 + row * 18})`}>
        {[0, 1, 2, 3].map((col) => (
          <rect
            key={col}
            x={col * 22}
            y={0}
            width={16}
            height={12}
            rx={4}
            fill="hsl(var(--muted))"
            opacity="0.85"
          />
        ))}
      </g>
    ))}
    <rect x="78" y="104" width="32" height="20" rx="6" fill="hsl(var(--accent))" opacity="0.35" />
    <rect x="114" y="122" width="28" height="16" rx="5" fill="hsl(var(--secondary))" opacity="0.35" />
  </svg>
);

export default function Calendar() {
  const { isAuthenticated } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().substring(0, 16));
  const [endDate, setEndDate] = useState<string>("");
  const [allDay, setAllDay] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [whenFilter, setWhenFilter] = useState<"upcoming" | "today" | "past" | "all">("upcoming");
  const [filterText, setFilterText] = useState("");

  const { data: events, isLoading, refetch } = trpc.calendar.list.useQuery(undefined, { enabled: isAuthenticated });

  const eventsList = Array.isArray(events) ? (events as any[]) : [];

  const stats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    let today = 0;
    let upcoming = 0;
    for (const ev of eventsList) {
      const start = ev?.startDate ? new Date(ev.startDate) : null;
      if (!start || Number.isNaN(start.getTime())) continue;
      if (start >= startOfDay && start <= endOfDay) today++;
      if (start >= now) upcoming++;
    }

    return {
      total: eventsList.length,
      today,
      upcoming,
    };
  }, [eventsList]);

  const visibleEvents = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    let list = eventsList;
    if (whenFilter !== "all") {
      list = list.filter((ev) => {
        const start = ev?.startDate ? new Date(ev.startDate) : null;
        if (!start || Number.isNaN(start.getTime())) return false;
        if (whenFilter === "today") return start >= startOfDay && start <= endOfDay;
        if (whenFilter === "upcoming") return start >= now;
        return start < now;
      });
    }
    if (filterText) {
      const q = filterText.toLowerCase();
      list = list.filter((ev) => String(ev?.title || "").toLowerCase().includes(q));
    }
    return list;
  }, [eventsList, whenFilter, filterText]);

  const createMutation = trpc.calendar.create.useMutation({
    onSuccess: () => { toast.success("Evento criado"); setIsCreateOpen(false); setTitle(""); setEndDate(""); setAllDay(false); refetch(); },
    onError: e => toast.error(e.message),
  });
  const deleteMutation = trpc.calendar.delete.useMutation({ onSuccess: () => { toast.success("Evento removido"); refetch(); }, onError: e => toast.error(e.message) });

  const handleCreate = () => {
    if (!title.trim()) { toast.error("Título obrigatório"); return; }
    // Omitir description quando não utilizada para evitar erro Firestore
    createMutation.mutate({ title, startDate: new Date(startDate), endDate: endDate ? new Date(endDate) : undefined, allDay });
  };
  const handleDelete = (id: string) => { if (confirm("Remover evento?")) deleteMutation.mutate({ id }); };

  const getEventAccent = (isAllDay: boolean) =>
    isAllDay
      ? "bg-secondary/10"
      : "bg-primary/10";

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Calendário</h1>
            <p className="text-sm text-muted-foreground">Organize eventos por data e hora.</p>
          </div>
          <Badge
            variant="outline"
            className={
              "shrink-0 rounded-full text-[11px] border " +
              (stats.today > 0
                ? "bg-warning/15 text-warning border-warning/25"
                : "bg-primary/10 text-primary border-primary/20")
            }
          >
            {stats.today > 0 ? `Hoje: ${stats.today}` : `Próximos: ${stats.upcoming}`}
          </Badge>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-1">
        <ToggleGroup
          type="single"
          value={whenFilter}
          onValueChange={(v) => setWhenFilter((v as any) || "upcoming")}
          className="w-full"
          variant="outline"
        >
          <ToggleGroupItem value="upcoming" className="flex-1 rounded-xl">
            Próximos
          </ToggleGroupItem>
          <ToggleGroupItem value="today" className="flex-1 rounded-xl">
            Hoje
          </ToggleGroupItem>
          <ToggleGroupItem value="past" className="flex-1 rounded-xl">
            Passados
          </ToggleGroupItem>
          <ToggleGroupItem value="all" className="flex-1 rounded-xl">
            Todos
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Accordion type="single" collapsible defaultValue={undefined}>
        <AccordionItem value="stats" className="border-none">
          <AccordionTrigger className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 hover:no-underline">
            <span className="flex flex-col items-start">
              <span className="text-sm font-semibold">Resumo</span>
              <span className="text-xs text-muted-foreground">
                Total {stats.total} • Hoje {stats.today} • Próximos {stats.upcoming}
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-3">
            <div className="grid grid-cols-3 gap-2">
              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-display tabular-nums mt-1 text-2xl font-bold leading-none tracking-tight">{stats.total}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Hoje</p>
                  <p className="font-display tabular-nums mt-1 text-2xl font-bold leading-none tracking-tight">{stats.today}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Próximos</p>
                  <p className="font-display tabular-nums mt-1 text-2xl font-bold leading-none tracking-tight">{stats.upcoming}</p>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <PageContainer className="rounded-2xl border border-border/60 bg-card/60 p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold">Ações</p>
            <p className="text-xs text-muted-foreground">Crie e filtre sem poluir a lista.</p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="interactive-tap w-full gap-2 rounded-2xl sm:w-auto">
                <Plus className="h-4 w-4" /> Novo evento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Evento</DialogTitle>
                <DialogDescription>Crie um evento simples</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2"><Label>Título *</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
                <div className="space-y-2"><Label>Início</Label><Input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Fim (opcional)</Label><Input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
                <div className="flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3">
                  <div className="space-y-0.5">
                    <Label>Dia inteiro</Label>
                    <p className="text-xs text-muted-foreground">Fica no topo do calendário</p>
                  </div>
                  <Switch checked={allDay} onCheckedChange={setAllDay} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>{createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Accordion
          type="single"
          collapsible
          value={filtersOpen ? "filters" : undefined}
          onValueChange={(v) => setFiltersOpen(v === "filters")}
        >
          <AccordionItem value="filters" className="mt-2 border-none">
            <AccordionTrigger className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3 hover:no-underline">
              <span className="flex flex-col items-start">
                <span className="text-sm font-semibold">Filtros</span>
                <span className="text-xs text-muted-foreground">Busca rápida por título</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Busca</Label>
                  <Input
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    placeholder="Título do evento"
                    className="w-full rounded-2xl"
                  />
                </div>
                {(filterText || whenFilter !== "upcoming") && (
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="interactive-tap w-full rounded-2xl"
                      onClick={() => {
                        setFilterText("");
                        setWhenFilter("upcoming");
                      }}
                    >
                      Limpar filtros
                    </Button>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </PageContainer>
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : eventsList.length === 0 ? (
        <Card className="rounded-2xl border border-border/70 interactive-card">
          <CardContent className="py-10 text-center space-y-4">
            <div className="hidden sm:block">
              <CalendarEmptyIllustration />
            </div>
            <div className="space-y-2">
              <p className="text-base font-semibold">Nenhum evento</p>
              <p className="text-sm text-muted-foreground">Crie seu primeiro evento.</p>
            </div>
            <Button onClick={() => setIsCreateOpen(true)} className="interactive-tap rounded-2xl">Criar primeiro</Button>
          </CardContent>
        </Card>
      ) : (
        <PageContainer className="space-y-2">
          {visibleEvents.length === 0 ? (
            <Card className="rounded-2xl border border-border/70">
              <CardContent className="py-10 text-center space-y-2">
                <p className="text-muted-foreground">Nenhum evento com esses filtros</p>
                <Button
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => {
                    setFilterText("");
                    setWhenFilter("upcoming");
                  }}
                >
                  Limpar filtros
                </Button>
              </CardContent>
            </Card>
          ) : (
            visibleEvents.map((ev) => {
              const isAllDay = Boolean((ev as any).allDay);
              const start = (ev as any).startDate ? new Date((ev as any).startDate) : null;
              const end = (ev as any).endDate ? new Date((ev as any).endDate) : null;

              const isToday = (() => {
                if (!start || Number.isNaN(start.getTime())) return false;
                const now = new Date();
                const startOfDay = new Date(now);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(now);
                endOfDay.setHours(23, 59, 59, 999);
                return start >= startOfDay && start <= endOfDay;
              })();

              const startLabel = start
                ? isAllDay
                  ? start.toLocaleDateString("pt-BR")
                  : start.toLocaleString("pt-BR")
                : "—";
              const endLabel = end
                ? isAllDay
                  ? end.toLocaleDateString("pt-BR")
                  : end.toLocaleString("pt-BR")
                : "";

              return (
                <Card
                  key={(ev as any).id}
                  className={
                    `interactive-card rounded-2xl border border-border/60 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${getEventAccent(isAllDay)}`
                  }
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{(ev as any).title}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="text-[11px] text-muted-foreground">{startLabel}</span>
                          {Boolean((ev as any).endDate) && endLabel ? (
                            <span className="text-[11px] text-muted-foreground">→ {endLabel}</span>
                          ) : null}
                          {isAllDay ? (
                            <Badge variant="secondary" className="h-5 rounded-full px-2 text-[11px]">
                              Dia inteiro
                            </Badge>
                          ) : null}
                          {isToday ? (
                            <Badge
                              variant="outline"
                              className="h-5 rounded-full px-2 text-[11px] bg-warning/15 text-warning border-warning/25"
                            >
                              Hoje
                            </Badge>
                          ) : null}
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="interactive-tap h-9 w-9 rounded-2xl" aria-label="Mais opções">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete((ev as any).id)}
                            disabled={deleteMutation.isPending}
                          >
                            <span className="flex items-center gap-2">
                              <Trash2 className="h-4 w-4" />
                              Remover
                            </span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </PageContainer>
      )}
    </div>
  );
}
