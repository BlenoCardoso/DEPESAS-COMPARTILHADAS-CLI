#!/bin/bash

# Script para criar páginas básicas rapidamente

PAGES_DIR="/home/ubuntu/despesas-compartilhadas/client/src/pages"

# Groups.tsx
cat > "$PAGES_DIR/Groups.tsx" << 'EOF'
export default function Groups() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Grupos</h1>
      <p className="text-muted-foreground">Gerencie seus grupos compartilhados</p>
    </div>
  );
}
EOF

# SharedExpenses.tsx
cat > "$PAGES_DIR/SharedExpenses.tsx" << 'EOF'
export default function SharedExpenses() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Despesas Compartilhadas</h1>
      <p className="text-muted-foreground">Gerencie despesas compartilhadas com seus grupos</p>
    </div>
  );
}
EOF

# PersonalExpenses.tsx
cat > "$PAGES_DIR/PersonalExpenses.tsx" << 'EOF'
export default function PersonalExpenses() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Despesas Pessoais</h1>
      <p className="text-muted-foreground">Gerencie suas despesas pessoais</p>
    </div>
  );
}
EOF

# Tasks.tsx
cat > "$PAGES_DIR/Tasks.tsx" << 'EOF'
export default function Tasks() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Tarefas</h1>
      <p className="text-muted-foreground">Organize suas tarefas</p>
    </div>
  );
}
EOF

# Reminders.tsx
cat > "$PAGES_DIR/Reminders.tsx" << 'EOF'
export default function Reminders() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Lembretes</h1>
      <p className="text-muted-foreground">Gerencie seus lembretes</p>
    </div>
  );
}
EOF

# Calendar.tsx
cat > "$PAGES_DIR/Calendar.tsx" << 'EOF'
export default function Calendar() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Calendário</h1>
      <p className="text-muted-foreground">Visualize seus eventos</p>
    </div>
  );
}
EOF

# Reports.tsx
cat > "$PAGES_DIR/Reports.tsx" << 'EOF'
export default function Reports() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Relatórios</h1>
      <p className="text-muted-foreground">Visualize relatórios e estatísticas</p>
    </div>
  );
}
EOF

# Notifications.tsx
cat > "$PAGES_DIR/Notifications.tsx" << 'EOF'
export default function Notifications() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Notificações</h1>
      <p className="text-muted-foreground">Veja suas notificações</p>
    </div>
  );
}
EOF

# Settings.tsx
cat > "$PAGES_DIR/Settings.tsx" << 'EOF'
export default function Settings() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Configurações</h1>
      <p className="text-muted-foreground">Ajuste suas preferências</p>
    </div>
  );
}
EOF

echo "Páginas criadas com sucesso!"
