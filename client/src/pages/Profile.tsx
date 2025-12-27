import { PageContainer } from "@/components/layout/PageContainer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/_core/hooks/useAuth";
import { LogOut, UserRound } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "wouter";

function getInitials(userName?: string | null, userEmail?: string | null) {
  const base = (userName || "").trim() || (userEmail || "").split("@")[0] || "";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : (parts[0]?.[1] ?? "");
  return `${first}${last}`.toUpperCase();
}

export default function Profile() {
  const { user, logout, loading } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/" });
  const [, setLocation] = useLocation();

  const initials = useMemo(() => getInitials(user?.name ?? null, user?.email ?? null), [user?.name, user?.email]);

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <PageContainer className="space-y-3">
        <Card className="overflow-hidden rounded-3xl border border-border/60 bg-card/80 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 rounded-2xl ring-1 ring-border/60">
                <AvatarImage src={(user as any)?.avatarUrl ?? undefined} alt={user?.name ?? user?.email ?? "Avatar"} />
                <AvatarFallback className="rounded-2xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{user?.name || "Meu perfil"}</p>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">{user?.email || ""}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background/60 text-muted-foreground ring-1 ring-border/60">
                <UserRound className="h-5 w-5" />
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <Button
                variant="destructive"
                className="w-full rounded-2xl gap-2"
                onClick={handleLogout}
                disabled={loading}
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Ao sair, seus dados locais em cache são limpos.
              </p>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    </div>
  );
}
