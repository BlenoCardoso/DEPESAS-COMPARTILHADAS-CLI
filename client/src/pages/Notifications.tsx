import { useAuth } from "@/_core/hooks/useAuth";
import { EmptyState } from "@/components/EmptyState";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import {
  AlarmClock,
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Filter,
  Loader2,
  MoreVertical,
  RefreshCw,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const notificationVisuals: Record<string, { icon: typeof Bell; accent: string }> = {
  expense: { icon: CreditCard, accent: "border-secondary/60 bg-secondary/10" },
  invitation: { icon: Users, accent: "border-info/60 bg-info/10" },
  reminder: { icon: AlarmClock, accent: "border-accent/60 bg-accent/10" },
  validation: { icon: CheckCheck, accent: "border-primary/60 bg-primary/10" },
  task: { icon: ClipboardList, accent: "border-primary/50 bg-primary/5" },
};

const NotificationEmptyIllustration = () => (
  <svg viewBox="0 0 220 170" role="img" aria-hidden="true" className="mx-auto h-36 w-48">
    <defs>
      <linearGradient id="notifGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7C5DFA" stopOpacity="0.65" />
        <stop offset="100%" stopColor="#FF8F70" stopOpacity="0.65" />
      </linearGradient>
      <linearGradient id="notifGlow" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#42C5C0" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#42C5C0" stopOpacity="0" />
      </linearGradient>
    </defs>
    <ellipse cx="110" cy="150" rx="70" ry="16" fill="url(#notifGlow)" />
    <rect x="36" y="32" width="148" height="96" rx="26" fill="url(#notifGradient)" opacity="0.18" />
    <rect x="26" y="44" width="148" height="96" rx="24" fill="#ffffff" stroke="#f1f0ff" strokeWidth="2" />
    <path
      d="M150 97H50l9-12v-10c0-17.673 14.327-32 32-32s32 14.327 32 32v10l9 12z"
      fill="#f5f2ff"
      stroke="#c6b7ff"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="91" cy="115" r="10" fill="#7C5DFA" opacity="0.9" />
    <circle cx="91" cy="115" r="4" fill="#ffffff" />
    <path d="M110 45a8 8 0 0 0-8-8" stroke="#7C5DFA" strokeWidth="3" strokeLinecap="round" />
    <circle cx="176" cy="54" r="6" fill="#FFB892" opacity="0.6" />
    <circle cx="54" cy="46" r="4" fill="#42C5C0" opacity="0.5" />
    <circle cx="184" cy="108" r="3" fill="#7C5DFA" opacity="0.5" />
  </svg>
);

export default function Notifications() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "expense" | "invitation" | "reminder" | "validation" | "task">("all");
  const [summaryOpen, setSummaryOpen] = useState(false);

  const notificationsInput = { unreadOnly: showUnreadOnly };
  const {
    data: notifications,
    isLoading,
    isFetching,
    refetch,
  } = trpc.notifications.list.useQuery(notificationsInput, {
    enabled: isAuthenticated,
  });

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onError: (error) => toast.error(error.message || "Nao foi possivel marcar como lida"),
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onError: (error) => toast.error(error.message || "Nao foi possivel marcar todas"),
  });

  const totalNotifications = notifications?.length ?? 0;
  const unreadCount = notifications?.filter((notification: any) => !notification.read).length ?? 0;

  const typeLabels: Record<string, string> = {
    all: "Tipo",
    expense: "Desp.",
    invitation: "Conv.",
    reminder: "Lembr.",
    validation: "Valid.",
    task: "Tarefas",
  };

  const invalidateNotifications = async () => {
    await Promise.all([
      utils.notifications.list.invalidate(notificationsInput),
      utils.notifications.getUnreadCount.invalidate(),
    ]);
  };

  const handleMarkAsRead = async (id: string, options?: { silent?: boolean }) => {
    await markAsReadMutation.mutateAsync({ id });
    await invalidateNotifications();
    if (!options?.silent) {
      toast.success("Notificacao marcada como lida");
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    await markAllAsReadMutation.mutateAsync();
    await invalidateNotifications();
    toast.success("Todas as notificacoes foram marcadas como lidas");
  };

  const handleOpenNotification = async (notification: any) => {
    const target = getNotificationTarget(notification.type);
    if (!notification.read) {
      await handleMarkAsRead(notification.id, { silent: true });
    }
    if (target) {
      navigate(target);
    }
  };

  const refreshNotifications = async () => {
    await refetch();
  };

  const isEmptyState = !isLoading && (!notifications || notifications.length === 0);
  const filteredNotifications = (notifications || []).filter((notification: any) => {
    if (typeFilter === "all") return true;
    return notification.type === typeFilter;
  });

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">Notificações</h1>
        <p className="text-sm text-muted-foreground">Alertas de convites, despesas, tarefas e lembretes.</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-1">
            <ToggleGroup
              type="single"
              value={showUnreadOnly ? "unread" : "all"}
              onValueChange={(v) => setShowUnreadOnly((v || "all") === "unread")}
              className="w-full"
              variant="outline"
            >
              <ToggleGroupItem
                value="all"
                className="flex-1 rounded-xl data-[state=on]:bg-primary/15 data-[state=on]:text-primary"
              >
                Todas
              </ToggleGroupItem>
              <ToggleGroupItem
                value="unread"
                className="flex-1 rounded-xl data-[state=on]:bg-primary/15 data-[state=on]:text-primary"
              >
                Não lidas
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 rounded-2xl interactive-tap" size="sm">
                <Filter className="h-4 w-4" />
                {typeLabels[typeFilter]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuRadioGroup value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="expense">Despesas</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="invitation">Convites</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="reminder">Lembretes</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="task">Tarefas</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="validation">Validações</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="h-6 rounded-full px-2 text-[11px]">
              Total: {isLoading ? "--" : totalNotifications}
            </Badge>
            <Badge variant="secondary" className="h-6 rounded-full px-2 text-[11px]">
              Não lidas: {isLoading ? "--" : unreadCount}
            </Badge>
            <Badge variant="outline" className="h-6 rounded-full px-2 text-[11px]">
              Mostrando: {isLoading ? "--" : filteredNotifications.length}
            </Badge>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshNotifications}
              disabled={isFetching}
              className="interactive-tap h-9 w-9 rounded-2xl"
              aria-label="Atualizar"
              title="Atualizar"
            >
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
              className="interactive-tap h-9 w-9 rounded-2xl"
              aria-label="Marcar todas como lidas"
              title="Marcar todas"
            >
              {markAllAsReadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Accordion
          type="single"
          collapsible
          value={summaryOpen ? "summary" : undefined}
          onValueChange={(v) => setSummaryOpen(v === "summary")}
        >
          <AccordionItem value="summary" className="border-none">
            <AccordionTrigger className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 hover:no-underline">
              <span className="flex flex-col items-start">
                <span className="text-sm font-semibold">Resumo</span>
                <span className="text-xs text-muted-foreground">Status e sincronização</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-3">
              <div className="rounded-2xl border border-border/60 bg-card/60 p-3 text-xs text-muted-foreground">
                Receba alertas automaticamente. Use os filtros acima para reduzir a lista e o botão de check para limpar as pendências.
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((index) => (
            <Card key={index} className="rounded-2xl border bg-card shadow-sm">
              <CardContent className="p-3">
                <div className="animate-pulse flex items-start gap-3">
                  <div className="h-9 w-9 rounded-2xl bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 rounded bg-muted" />
                    <div className="h-3 w-5/6 rounded bg-muted" />
                  </div>
                  <div className="h-9 w-9 rounded-2xl bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isEmptyState ? (
        <PageContainer className="rounded-2xl border border-border/60 bg-card/80">
          <EmptyState
            title="Nenhuma notificação"
            description={
              showUnreadOnly
                ? "Você está em dia, sem pendências a revisar."
                : "Ainda não foram gerados eventos para este usuário."
            }
            hint="Alertas chegam por push, e-mail e no app"
            icon={<NotificationEmptyIllustration />}
          />
        </PageContainer>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notification: any) => {
            const VisualIcon = notificationVisuals[notification.type]?.icon ?? Bell;
            const iconAccent = getIconAccent(notification.type);
            const createdAtText = notification.createdAt
              ? new Date(notification.createdAt).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "--";

            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
              >
                <Card
                  className={`interactive-card rounded-2xl border bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
                    notification.read ? "opacity-75" : ""
                  }`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl ${iconAccent}`}>
                        <VisualIcon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-semibold">{notification.title}</p>
                          {!notification.read ? (
                            <Badge className="h-5 rounded-full bg-primary/15 px-2 text-[11px] text-primary">Nova</Badge>
                          ) : null}
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-[12px] text-muted-foreground">{notification.message}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{createdAtText}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="interactive-tap h-9 w-9 rounded-2xl"
                          onClick={() => handleOpenNotification(notification)}
                          disabled={markAsReadMutation.isPending}
                          aria-label="Abrir"
                          title="Abrir"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="interactive-tap h-9 w-9 rounded-2xl"
                              aria-label="Mais opções"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => handleOpenNotification(notification)} disabled={markAsReadMutation.isPending}>
                              Abrir
                            </DropdownMenuItem>
                            {!notification.read ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  disabled={markAsReadMutation.isPending}
                                >
                                  <span className="flex items-center gap-2">
                                    <Check className="h-4 w-4" />
                                    Marcar como lida
                                  </span>
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getNotificationTarget(type: string): string | null {
  switch (type) {
    case "expense":
    case "validation":
      return "/shared-expenses";
    case "invitation":
      return "/invitations";
    case "reminder":
      return "/reminders";
    case "task":
      return "/tasks";
    default:
      return null;
  }
}

function getCardAccent(type: string) {
  return notificationVisuals[type]?.accent ?? "border-border/60 bg-card/80";
}

function getIconAccent(type: string) {
  switch (type) {
    case "expense":
      return "bg-secondary/10 text-foreground";
    case "invitation":
      return "bg-info/10 text-foreground";
    case "reminder":
      return "bg-accent/10 text-foreground";
    case "validation":
    case "task":
      return "bg-primary/10 text-primary";
    default:
      return "bg-muted text-foreground";
  }
}
