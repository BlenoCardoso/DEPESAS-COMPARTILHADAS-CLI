/**
 * 📧 Demonstração do Fluxo Completo de Convites
 * 
 * Este script demonstra todo o processo:
 * 1. Criar usuário
 * 2. Criar grupo
 * 3. Enviar convite
 * 4. Aceitar/rejeitar convite
 * 5. Notificar membros
 * 
 * Execute com: node scripts/test-invitations.js
 */

import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  serverTimestamp 
} from "firebase/firestore";

// Configuração do Firebase
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

// ============ FUNÇÕES AUXILIARES ============

async function createTestUser(userData) {
  try {
    const docRef = await addDoc(collection(db, 'users'), {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastSignedIn: serverTimestamp()
    });
    console.log(`✅ Usuário criado: ${userData.name} (${docRef.id})`);
    return docRef.id;
  } catch (error) {
    console.error(`❌ Erro ao criar usuário ${userData.name}:`, error);
    throw error;
  }
}

async function createTestGroup(groupData, ownerId) {
  try {
    const docRef = await addDoc(collection(db, 'groups'), {
      ...groupData,
      ownerId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log(`✅ Grupo criado: ${groupData.name} (${docRef.id})`);
    return docRef.id;
  } catch (error) {
    console.error(`❌ Erro ao criar grupo ${groupData.name}:`, error);
    throw error;
  }
}

async function addGroupMember(groupId, userId, role = 'member') {
  try {
    const docRef = await addDoc(collection(db, 'groupMembers'), {
      groupId,
      userId,
      role,
      joinedAt: serverTimestamp()
    });
    console.log(`✅ Membro adicionado: ${userId} -> ${groupId} (${role})`);
    return docRef.id;
  } catch (error) {
    console.error(`❌ Erro ao adicionar membro:`, error);
    throw error;
  }
}

async function sendInvitation(groupId, invitedBy, invitedEmail) {
  try {
    const docRef = await addDoc(collection(db, 'invitations'), {
      groupId,
      invitedBy,
      invitedEmail,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    console.log(`📧 Convite enviado: ${invitedEmail} para grupo ${groupId} (${docRef.id})`);
    return docRef.id;
  } catch (error) {
    console.error(`❌ Erro ao enviar convite:`, error);
    throw error;
  }
}

async function findInviteByEmail(email) {
  try {
    const q = query(
      collection(db, 'invitations'),
      where('invitedEmail', '==', email),
      where('status', '==', 'pending')
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const docData = snapshot.docs[0];
      return { id: docData.id, ...docData.data() };
    }
    return null;
  } catch (error) {
    console.error(`❌ Erro ao buscar convite:`, error);
    return null;
  }
}

async function respondToInvitation(invitationId, accept, invitedUserId) {
  try {
    const status = accept ? 'accepted' : 'rejected';
    const docRef = doc(db, 'invitations', invitationId);
    
    await updateDoc(docRef, {
      status,
      invitedUserId,
      respondedAt: serverTimestamp()
    });
    
    console.log(`${accept ? '✅' : '❌'} Convite ${accept ? 'aceito' : 'rejeitado'}: ${invitationId}`);
    return status;
  } catch (error) {
    console.error(`❌ Erro ao responder convite:`, error);
    throw error;
  }
}

async function createNotification(userId, type, title, message, relatedId) {
  try {
    const docRef = await addDoc(collection(db, 'notifications'), {
      userId,
      type,
      title,
      message,
      relatedId,
      read: false,
      createdAt: serverTimestamp()
    });
    console.log(`🔔 Notificação criada: ${title} (${docRef.id})`);
    return docRef.id;
  } catch (error) {
    console.error(`❌ Erro ao criar notificação:`, error);
    throw error;
  }
}

// ============ CENÁRIO DE TESTE ============

async function demonstrateInvitationFlow() {
  console.log("🎭 DEMONSTRAÇÃO: Fluxo Completo de Convites");
  console.log("=" .repeat(50));
  console.log("");

  try {
    // 1. CRIAR USUÁRIOS
    console.log("👥 PASSO 1: Criando usuários de teste");
    console.log("-".repeat(40));
    
    const owner = await createTestUser({
      openId: "demo-owner-123",
      name: "Ana Paula",
      email: "ana.paula@email.com",
      loginMethod: "google",
      role: "user",
      avatarUrl: "https://i.pravatar.cc/150?img=10"
    });

    const invitedUser = await createTestUser({
      openId: "demo-invited-456",
      name: "Carlos Eduardo",
      email: "carlos.eduardo@email.com",
      loginMethod: "google",
      role: "user",
      avatarUrl: "https://i.pravatar.cc/150?img=11"
    });

    console.log("");

    // 2. CRIAR GRUPO
    console.log("🏠 PASSO 2: Criando grupo");
    console.log("-".repeat(40));
    
    const groupId = await createTestGroup({
      name: "🎉 Festa de Aniversário",
      description: "Organização da festa da Ana"
    }, owner);

    // Adicionar o owner como membro
    await addGroupMember(groupId, owner, 'owner');

    console.log("");

    // 3. ENVIAR CONVITE
    console.log("📧 PASSO 3: Enviando convite");
    console.log("-".repeat(40));
    
    const invitationId = await sendInvitation(
      groupId, 
      owner, 
      "carlos.eduardo@email.com"
    );

    // Criar notificação para o usuário convidado
    await createNotification(
      invitedUser,
      "invitation",
      "🎉 Novo convite de grupo",
      "Ana Paula convidou você para o grupo: Festa de Aniversário",
      invitationId
    );

    console.log("");

    // 4. SIMULAR RECEBIMENTO DO CONVITE
    console.log("📬 PASSO 4: Simulando recebimento do convite");
    console.log("-".repeat(40));
    
    const receivedInvite = await findInviteByEmail("carlos.eduardo@email.com");
    if (receivedInvite) {
      console.log("✅ Convite encontrado:");
      console.log(`   📧 Para: ${receivedInvite.invitedEmail}`);
      console.log(`   👥 Grupo: ${groupId}`);
      console.log(`   📅 Data: ${receivedInvite.createdAt?.toDate?.() || 'Agora'}`);
      console.log(`   ⏳ Status: ${receivedInvite.status}`);
    }

    console.log("");

    // 5. ACEITAR CONVITE
    console.log("✅ PASSO 5: Aceitando convite");
    console.log("-".repeat(40));
    
    await respondToInvitation(invitationId, true, invitedUser);

    // Adicionar usuário ao grupo após aceitar
    await addGroupMember(groupId, invitedUser, 'member');

    // Notificar quem convidou
    await createNotification(
      owner,
      "invitation",
      "✅ Convite aceito",
      "Carlos Eduardo aceitou seu convite para o grupo: Festa de Aniversário",
      invitationId
    );

    console.log("");

    // 6. CRIAR UMA DESPESA NO GRUPO
    console.log("💰 PASSO 6: Criando despesa compartilhada");
    console.log("-".repeat(40));
    
    const expenseRef = await addDoc(collection(db, 'sharedExpenses'), {
      groupId,
      title: "🎂 Bolo de Aniversário",
      description: "Bolo especial da confeitaria",
      amount: 8500, // R$ 85,00
      currency: "BRL",
      category: "Alimentação",
      paidBy: owner,
      date: serverTimestamp(),
      status: "pending",
      createdBy: owner,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log(`✅ Despesa criada: Bolo de Aniversário (${expenseRef.id})`);

    // Criar divisões da despesa
    const splitAmount = Math.floor(8500 / 2); // Dividir entre 2 pessoas
    
    await addDoc(collection(db, 'expenseSplits'), {
      expenseId: expenseRef.id,
      userId: owner,
      amount: splitAmount,
      paid: true, // Quem criou já pagou
      paidAt: serverTimestamp()
    });

    await addDoc(collection(db, 'expenseSplits'), {
      expenseId: expenseRef.id,
      userId: invitedUser,
      amount: splitAmount,
      paid: false
    });

    console.log(`✅ Divisão criada: R$ ${(splitAmount/100).toFixed(2)} para cada membro`);

    // Notificar novo membro sobre a despesa
    await createNotification(
      invitedUser,
      "expense",
      "💰 Nova despesa compartilhada",
      "Ana Paula adicionou uma despesa: Bolo de Aniversário (R$ 42,50)",
      expenseRef.id
    );

    console.log("");

    // 7. RESUMO FINAL
    console.log("🎉 DEMONSTRAÇÃO CONCLUÍDA!");
    console.log("=" .repeat(50));
    console.log("📊 Resumo do que foi criado:");
    console.log(`   👤 Usuários: 2`);
    console.log(`   👥 Grupos: 1`);
    console.log(`   📧 Convites: 1 (aceito)`);
    console.log(`   💰 Despesas: 1`);
    console.log(`   💸 Divisões: 2`);
    console.log(`   🔔 Notificações: 3`);
    console.log("");
    console.log("🔗 Links úteis:");
    console.log(`   Firebase Console: https://console.firebase.google.com/project/despesas-compartilhadas-vs/firestore`);
    console.log(`   Sua aplicação: http://localhost:3000`);
    
  } catch (error) {
    console.error("❌ Erro na demonstração:", error);
  }
}

// ============ CENÁRIO ADICIONAL: REJEITAR CONVITE ============

async function demonstrateRejection() {
  console.log("");
  console.log("🚫 CENÁRIO ADICIONAL: Rejeitando convite");
  console.log("-".repeat(40));
  
  try {
    // Buscar usuários existentes (você pode usar IDs reais aqui)
    const ownerEmail = "ana.paula@email.com";
    const rejectedEmail = "novo.rejeitado@email.com";
    
    // Criar novo usuário para teste de rejeição
    const rejectedUser = await createTestUser({
      openId: "demo-rejected-789",
      name: "Marina Silva",
      email: rejectedEmail,
      loginMethod: "google",
      role: "user",
      avatarUrl: "https://i.pravatar.cc/150?img=12"
    });

    // Assumir que temos um grupo e owner (use IDs reais)
    // Para demonstração, vamos criar um grupo simples
    const testGroupId = await createTestGroup({
      name: "🍕 Grupo de Teste",
      description: "Apenas para testar rejeição"
    }, rejectedUser); // Usando o novo usuário como owner temporário

    // Enviar convite
    const rejectionInviteId = await sendInvitation(
      testGroupId,
      rejectedUser,
      "usuario.que.vai.rejeitar@email.com"
    );

    // Simular rejeição
    await respondToInvitation(rejectionInviteId, false, "fake-user-id");

    console.log("✅ Demonstração de rejeição concluída!");
    
  } catch (error) {
    console.error("❌ Erro na demonstração de rejeição:", error);
  }
}

// ============ EXECUTAR DEMONSTRAÇÕES ============

async function runDemo() {
  await demonstrateInvitationFlow();
  await demonstrateRejection();
}

// Executar se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemo();
}

export { demonstrateInvitationFlow, demonstrateRejection };