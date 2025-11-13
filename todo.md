# Despesas Compartilhadas - TODO

## Banco de Dados e Schema
- [x] Criar tabela de grupos compartilhados
- [x] Criar tabela de despesas compartilhadas
- [x] Criar tabela de despesas pessoais
- [x] Criar tabela de tarefas
- [x] Criar tabela de lembretes
- [x] Criar tabela de eventos do calendário
- [x] Criar tabela de convites
- [x] Criar tabela de notificações
- [x] Criar tabela de membros de grupos
- [x] Criar índices para otimização de queries

## Configuração e Dependências
- [x] Instalar Firebase SDK
- [x] Instalar Capacitor e plugins necessários
- [x] Instalar date-fns para manipulação de datas
- [x] Instalar bibliotecas de gráficos para relatórios
- [ ] Configurar Firebase CLI com token fornecido
- [ ] Configurar Firebase Authentication (Google)
- [ ] Configurar Firestore Database
- [ ] Configurar regras de segurança do Firestore
- [ ] Configurar índices compostos do Firestore

## Backend - Queries e Mutations
- [x] Implementar queries de grupos compartilhados
- [x] Implementar queries de despesas compartilhadas
- [x] Implementar queries de despesas pessoais
- [x] Implementar queries de tarefas
- [x] Implementar queries de lembretes
- [x] Implementar queries de eventos do calendário
- [x] Implementar queries de convites
- [x] Implementar queries de notificações
- [x] Implementar mutations para criar/editar/deletar despesas
- [x] Implementar mutations para validar despesas
- [x] Implementar mutations para gerenciar convites
- [x] Implementar mutations para gerenciar notificações

## Backend - Routers tRPC
- [x] Criar router de grupos compartilhados
- [x] Criar router de despesas compartilhadas
- [x] Criar router de despesas pessoais
- [x] Criar router de tarefas
- [x] Criar router de lembretes
- [x] Criar router de calendário
- [x] Criar router de convites
- [x] Criar router de notificações
- [ ] Criar router de relatórios

## Autenticação e Firebase
- [ ] Implementar autenticação via Google
- [ ] Criar helpers do Firebase
- [ ] Implementar sincronização em tempo real com Firestore
- [ ] Implementar listeners de mudanças em tempo real

## Interface - Navegação e Layout
- [x] Criar menu hambúrguer responsivo
- [x] Criar layout mobile-first
- [x] Implementar navegação entre páginas
- [x] Criar header com notificações e perfil
- [x] Implementar tema de cores bonito e moderno
- [x] Criar componentes de UI reutilizáveis

## Interface - Despesas Compartilhadas
- [ ] Criar página de listagem de despesas compartilhadas
- [ ] Criar formulário de adicionar despesa compartilhada
- [ ] Implementar validação de despesas
- [ ] Mostrar status de quem pagou e quem deve
- [ ] Implementar filtros e busca
- [ ] Criar visualização detalhada de despesa
- [ ] Implementar edição e exclusão de despesas

## Interface - Despesas Pessoais
- [ ] Criar página de listagem de despesas pessoais
- [ ] Criar formulário de adicionar despesa pessoal
- [ ] Implementar categorização de despesas
- [ ] Implementar filtros por data e categoria
- [ ] Criar visualização detalhada de despesa pessoal

## Interface - Sistema de Convites
- [ ] Criar botão de convidar membros
- [ ] Implementar envio de convites
- [ ] Criar página de convites recebidos
- [ ] Implementar aceitar/recusar convites
- [ ] Mostrar lista de membros do grupo
- [ ] Implementar remoção de membros

## Interface - Notificações
- [ ] Criar ícone de notificações no header
- [ ] Implementar badge de contagem de notificações
- [ ] Criar painel de notificações
- [ ] Implementar notificações em tempo real
- [ ] Marcar notificações como lidas
- [ ] Implementar tipos de notificações (convite, despesa, validação)

## Interface - Tarefas
- [ ] Criar página de listagem de tarefas
- [ ] Criar formulário de adicionar tarefa
- [ ] Implementar marcar tarefa como concluída
- [ ] Implementar filtros (todas, pendentes, concluídas)
- [ ] Implementar edição e exclusão de tarefas
- [ ] Adicionar prioridades e datas de vencimento

## Interface - Lembretes
- [ ] Criar página de listagem de lembretes
- [ ] Criar formulário de adicionar lembrete
- [ ] Implementar notificações de lembretes
- [ ] Implementar edição e exclusão de lembretes
- [ ] Adicionar categorias de lembretes

## Interface - Calendário
- [ ] Criar visualização de calendário mensal
- [ ] Implementar adicionar eventos no calendário
- [ ] Mostrar despesas agendadas no calendário
- [ ] Mostrar lembretes no calendário
- [ ] Implementar navegação entre meses
- [ ] Criar visualização de detalhes do dia

## Interface - Relatórios
- [ ] Criar página de relatórios e estatísticas
- [ ] Implementar gráfico de despesas por categoria
- [ ] Implementar gráfico de despesas ao longo do tempo
- [ ] Mostrar total de despesas por período
- [ ] Mostrar balanço entre membros do grupo
- [ ] Implementar filtros de período
- [ ] Criar resumo de despesas pendentes
- [ ] Implementar exportação de relatórios

## Capacitor e Mobile
- [ ] Configurar Capacitor para iOS
- [ ] Configurar Capacitor para Android
- [ ] Configurar ícones e splash screens
- [ ] Testar build para mobile
- [ ] Configurar permissões necessárias

## Testes e Finalização
- [ ] Testar autenticação Google
- [ ] Testar fluxo completo de despesas compartilhadas
- [ ] Testar fluxo de convites
- [ ] Testar notificações em tempo real
- [ ] Testar todas as funcionalidades mobile
- [ ] Criar dados de exemplo (seed)
- [ ] Verificar responsividade em diferentes tamanhos de tela
- [ ] Otimizar performance
- [ ] Salvar checkpoint final
- [ ] Gerar arquivo zipado do projeto

## Firebase - Configuração Completa
- [x] Configurar Firebase SDK no projeto
- [x] Obter firebaseConfig do console
- [x] Configurar Firebase Authentication com Google
- [x] Configurar Firestore Database
- [x] Criar regras de segurança do Firestore
- [x] Configurar índices compostos do Firestore
- [x] Integrar autenticação Firebase com sistema Manus
- [ ] Testar autenticação e sincronização

## Páginas Completas - Implementação
- [ ] Página de Grupos - listagem, criação, edição
- [ ] Página de Grupos - gerenciamento de membros
- [ ] Página de Despesas Compartilhadas - listagem
- [ ] Página de Despesas Compartilhadas - formulário de criação
- [ ] Página de Despesas Compartilhadas - validação
- [ ] Página de Despesas Compartilhadas - divisão de valores
- [ ] Página de Despesas Pessoais - listagem e formulário
- [ ] Página de Tarefas - listagem e formulário
- [ ] Página de Lembretes - listagem e formulário
- [ ] Página de Calendário - visualização mensal
- [ ] Página de Relatórios - gráficos e estatísticas
- [ ] Página de Notificações - centro de notificações
- [ ] Página de Configurações - preferências do usuário
