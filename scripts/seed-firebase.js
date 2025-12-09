/**
 * 🗄️ Script para Popular o Firebase com Dados Iniciais
 * 
 * Execute este script para criar dados de exemplo no Firestore:
 * 
 * npm run seed-firebase
 * ou
 * node scripts/seed-firebase.js
 */

// Importações usando require (Node.js CommonJS)
const { initializeApp } = require("firebase/app");
const { 
  getFirestore, 
  collection, 
  addDoc, 
  Timestamp,
  serverTimestamp 
} = require("firebase/firestore");

// Configuração do Firebase - usando as mesmas variáveis do .env
const firebaseConfig = {
  apiKey: "AIzaSyC6v-W4ivObIkXO9TMGyrT6W5xJrSjJ5uY",
  authDomain: "despesas-compartilhadas-vs.firebaseapp.com",
  projectId: "despesas-compartilhadas-vs",
  storageBucket: "despesas-compartilhadas-vs.firebasestorage.app",
  messagingSenderId: "681474270325",
  appId: "1:681474270325:web:fe6c5696e971e98253843c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============ DADOS DE EXEMPLO ============

const sampleUsers = [
  {
    openId: "google-123456789",
    name: "João Silva",
    email: "joao.silva@email.com",
    loginMethod: "google",
    role: "user",
    avatarUrl: "https://i.pravatar.cc/150?img=1",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastSignedIn: serverTimestamp()
  },
  {
    openId: "google-987654321",
    name: "Maria Santos",
    email: "maria.santos@email.com",
    loginMethod: "google",
    role: "user",
    avatarUrl: "https://i.pravatar.cc/150?img=2",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastSignedIn: serverTimestamp()
  },
  {
    openId: "google-456789123",
    name: "Pedro Costa",
    email: "pedro.costa@email.com",
    loginMethod: "google",
    role: "user",
    avatarUrl: "https://i.pravatar.cc/150?img=3",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastSignedIn: serverTimestamp()
  }
];

const sampleGroups = [
  {
    name: "🏠 Apartamento Compartilhado",
    description: "Despesas do apartamento que dividimos",
    ownerId: "", // Será preenchido após criar usuários
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    name: "🍕 Galera do Trabalho",
    description: "Pedidos de comida e cafezinho",
    ownerId: "", // Será preenchido após criar usuários
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    name: "✈️ Viagem Florianópolis",
    description: "Gastos da viagem de fim de ano",
    ownerId: "", // Será preenchido após criar usuários
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
];

const sampleExpenses = [
  {
    title: "🛒 Supermercado - Compras da Semana",
    description: "Frutas, legumes, carne e produtos de limpeza",
    amount: 15450, // R$ 154,50 em centavos
    currency: "BRL",
    category: "Alimentação",
    date: serverTimestamp(),
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    title: "💡 Conta de Luz",
    description: "Energia elétrica - Janeiro/2025",
    amount: 8920, // R$ 89,20 em centavos
    currency: "BRL",
    category: "Utilidades",
    date: serverTimestamp(),
    status: "validated",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    title: "📱 Internet",
    description: "Wi-Fi do apartamento",
    amount: 9999, // R$ 99,99 em centavos
    currency: "BRL",
    category: "Telecomunicações",
    date: serverTimestamp(),
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
];

const sampleNotifications = [
  {
    type: "expense",
    title: "💰 Nova despesa compartilhada",
    message: "João Silva adicionou uma despesa: Supermercado - Compras da Semana",
    read: false,
    createdAt: serverTimestamp()
  },
  {
    type: "validation",
    title: "✅ Despesa validada",
    message: "Maria Santos validou a despesa: Conta de Luz",
    read: false,
    createdAt: serverTimestamp()
  },
  {
    type: "invitation",
    title: "👥 Novo convite de grupo",
    message: "João Silva convidou você para o grupo: Apartamento Compartilhado",
    read: false,
    createdAt: serverTimestamp()
  }
];

// ============ FUNÇÕES DE CRIAÇÃO ============

async function createUsers() {
  console.log("📝 Criando usuários...");
  const userIds = [];
  
  for (const user of sampleUsers) {
    try {
      const docRef = await addDoc(collection(db, 'users'), user);
      userIds.push(docRef.id);
      console.log(`✅ Usuário criado: ${user.name} (${docRef.id})`);
    } catch (error) {
      console.error(`❌ Erro ao criar usuário ${user.name}:`, error);
    }
  }
  
  return userIds;
}

async function createGroups(userIds) {
  console.log("👥 Criando grupos...");
  const groupIds = [];
  
  for (let i = 0; i < sampleGroups.length; i++) {
    const group = { ...sampleGroups[i] };
    group.ownerId = userIds[i % userIds.length]; // Atribuir owner baseado nos usuários criados
    
    try {
      const docRef = await addDoc(collection(db, 'groups'), group);
      groupIds.push(docRef.id);
      console.log(`✅ Grupo criado: ${group.name} (${docRef.id})`);
    } catch (error) {
      console.error(`❌ Erro ao criar grupo ${group.name}:`, error);
    }
  }
  
  return groupIds;
}

async function createGroupMembers(userIds, groupIds) {
  console.log("👤 Adicionando membros aos grupos...");
  
  // Adicionar todos os usuários ao primeiro grupo
  for (let i = 0; i < userIds.length; i++) {
    const memberData = {
      groupId: groupIds[0],
      userId: userIds[i],
      role: i === 0 ? "owner" : "member",
      joinedAt: serverTimestamp()
    };
    
    try {
      await addDoc(collection(db, 'groupMembers'), memberData);
      console.log(`✅ Membro adicionado ao grupo: ${userIds[i]} -> ${groupIds[0]}`);
    } catch (error) {
      console.error(`❌ Erro ao adicionar membro:`, error);
    }
  }
  
  // Adicionar alguns usuários ao segundo grupo
  for (let i = 0; i < 2; i++) {
    const memberData = {
      groupId: groupIds[1],
      userId: userIds[i],
      role: i === 0 ? "owner" : "member",
      joinedAt: serverTimestamp()
    };
    
    try {
      await addDoc(collection(db, 'groupMembers'), memberData);
      console.log(`✅ Membro adicionado ao grupo: ${userIds[i]} -> ${groupIds[1]}`);
    } catch (error) {
      console.error(`❌ Erro ao adicionar membro:`, error);
    }
  }
}

async function createExpenses(userIds, groupIds) {
  console.log("💰 Criando despesas compartilhadas...");
  const expenseIds = [];
  
  for (let i = 0; i < sampleExpenses.length; i++) {
    const expense = { ...sampleExpenses[i] };
    expense.groupId = groupIds[0]; // Todas no primeiro grupo
    expense.paidBy = userIds[i % userIds.length];
    expense.createdBy = userIds[i % userIds.length];
    
    if (expense.status === "validated") {
      expense.validatedBy = userIds[(i + 1) % userIds.length];
      expense.validatedAt = serverTimestamp();
    }
    
    try {
      const docRef = await addDoc(collection(db, 'sharedExpenses'), expense);
      expenseIds.push(docRef.id);
      console.log(`✅ Despesa criada: ${expense.title} (${docRef.id})`);
    } catch (error) {
      console.error(`❌ Erro ao criar despesa ${expense.title}:`, error);
    }
  }
  
  return expenseIds;
}

async function createExpenseSplits(userIds, expenseIds) {
  console.log("💸 Criando divisões de despesas...");
  
  for (let i = 0; i < expenseIds.length; i++) {
    const expenseId = expenseIds[i];
    const amount = sampleExpenses[i].amount;
    const splitAmount = Math.floor(amount / userIds.length);
    
    for (let j = 0; j < userIds.length; j++) {
      const splitData = {
        expenseId: expenseId,
        userId: userIds[j],
        amount: splitAmount,
        paid: j === 0, // Primeiro usuário já pagou (é quem criou a despesa)
        paidAt: j === 0 ? serverTimestamp() : null
      };
      
      try {
        await addDoc(collection(db, 'expenseSplits'), splitData);
        console.log(`✅ Split criado: ${expenseId} -> ${userIds[j]} (R$ ${(splitAmount/100).toFixed(2)})`);
      } catch (error) {
        console.error(`❌ Erro ao criar split:`, error);
      }
    }
  }
}

async function createInvitations(userIds, groupIds) {
  console.log("📧 Criando convites...");
  
  const invitationData = {
    groupId: groupIds[2], // Terceiro grupo
    invitedBy: userIds[0],
    invitedEmail: "novo.usuario@email.com",
    status: "pending",
    createdAt: serverTimestamp()
  };
  
  try {
    const docRef = await addDoc(collection(db, 'invitations'), invitationData);
    console.log(`✅ Convite criado: ${invitationData.invitedEmail} -> ${groupIds[2]} (${docRef.id})`);
  } catch (error) {
    console.error(`❌ Erro ao criar convite:`, error);
  }
}

async function createNotifications(userIds) {
  console.log("🔔 Criando notificações...");
  
  for (let i = 0; i < sampleNotifications.length; i++) {
    const notification = { ...sampleNotifications[i] };
    notification.userId = userIds[1]; // Enviar todas para o segundo usuário
    
    try {
      const docRef = await addDoc(collection(db, 'notifications'), notification);
      console.log(`✅ Notificação criada: ${notification.title} (${docRef.id})`);
    } catch (error) {
      console.error(`❌ Erro ao criar notificação:`, error);
    }
  }
}

// ============ SCRIPT PRINCIPAL ============

async function seedFirebase() {
  console.log("🌱 Iniciando população do Firebase...");
  console.log("🔥 Projeto:", firebaseConfig.projectId);
  console.log("");
  
  try {
    // 1. Criar usuários
    const userIds = await createUsers();
    
    // 2. Criar grupos
    const groupIds = await createGroups(userIds);
    
    // 3. Adicionar membros aos grupos
    await createGroupMembers(userIds, groupIds);
    
    // 4. Criar despesas compartilhadas
    const expenseIds = await createExpenses(userIds, groupIds);
    
    // 5. Criar divisões das despesas
    await createExpenseSplits(userIds, expenseIds);
    
    // 6. Criar convites
    await createInvitations(userIds, groupIds);
    
    // 7. Criar notificações
    await createNotifications(userIds);
    
    console.log("");
    console.log("🎉 Firebase populado com sucesso!");
    console.log("📊 Resumo:");
    console.log(`   👤 Usuários: ${userIds.length}`);
    console.log(`   👥 Grupos: ${groupIds.length}`);
    console.log(`   💰 Despesas: ${expenseIds.length}`);
    console.log(`   📧 Convites: 1`);
    console.log(`   🔔 Notificações: ${sampleNotifications.length}`);
    console.log("");
    console.log("🔗 Acesse o Firebase Console para visualizar os dados:");
    console.log(`   https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`);
    
  } catch (error) {
    console.error("❌ Erro ao popular Firebase:", error);
  }
}

// Executar o script
if (require.main === module) {
  seedFirebase();
}

module.exports = { seedFirebase };