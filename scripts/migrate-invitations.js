/**
 * Migração: adiciona invitedByOpenId aos convites antigos que não possuem esse campo.
 * Executar: `node scripts/migrate-invitations.js`
 * Pré-requisito: variável de ambiente FIREBASE_SERVICE_ACCOUNT ou GOOGLE_APPLICATION_CREDENTIALS configurada.
 */
import { initializeApp, applicationDefault, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function initAdmin() {
  if (getApps().length > 0) return getApp();
  const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (svc) {
    try {
      const creds = JSON.parse(svc);
      return initializeApp({ credential: cert(creds) });
    } catch (e) {
      console.error('[Migration] Falha ao parsear FIREBASE_SERVICE_ACCOUNT', e);
      process.exit(1);
    }
  }
  return initializeApp({ credential: applicationDefault() });
}

async function run() {
  console.log('\n[Migration] Iniciando migração de convites...');
  initAdmin();
  const db = getFirestore();
  db.settings({ ignoreUndefinedProperties: true });

  const snap = await db.collection('invitations').get();
  let updated = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.invitedByOpenId) {
      skipped++; // já migrado
      continue;
    }
    if (!data.invitedBy) {
      skipped++;
      continue;
    }
    // Buscar usuário para descobrir o openId
    const userDoc = await db.collection('users').doc(String(data.invitedBy)).get();
    if (!userDoc.exists) {
      console.warn(`[Migration] Usuário ${data.invitedBy} não encontrado para convite ${doc.id}`);
      skipped++;
      continue;
    }
    const userData = userDoc.data() || {};
    const openId = userData.openId;
    if (!openId) {
      console.warn(`[Migration] Usuário ${data.invitedBy} sem openId para convite ${doc.id}`);
      skipped++;
      continue;
    }
    await doc.ref.set({ invitedByOpenId: openId }, { merge: true });
    updated++;
    console.log(`[Migration] Convite ${doc.id} atualizado com invitedByOpenId=${openId}`);
  }

  console.log(`\n[Migration] Concluído. Atualizados: ${updated}, Ignorados: ${skipped}\n`);
}

run().catch(err => {
  console.error('[Migration] Erro fatal', err);
  process.exit(1);
});
