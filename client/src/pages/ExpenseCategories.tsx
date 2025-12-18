import { useAuth } from "@/_core/hooks/useAuth";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCurrentGroup } from "@/contexts/CurrentGroupContext";
import { trpc } from "@/lib/trpc";
import { Edit2, Folder, Loader2, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

// Categorias padrão do sistema
const DEFAULT_CATEGORIES = [
  { id: "alimentacao", name: "Alimentação", icon: "🍽️", isSystem: true },
  { id: "transporte", name: "Transporte", icon: "🚗", isSystem: true },
  { id: "moradia", name: "Moradia", icon: "🏠", isSystem: true },
  { id: "lazer", name: "Lazer", icon: "🎉", isSystem: true },
  { id: "saude", name: "Saúde", icon: "💊", isSystem: true },
  { id: "educacao", name: "Educação", icon: "📚", isSystem: true },
  { id: "compras", name: "Compras", icon: "🛒", isSystem: true },
  { id: "servicos", name: "Serviços", icon: "🔧", isSystem: true },
  { id: "outros", name: "Outros", icon: "📦", isSystem: true },
];

const ICON_OPTIONS = [
  "🍽️", "🚗", "🏠", "🎉", "💊", "📚", "🛒", "🔧", "📦",
  "💰", "💳", "🎁", "✈️", "🏋️", "🎮", "📱", "💼", "🎨",
  "🌟", "🔑", "🎯", "🎭", "🎪", "🎬", "🎵", "📷", "🖥️",
];

export default function ExpenseCategories() {
  const { isAuthenticated, user } = useAuth();
  const { currentGroup, setCurrentGroupId } = useCurrentGroup();
  const groupId = currentGroup?.id ?? null;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📦");

  const { data: groups } = trpc.groups.list.useQuery(undefined, { enabled: isAuthenticated });
  const groupsList = Array.isArray(groups) ? groups : [];

  const categoriesQuery = trpc.expenseCategories.list.useQuery(
    { groupId: groupId! },
    { enabled: !!groupId && isAuthenticated }
  );

  const createMutation = trpc.expenseCategories.create.useMutation({
    onSuccess: () => {
      toast.success("Categoria criada!");
      categoriesQuery.refetch();
      resetForm();
      setIsCreateOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar categoria");
    },
  });

  const updateMutation = trpc.expenseCategories.update.useMutation({
    onSuccess: () => {
      toast.success("Categoria atualizada!");
      categoriesQuery.refetch();
      setIsEditOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar categoria");
    },
  });

  const deleteMutation = trpc.expenseCategories.delete.useMutation({
    onSuccess: () => {
      toast.success("Categoria excluída!");
      categoriesQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao excluir categoria");
    },
  });

  const resetForm = () => {
    setName("");
    setIcon("📦");
    setEditingCategory(null);
  };

  const handleCreateCategory = () => {
    if (!name.trim() || !groupId) {
      toast.error("Preencha o nome da categoria");
      return;
    }

    createMutation.mutate({
      groupId,
      name: name.trim(),
      icon,
    });
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setName(category.name);
    setIcon(category.icon || "📦");
    setIsEditOpen(true);
  };

  const handleUpdateCategory = () => {
    if (!name.trim() || !editingCategory) return;

    updateMutation.mutate({
      id: editingCategory.id,
      name: name.trim(),
      icon,
    });
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (confirm("Tem certeza que deseja excluir esta categoria?")) {
      deleteMutation.mutate({ id: categoryId });
    }
  };

  if (!isAuthenticated) {
    return <PageContainer title="Categorias de Despesas">Você precisa estar autenticado</PageContainer>;
  }

  const customCategories = categoriesQuery.data || [];
  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  return (
    <PageContainer title="Categorias de Despesas">
      <div className="space-y-4">
        {/* Group Selector */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Grupo Selecionado</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Select value={groupId || ""} onValueChange={setCurrentGroupId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um grupo" />
              </SelectTrigger>
              <SelectContent>
                {groupsList.map((g) => (
                  <SelectItem key={g.group.id} value={g.group.id}>
                    {g.group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Create Button */}
        {groupId && (
          <div className="flex justify-end">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Categoria
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Criar Nova Categoria</DialogTitle>
                  <DialogDescription>
                    Adicione uma categoria personalizada para organizar suas despesas
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Categoria</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Viagens, Pet, Esportes..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ícone</Label>
                    <div className="grid grid-cols-9 gap-2">
                      {ICON_OPTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setIcon(emoji)}
                          className={`h-10 w-10 text-2xl flex items-center justify-center rounded border-2 transition-colors ${
                            icon === emoji
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateCategory} disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Criar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Categories List */}
        {groupId && (
          <div className="space-y-4">
            {/* System Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  Categorias do Sistema
                </CardTitle>
                <CardDescription>Categorias padrão disponíveis para todos os grupos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {DEFAULT_CATEGORIES.map((category) => (
                    <motion.div
                      key={category.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                    >
                      <span className="text-2xl">{category.icon}</span>
                      <span className="font-medium flex-1">{category.name}</span>
                      <Badge variant="secondary">Sistema</Badge>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Custom Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Folder className="h-4 w-4 text-primary" />
                  Categorias Personalizadas
                </CardTitle>
                <CardDescription>Categorias criadas por você para este grupo</CardDescription>
              </CardHeader>
              <CardContent>
                {categoriesQuery.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : customCategories.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma categoria personalizada criada</p>
                    <p className="text-xs mt-1">Clique em "Nova Categoria" para adicionar</p>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {customCategories.map((category: any) => (
                      <motion.div
                        key={category.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors"
                      >
                        <span className="text-2xl">{category.icon || "📦"}</span>
                        <span className="font-medium flex-1">{category.name}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditCategory(category)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Categoria</DialogTitle>
              <DialogDescription>Modifique o nome ou ícone da categoria</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome da Categoria</Label>
                <Input
                  id="edit-name"
                  placeholder="Nome da categoria"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Ícone</Label>
                <div className="grid grid-cols-9 gap-2">
                  {ICON_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setIcon(emoji)}
                      className={`h-10 w-10 text-2xl flex items-center justify-center rounded border-2 transition-colors ${
                        icon === emoji
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateCategory} disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
}
