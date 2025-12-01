import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Notificações</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} ${unreadCount === 1 ? "não lida" : "não lidas"}`
              : "Nenhuma notificação não lida"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showUnreadOnly ? "default" : "outline"}
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className="gap-2"
          >
            <Bell className="h-4 w-4" />
            {showUnreadOnly ? "Ver Todas" : "Apenas Não Lidas"}
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
              className="gap-2"
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
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
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
                className={`transition-all ${
                  notification.read
                    ? "bg-background"
                    : "bg-primary/5 border-l-4 border-l-primary"
                }`}
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
