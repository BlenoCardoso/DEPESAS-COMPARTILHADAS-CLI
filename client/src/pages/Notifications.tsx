import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const NotificationEmptyIllustration = () => (
  <svg
    viewBox="0 0 220 170"
    role="img"
    aria-hidden="true"
    className="mx-auto h-36 w-48"
  >
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

  const { data: notifications, isLoading, refetch } = trpc.notifications.list.useQuery(
    { unreadOnly: showUnreadOnly },
    { enabled: isAuthenticated }
  );

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const refreshNotifications = () => {
    refetch();
    utils.notifications.getUnreadCount.invalidate();
    utils.notifications.list.invalidate();
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsReadMutation.mutateAsync({ id });
      toast.success("Notificação marcada como lida");
      refreshNotifications();
    } catch {/* handled via toast */}
  };

  const handleMarkAllAsRead = async () => {
    if (!confirm("Marcar todas como lidas?")) return;
    try {
      await markAllAsReadMutation.mutateAsync();
      toast.success("Todas marcadas como lidas");
      refreshNotifications();
    } catch {/* toast already handled */}
  };

  const getNotificationTarget = (notification: any) => {
    switch (notification.type) {
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
        return undefined;
    }
  };

  const handleOpenNotification = async (notification: any) => {
    const target = getNotificationTarget(notification);
    if (!notification.read) {
      try {
        await markAsReadMutation.mutateAsync({ id: notification.id });
        refreshNotifications();
      } catch {
        return;
      }
    }
    if (target) {
      navigate(target);
    } else {
      toast.info("Nada para abrir para este tipo de notificação");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "expense":
        return "💰";
      case "invitation":
        return "📨";
      case "validation":
        return "✅";
      case "reminder":
        return "⏰";
      default:
        return "🔔";
    }
  };

  const getCardAccent = (type: string, read: boolean) => {
    if (read) return "bg-card";
    const accentMap: Record<string, string> = {
      expense: "bg-gradient-to-br from-secondary/25 to-secondary/5",
      invitation: "bg-gradient-to-br from-info/25 to-info/5",
      validation: "bg-gradient-to-br from-success/25 to-success/5",
      reminder: "bg-gradient-to-br from-accent/25 to-accent/5",
    };
    return accentMap[type] ?? "bg-gradient-to-br from-primary/20 to-primary/5";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const unreadCount = notifications?.filter((n: any) => !n.read).length || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-4 rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold sm:text-3xl">Notificações</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} ${unreadCount === 1 ? "não lida" : "não lidas"}`
              : "Nenhuma notificação não lida"}
          </p>
        </div>
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl gradient-secondary text-white shadow-lg">
            <Bell className="h-6 w-6" />
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant={showUnreadOnly ? "default" : "outline"}
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className="gap-2 w-full sm:w-auto interactive-tap"
          >
            <Bell className="h-4 w-4" />
            {showUnreadOnly ? "Ver Todas" : "Apenas Não Lidas"}
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
              className="gap-2 w-full sm:w-auto interactive-tap"
            >
              {markAllAsReadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              Marcar Todas
            </Button>
          )}
        </div>
      </div>

      {!notifications || notifications.length === 0 ? (
        <Card className="rounded-2xl border border-border/70 interactive-card">
          <CardContent className="py-12 text-center space-y-4">
            <NotificationEmptyIllustration />
            <div>
              <h3 className="text-lg font-semibold">Nenhuma notificação</h3>
              <p className="text-sm text-muted-foreground">
                {showUnreadOnly
                  ? "Você não tem notificações não lidas"
                  : "Você ainda não recebeu notificações"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification: any) => {
            const target = getNotificationTarget(notification);
            return (
              <Card
                key={notification.id}
                className={`rounded-2xl border border-border/60 shadow-sm transition-all interactive-card ${getCardAccent(
                  notification.type,
                  notification.read
                )} ${notification.read ? "opacity-80" : ""}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-2xl mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <CardTitle className="text-base">
                          {notification.title}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {notification.message}
                        </CardDescription>
                        <p className="text-xs text-muted-foreground">
                          {notification.createdAt
                            ? new Date(notification.createdAt).toLocaleString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {target && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="interactive-tap"
                          onClick={() => handleOpenNotification(notification)}
                          disabled={markAsReadMutation.isPending}
                        >
                          Abrir
                        </Button>
                      )}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
