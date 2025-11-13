import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { CreditCard, TrendingUp, Users, Calendar, Bell, Wallet } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated, loginWithGoogle } = useAuth();

  const { data: groups } = trpc.groups.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: unreadCount } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="max-w-md space-y-6">
          <div className="space-y-2">
            <div className="mx-auto h-16 w-16 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-4">
              <CreditCard className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gradient">{APP_TITLE}</h1>
            <p className="text-lg text-muted-foreground">
              Gerencie suas despesas compartilhadas e pessoais de forma simples e eficiente
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 py-6">
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-primary/10">
              <Users className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium">Grupos</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-secondary/10">
              <CreditCard className="h-8 w-8 text-secondary" />
              <span className="text-sm font-medium">Despesas</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-accent/10">
              <Wallet className="h-8 w-8 text-accent" />
              <span className="text-sm font-medium">Pessoal</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-info/10">
              <TrendingUp className="h-8 w-8 text-info" />
              <span className="text-sm font-medium">Relatórios</span>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full gradient-primary text-white font-semibold"
            onClick={loginWithGoogle}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                <span>Entrando...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Entrar com Google</span>
              </div>
            )}
          </Button>

          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>🔒 Login seguro com Firebase Authentication</p>
            <p>⚡ Sincronização em tempo real</p>
            <p>📱 Funciona offline</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Olá, {user?.name?.split(" ")[0]}! 👋</h1>
        <p className="text-muted-foreground">
          Bem-vindo de volta ao seu painel de controle
        </p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/groups">
          <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meus Grupos</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{groups?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                {groups?.length === 1 ? "grupo ativo" : "grupos ativos"}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/shared-expenses">
          <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-secondary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas Compartilhadas</CardTitle>
              <CreditCard className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Ver todas as despesas
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/personal-expenses">
          <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-accent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Despesas Pessoais</CardTitle>
              <Wallet className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Ver minhas despesas
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/notifications">
          <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-info">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Notificações</CardTitle>
              <div className="h-5 w-5 rounded-full bg-info flex items-center justify-center text-xs text-white font-bold">
                {unreadCount || 0}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unreadCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                {unreadCount === 1 ? "notificação não lida" : "notificações não lidas"}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Ações rápidas */}
          <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>Acesse rapidamente as funcionalidades principais</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Button asChild variant="outline" className="w-full justify-start gap-2">
            <Link href="/groups">
              <Users className="h-4 w-4" />
              Criar Grupo
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full justify-start gap-2">
            <Link href="/shared-expenses">
              <CreditCard className="h-4 w-4" />
              Nova Despesa
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full justify-start gap-2">
            <Link href="/tasks">
              <TrendingUp className="h-4 w-4" />
              Adicionar Tarefa
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full justify-start gap-2">
            <Link href="/reports">
              <TrendingUp className="h-4 w-4" />
              Ver Relatórios
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
