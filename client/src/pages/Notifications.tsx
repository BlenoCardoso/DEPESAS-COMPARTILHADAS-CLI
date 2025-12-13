import { useAuth } from "@/_core/hooks/useAuth";
import { EmptyState } from "@/components/EmptyState";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import {
  AlarmClock,
  Bell,
  Check,
  CheckCheck,
  ClipboardList,
  CreditCard,
  Loader2,
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

  const heroStats = [
    { label: "Notificacoes", value: isLoading ? "--" : totalNotifications, helper: "Sincronizadas do Firebase" },
    {
      label: "Nao lidas",
      value: isLoading ? "--" : unreadCount,
      helper: unreadCount === 1 ? "alerta pendente" : "alertas pendentes",
    },
    {
      label: "Filtro",
      value: showUnreadOnly ? "Apenas nao lidas" : "Todas",
      helper: "Atualize em tempo real",
    },
  ];

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

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <PageContainer className="app-hero space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Central de alertas</p>
            <h1 className="text-3xl font-semibold sm:text-4xl">Convites, despesas e lembretes em tempo real</h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Toda movimentacao importante vira uma notificacao que voce pode acompanhar, abrir e marcar como lida.
            </p>
          </div>
          <div className="hidden h-12 w-12 items-center justify-center rounded-2xl gradient-secondary text-white shadow-lg sm:flex">
            <Bell className="h-6 w-6" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {heroStats.map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 22 }}
              className="glass-panel rounded-3xl border border-border/70 p-4"
            >
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-semibold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.helper}</p>
            </motion.div>
          ))}
        </div>
      </PageContainer>

      <PageContainer className="glass-panel space-y-4 rounded-3xl border border-border/70 bg-card/70">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Filtros e acoes</h2>
            <p className="text-sm text-muted-foreground">
              Escolha entre todas as notificacoes ou somente nao lidas, atualize os dados e limpe a fila quando quiser.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant={showUnreadOnly ? "default" : "outline"}
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className="gap-2 w-full sm:w-auto interactive-tap"
            >
              <Bell className="h-4 w-4" />
              {showUnreadOnly ? "Ver todas" : "Apenas nao lidas"}
            </Button>
            <Button
              variant="outline"
              onClick={refreshNotifications}
              disabled={isFetching}
              className="gap-2 w-full sm:w-auto interactive-tap"
            >
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar
            </Button>
            <Button
              variant="outline"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
              className="gap-2 w-full sm:w-auto interactive-tap"
            >
              {markAllAsReadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
              Marcar todas
            </Button>
          </div>
        </div>
      </PageContainer>

      {isLoading ? (
        <PageContainer className="space-y-3">
          {[1, 2, 3].map((index) => (
            <Card key={index} className="rounded-3xl border border-border/60 bg-card/70">
              <CardHeader className="animate-pulse space-y-3">
                <div className="h-4 w-1/3 rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-2/3 rounded bg-muted" />
              </CardHeader>
            </Card>
          ))}
        </PageContainer>
      ) : isEmptyState ? (
        <PageContainer className="rounded-3xl border border-border/60 bg-card/80">
          <EmptyState
            title="Nenhuma notificacao"
            description={
              showUnreadOnly
                ? "Voce esta em dia, sem pendencias a revisar."
                : "Ainda nao foram gerados eventos para este usuario."
            }
            hint="Alertas sao enviados por push, e-mail e app"
            icon={<NotificationEmptyIllustration />}
          />
        </PageContainer>
      ) : (
        <PageContainer className="space-y-3">
          {notifications?.map((notification: any) => {
            const VisualIcon = notificationVisuals[notification.type]?.icon ?? Bell;
            const cardAccent = getCardAccent(notification.type);
            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 170, damping: 20 }}
              >
                <Card
                  className={`rounded-3xl border shadow-sm transition-all interactive-card ${cardAccent} ${
                    notification.read ? "opacity-80" : ""
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-1 items-start gap-3">
                        <div className="mt-1 rounded-2xl bg-card/60 p-3 text-primary">
                          <VisualIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <CardTitle className="text-base">{notification.title}</CardTitle>
                          <CardDescription className="text-sm">{notification.message}</CardDescription>
                          <p className="text-xs text-muted-foreground">
                            {notification.createdAt
                              ? new Date(notification.createdAt).toLocaleString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "--"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="interactive-tap"
                          onClick={() => handleOpenNotification(notification)}
                          disabled={markAsReadMutation.isPending}
                        >
                          Abrir
                        </Button>
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="interactive-tap"
                            onClick={() => handleMarkAsRead(notification.id)}
                            disabled={markAsReadMutation.isPending}
                            title="Marcar como lida"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </motion.div>
            );
          })}
        </PageContainer>
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
