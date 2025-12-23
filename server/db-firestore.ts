import { adminDb } from "./_core/firebaseAdmin";
import { ENV } from "./_core/env";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import type { DocumentReference } from "firebase-admin/firestore";

// Public types exposed to the rest of the server
export type User = {
  id?: string;
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  role?: "user" | "admin";
  avatarUrl?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  lastSignedIn?: Date;
};

// Helpers
const toDate = (v: any) => (v instanceof Timestamp ? v.toDate() : v);
const normalize = <T extends Record<string, any>>(obj: T): T => {
  const out: any = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === "object") {
      if (v instanceof Timestamp) out[k] = v.toDate();
      else out[k] = normalize(v as any);
    } else out[k] = v;
  }
  return out as T;
};

const nowUpdate = () => ({ updatedAt: FieldValue.serverTimestamp() });
const nowCreate = () => ({ createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
// Remove chaves com valor undefined para prevenir erros Firestore
const omitUndefined = <T extends Record<string, any>>(obj: T): T => {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
};

// ============ USERS ============
export async function upsertUser(user: User): Promise<void> {
  const db = adminDb();
  const usersCollection = db.collection("users");
  const snap = await usersCollection.where("openId", "==", user.openId).limit(1).get();
  const hasEmailProp = Object.prototype.hasOwnProperty.call(user, "email");
  const normalizedEmail = typeof user.email === "string"
    ? user.email.toLowerCase()
    : user.email ?? null;
  const data: Record<string, any> = {
    openId: user.openId,
    name: user.name ?? null,
    loginMethod: user.loginMethod ?? null,
    avatarUrl: user.avatarUrl ?? null,
    lastSignedIn: FieldValue.serverTimestamp(),
    role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
    ...nowUpdate(),
  };
  if (hasEmailProp) {
    data.email = normalizedEmail;
  }
  if (snap.empty) {
    let targetRef: DocumentReference | null = null;

    if (normalizedEmail) {
      const emailSnap = await usersCollection.where("email", "==", normalizedEmail).limit(1).get();
      if (!emailSnap.empty) {
        targetRef = emailSnap.docs[0].ref;
      }
    }

    if (!targetRef) {
      await usersCollection.add({ ...data, ...nowCreate() });
    } else {
      await targetRef.set({ ...data, ...nowUpdate(), email: normalizedEmail ?? null }, { merge: true });
    }
  } else {
    await snap.docs[0].ref.set(data, { merge: true });
  }
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = adminDb();
  const snap = await db.collection("users").where("openId", "==", openId).limit(1).get();
  if (snap.empty) return undefined;
  const doc = snap.docs[0];
  const data = normalize(doc.data());
  return { id: doc.id, ...data } as User;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const db = adminDb();
  const doc = await db.collection("users").doc(id).get();
  if (!doc.exists) return undefined;
  const data = normalize(doc.data() || {});
  return { id: doc.id, ...data } as User;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const db = adminDb();
  const normalized = email.toLowerCase();
  const snap = await db.collection("users").where("email", "==", normalized).limit(1).get();
  if (snap.empty) return undefined;
  const doc = snap.docs[0];
  const data = normalize(doc.data());
  return { id: doc.id, ...data } as User;
}

// ============ GROUPS ============
export async function createGroup(data: { name: string; description?: string; ownerId: string }) {
  const db = adminDb();
  const ref = await db.collection("groups").add({ ...omitUndefined(data), ...nowCreate() });
  return ref.id;
}

export async function getGroupById(id: string) {
  const db = adminDb();
  const doc = await db.collection("groups").doc(id).get();
  if (!doc.exists) return undefined;
  const data = normalize(doc.data() || {});
  return { id: doc.id, ...data };
}

export async function getUserGroups(userId: string) {
  const db = adminDb();
  const mSnap = await db
    .collection("groupMembers")
    .where("userId", "==", userId)
    .orderBy("joinedAt", "desc")
    .get();

  const out: any[] = [];
  for (const m of mSnap.docs) {
    const member = normalize(m.data());
    const gDoc = await db.collection("groups").doc(member.groupId).get();
    if (gDoc.exists) {
      out.push({ group: { id: gDoc.id, ...normalize(gDoc.data() || {}) }, role: member.role, joinedAt: toDate(member.joinedAt) });
    }
  }
  return out;
}

export async function getUserGroupStats(userId: string) {
  const db = adminDb();

  const membershipSnap = await db
    .collection("groupMembers")
    .where("userId", "==", userId)
    .get();

  const groupIds = Array.from(
    new Set(membershipSnap.docs.map((d) => String(d.get("groupId") ?? "")).filter(Boolean))
  );

  const membersCountByGroupId = new Map<string, number>();
  const pendingExpensesCountByGroupId = new Map<string, number>();
  const expensesCountByGroupId = new Map<string, number>();

  const chunkSize = 10;
  for (let i = 0; i < groupIds.length; i += chunkSize) {
    const chunk = groupIds.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;

    const membersSnap = await db
      .collection("groupMembers")
      .where("groupId", "in", chunk)
      .get();

    for (const doc of membersSnap.docs) {
      const groupId = String(doc.get("groupId") ?? "");
      if (!groupId) continue;
      membersCountByGroupId.set(groupId, (membersCountByGroupId.get(groupId) ?? 0) + 1);
    }

    const pendingSnap = await db
      .collection("sharedExpenses")
      .where("groupId", "in", chunk)
      .where("status", "==", "pending")
      .get();

    for (const doc of pendingSnap.docs) {
      const groupId = String(doc.get("groupId") ?? "");
      if (!groupId) continue;
      pendingExpensesCountByGroupId.set(groupId, (pendingExpensesCountByGroupId.get(groupId) ?? 0) + 1);
    }
  }

  // Total de despesas por grupo (query agregada por grupo para evitar ler documentos)
  await Promise.all(
    groupIds.map(async (groupId) => {
      const snap = await db.collection("sharedExpenses").where("groupId", "==", groupId).count().get();
      const count = Number(snap.data().count ?? 0);
      expensesCountByGroupId.set(groupId, count);
    })
  );

  return groupIds.map((groupId) => ({
    groupId,
    membersCount: membersCountByGroupId.get(groupId) ?? 0,
    pendingExpensesCount: pendingExpensesCountByGroupId.get(groupId) ?? 0,
    expensesCount: expensesCountByGroupId.get(groupId) ?? 0,
  }));
}

export async function getGroupStats(groupId: string) {
  const db = adminDb();

  const [membersSnap, pendingSnap, expensesCountSnap] = await Promise.all([
    db.collection("groupMembers").where("groupId", "==", groupId).get(),
    db.collection("sharedExpenses").where("groupId", "==", groupId).where("status", "==", "pending").get(),
    db.collection("sharedExpenses").where("groupId", "==", groupId).count().get(),
  ]);

  return {
    groupId,
    membersCount: membersSnap.size,
    pendingExpensesCount: pendingSnap.size,
    expensesCount: Number(expensesCountSnap.data().count ?? 0),
  };
}

export async function updateGroup(id: string, data: { name?: string; description?: string }) {
  const db = adminDb();
  await db.collection("groups").doc(id).set({ ...omitUndefined(data), ...nowUpdate() }, { merge: true });
}

export async function deleteGroup(id: string) {
  const db = adminDb();
  await db.collection("groups").doc(id).delete();
}

// ============ GROUP MEMBERS ============
export async function addGroupMember(data: { groupId: string; userId: string; role: "owner" | "admin" | "member" }) {
  const db = adminDb();
  const membersCol = db.collection("groupMembers");
  const existing = await membersCol
    .where("groupId", "==", data.groupId)
    .where("userId", "==", data.userId)
    .limit(1)
    .get();

  const basePayload = {
    groupId: data.groupId,
    userId: data.userId,
    role: data.role,
  };

  if (existing.empty) {
    await membersCol.add({ ...basePayload, joinedAt: FieldValue.serverTimestamp() });
  } else {
    const doc = existing.docs[0];
    const joinedAt = doc.get("joinedAt") ?? FieldValue.serverTimestamp();
    await doc.ref.set({ ...basePayload, joinedAt, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  // Deterministic doc for security rules: groups/{groupId}/members/{userId}
  await db
    .collection("groups")
    .doc(data.groupId)
    .collection("members")
    .doc(data.userId)
    .set({ role: data.role, joinedAt: FieldValue.serverTimestamp() }, { merge: true });
}

export async function getGroupMembers(groupId: string) {
  const db = adminDb();
  const snap = await db.collection("groupMembers").where("groupId", "==", groupId).get();
  const out: any[] = [];
  for (const d of snap.docs) {
    const member = normalize(d.data());
    const uDoc = await db.collection("users").doc(member.userId).get();
    if (uDoc.exists) out.push({ member: { id: d.id, ...member }, user: { id: uDoc.id, ...normalize(uDoc.data() || {}) } });
  }
  return out;
}

export async function removeGroupMember(groupId: string, userId: string) {
  const db = adminDb();
  const snap = await db.collection("groupMembers").where("groupId", "==", groupId).where("userId", "==", userId).get();
  await Promise.all(snap.docs.map(d => d.ref.delete()));
  await db.collection("groups").doc(groupId).collection("members").doc(userId).delete().catch(() => {});
}

export async function isUserInGroup(userId: string, groupId: string) {
  const db = adminDb();
  // first check deterministic subdoc for fast allow in rules parity
  const sub = await db.collection("groups").doc(groupId).collection("members").doc(userId).get();
  if (sub.exists) return true;
  const snap = await db.collection("groupMembers").where("groupId", "==", groupId).where("userId", "==", userId).limit(1).get();
  return !snap.empty;
}

// ============ SHARED EXPENSES ============
export async function createSharedExpense(data: any) {
  const db = adminDb();
  const ref = await db.collection("sharedExpenses").add({ ...omitUndefined(data), ...nowCreate() });
  return ref.id;
}

export async function getSharedExpenseById(id: string) {
  const db = adminDb();
  const doc = await db.collection("sharedExpenses").doc(id).get();
  if (!doc.exists) return undefined;
  return { id: doc.id, ...normalize(doc.data() || {}) };
}

export async function getGroupSharedExpenses(groupId: string) {
  const db = adminDb();
  const snap = await db
    .collection("sharedExpenses")
    .where("groupId", "==", groupId)
    .orderBy("date", "desc")
    .get();
  const out: any[] = [];
  for (const d of snap.docs) {
    const expense = normalize(d.data());
    const uDoc = await db.collection("users").doc(expense.paidBy).get();
    if (uDoc.exists) out.push({ expense: { id: d.id, ...expense }, paidByUser: { id: uDoc.id, ...normalize(uDoc.data() || {}) } });
  }
  return out;
}

export async function updateSharedExpense(id: string, data: any) {
  const db = adminDb();
  await db.collection("sharedExpenses").doc(id).set({ ...omitUndefined(data), ...nowUpdate() }, { merge: true });
}

export async function deleteSharedExpense(id: string) {
  const db = adminDb();
  await db.collection("sharedExpenses").doc(id).delete();
}

export async function validateSharedExpense(id: string, validatedBy: string) {
  const db = adminDb();
  await db.collection("sharedExpenses").doc(id).set(
    { status: "validated", validatedBy, validatedAt: FieldValue.serverTimestamp(), ...nowUpdate() },
    { merge: true }
  );
}

// ============ EXPENSE SPLITS ============
export async function createExpenseSplit(data: any) {
  const db = adminDb();
  await db.collection("expenseSplits").add({
    ...data,
    // Ensure groupId is present for security rules
    groupId: data.groupId,
  });
}

export async function getExpenseSplits(expenseId: string) {
  const db = adminDb();
  const snap = await db.collection("expenseSplits").where("expenseId", "==", expenseId).get();
  const out: any[] = [];
  for (const d of snap.docs) {
    const split = normalize(d.data());
    const uDoc = await db.collection("users").doc(split.userId).get();
    if (uDoc.exists) out.push({ split: { id: d.id, ...split }, user: { id: uDoc.id, ...normalize(uDoc.data() || {}) } });
  }
  return out;
}

export async function getExpenseSplitById(id: string) {
  const db = adminDb();
  const doc = await db.collection("expenseSplits").doc(id).get();
  if (!doc.exists) return undefined;
  const split = normalize(doc.data() || {});
  return { id: doc.id, ...split };
}

export async function markSplitAsPaid(id: string) {
  const db = adminDb();
  await db.collection("expenseSplits").doc(id).set({ paid: true, paidAt: FieldValue.serverTimestamp() }, { merge: true });
}

// ============ PERSONAL EXPENSES ============
export async function createPersonalExpense(data: any) {
  const db = adminDb();
  const ref = await db.collection("personalExpenses").add({ ...omitUndefined(data), ...nowCreate() });
  return ref.id;
}

export async function getUserPersonalExpenses(userId: string, startDate?: Date, endDate?: Date) {
  const db = adminDb();
  let q: FirebaseFirestore.Query = db.collection("personalExpenses").where("userId", "==", userId);

  const filterInMemory = (items: any[]) => {
    if (!startDate && !endDate) return items;
    return items.filter((e) => {
      const d = e?.date instanceof Date ? e.date : e?.date ? new Date(e.date) : null;
      if (!d || Number.isNaN(d.getTime())) return false;
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });
  };

  if (startDate && endDate) {
    try {
      const ranged = await q
        .where("date", ">=", Timestamp.fromDate(startDate))
        .where("date", "<=", Timestamp.fromDate(endDate))
        .get();
      return ranged.docs.map((d) => ({ id: d.id, ...normalize(d.data()) }));
    } catch {
      const snap = await q.get();
      const all = snap.docs.map((d) => ({ id: d.id, ...normalize(d.data()) }));
      return filterInMemory(all);
    }
  }

  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...normalize(d.data()) }));
}

export async function updatePersonalExpense(id: string, data: any) {
  const db = adminDb();
  await db.collection("personalExpenses").doc(id).set({ ...omitUndefined(data), ...nowUpdate() }, { merge: true });
}

export async function deletePersonalExpense(id: string) {
  const db = adminDb();
  await db.collection("personalExpenses").doc(id).delete();
}

// ============ TASKS ============
export async function createTask(data: any) {
  const db = adminDb();
  const ref = await db.collection("tasks").add({ ...omitUndefined(data), ...nowCreate() });
  return ref.id;
}

export async function getUserTasks(userId: string, completed?: boolean) {
  const db = adminDb();
  let q: FirebaseFirestore.Query = db.collection("tasks").where("userId", "==", userId);
  if (completed !== undefined) q = q.where("completed", "==", completed);
  const snap = await q.get();
  return snap.docs.map(d => ({ id: d.id, ...normalize(d.data()) }));
}

export async function updateTask(id: string, data: any) {
  const db = adminDb();
  await db.collection("tasks").doc(id).set({ ...omitUndefined(data), ...nowUpdate() }, { merge: true });
}

export async function deleteTask(id: string) {
  const db = adminDb();
  await db.collection("tasks").doc(id).delete();
}

export async function toggleTaskCompleted(id: string, completed: boolean) {
  const db = adminDb();
  await db.collection("tasks").doc(id).set({ completed, completedAt: completed ? FieldValue.serverTimestamp() : null, ...nowUpdate() }, { merge: true });
}

// ============ REMINDERS ============
export async function createReminder(data: any) {
  const db = adminDb();
  const ref = await db.collection("reminders").add({ ...omitUndefined(data), ...nowCreate() });
  return ref.id;
}

export async function getUserReminders(userId: string) {
  const db = adminDb();
  const snap = await db.collection("reminders").where("userId", "==", userId).orderBy("reminderDate").get();
  return snap.docs.map(d => ({ id: d.id, ...normalize(d.data()) }));
}

export async function updateReminder(id: string, data: any) {
  const db = adminDb();
  await db.collection("reminders").doc(id).set({ ...omitUndefined(data), ...nowUpdate() }, { merge: true });
}

export async function deleteReminder(id: string) {
  const db = adminDb();
  await db.collection("reminders").doc(id).delete();
}

// ============ CALENDAR ============
export async function createCalendarEvent(data: any) {
  const db = adminDb();
  const ref = await db.collection("calendarEvents").add({ ...omitUndefined(data), ...nowCreate() });
  return ref.id;
}

export async function getUserCalendarEvents(userId: string, startDate?: Date, endDate?: Date) {
  const db = adminDb();
  let q: FirebaseFirestore.Query = db.collection("calendarEvents").where("userId", "==", userId);
  if (startDate && endDate) {
    q = q.where("startDate", ">=", Timestamp.fromDate(startDate)).where("startDate", "<=", Timestamp.fromDate(endDate));
  }
  const snap = await q.get();
  return snap.docs.map(d => ({ id: d.id, ...normalize(d.data()) }));
}

export async function updateCalendarEvent(id: string, data: any) {
  const db = adminDb();
  await db.collection("calendarEvents").doc(id).set({ ...omitUndefined(data), ...nowUpdate() }, { merge: true });
}

export async function deleteCalendarEvent(id: string) {
  const db = adminDb();
  await db.collection("calendarEvents").doc(id).delete();
}

// ============ INVITATIONS ============
export async function createInvitation(data: any) {
  const db = adminDb();
  const ref = await db.collection("invitations").add({ ...data, createdAt: FieldValue.serverTimestamp() });
  return ref.id;
}

export async function getUserInvitations(userId: string) {
  const db = adminDb();
  const sentSnap = await db.collection("invitations").where("invitedBy", "==", userId).orderBy("createdAt", "desc").get();
  const sent = sentSnap.docs.map(d => ({ id: d.id, ...normalize(d.data()) }));
  // To resolve received by email, fetch user first
  const user = await getUserById(userId);
  if (!user?.email) return sent;
  const recSnap = await db.collection("invitations").where("invitedEmail", "==", user.email).orderBy("createdAt", "desc").get();
  const rec = recSnap.docs.map(d => ({ id: d.id, ...normalize(d.data()) }));
  const map = new Map<string, any>();
  for (const i of [...sent, ...rec]) map.set(i.id, i);
  return Array.from(map.values()).sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
}

export async function getInvitationsByEmail(email: string) {
  const db = adminDb();
  const snap = await db.collection("invitations").where("invitedEmail", "==", email).orderBy("createdAt", "desc").get();
  return snap.docs.map(d => ({ id: d.id, ...normalize(d.data()) }));
}

export async function updateInvitation(id: string, data: any) {
  const db = adminDb();
  await db.collection("invitations").doc(id).set({ ...data, ...nowUpdate() }, { merge: true });
}

export async function respondToInvitation(id: string, status: "accepted" | "rejected") {
  const db = adminDb();
  await db.collection("invitations").doc(id).set({ status, respondedAt: FieldValue.serverTimestamp(), ...nowUpdate() }, { merge: true });
}

export async function getInvitationById(id: string) {
  const db = adminDb();
  const doc = await db.collection("invitations").doc(id).get();
  if (!doc.exists) return undefined;
  return { id: doc.id, ...normalize(doc.data() || {}) };
}

export async function deleteInvitation(id: string) {
  const db = adminDb();
  await db.collection("invitations").doc(id).delete();
}

// ============ NOTIFICATIONS ============
export async function createNotification(data: any) {
  const db = adminDb();
  const ref = await db.collection("notifications").add({ ...data, createdAt: FieldValue.serverTimestamp() });
  return ref.id;
}

export async function getUserNotifications(userId: string, unreadOnly = false) {
  const db = adminDb();
  let q: FirebaseFirestore.Query = db.collection("notifications").where("userId", "==", userId).orderBy("createdAt", "desc");
  if (unreadOnly) q = db.collection("notifications").where("userId", "==", userId).where("read", "==", false).orderBy("createdAt", "desc");
  const snap = await q.limit(50).get();
  return snap.docs.map(d => ({ id: d.id, ...normalize(d.data()) }));
}

export async function markNotificationAsRead(id: string) {
  const db = adminDb();
  await db.collection("notifications").doc(id).set({ read: true }, { merge: true });
}

export async function markAllNotificationsAsRead(userId: string) {
  const db = adminDb();
  const snap = await db.collection("notifications").where("userId", "==", userId).where("read", "==", false).get();
  await Promise.all(snap.docs.map(d => d.ref.set({ read: true }, { merge: true })));
}

export async function getUnreadNotificationCount(userId: string) {
  const db = adminDb();
  const snap = await db.collection("notifications").where("userId", "==", userId).where("read", "==", false).get();
  return snap.size;
}

// ============ SETTLEMENTS ============
export async function createSettlement(data: any) {
  const db = adminDb();
  const ref = await db.collection("settlements").add({ ...omitUndefined(data), ...nowCreate() });
  return ref.id;
}

export async function getGroupSettlements(groupId: string) {
  const db = adminDb();
  const snap = await db.collection("settlements").where("groupId", "==", groupId).orderBy("settledAt", "desc").get();
  return snap.docs.map(d => ({ id: d.id, ...normalize(d.data()) }));
}

// ============ EXPENSE TEMPLATES ============
export async function createExpenseTemplate(data: any) {
  const db = adminDb();
  const ref = await db.collection("expenseTemplates").add({ ...omitUndefined(data), ...nowCreate() });
  return ref.id;
}

export async function getGroupExpenseTemplates(groupId: string) {
  const db = adminDb();
  const snap = await db.collection("expenseTemplates").where("groupId", "==", groupId).where("isActive", "==", true).get();
  return snap.docs.map(d => ({ id: d.id, ...normalize(d.data()) }));
}

export async function updateExpenseTemplate(id: string, data: any) {
  const db = adminDb();
  await db.collection("expenseTemplates").doc(id).set({ ...omitUndefined(data), ...nowUpdate() }, { merge: true });
}

export async function deleteExpenseTemplate(id: string) {
  const db = adminDb();
  await db.collection("expenseTemplates").doc(id).delete();
}

// ============ EXPENSE CATEGORIES (CATEGORIAS PERSONALIZADAS) ============
export async function createExpenseCategory(data: {
  groupId: string;
  name: string;
  icon?: string;
  createdBy: string;
}): Promise<string> {
  const db = adminDb();
  const ref = await db.collection("expenseCategories").add({
    ...data,
    ...nowCreate(),
  });
  return ref.id;
}

export async function getGroupExpenseCategories(groupId: string) {
  const db = adminDb();
  const snap = await db.collection("expenseCategories").where("groupId", "==", groupId).orderBy("createdAt", "desc").get();
  return snap.docs.map(doc => normalize({ id: doc.id, ...doc.data() }));
}

export async function updateExpenseCategory(id: string, data: { name?: string; icon?: string }) {
  const db = adminDb();
  await db.collection("expenseCategories").doc(id).set({ ...omitUndefined(data), ...nowUpdate() }, { merge: true });
}

export async function deleteExpenseCategory(id: string) {
  const db = adminDb();
  await db.collection("expenseCategories").doc(id).delete();
}

export async function updateGroupMember(groupId: string, userId: string, data: any) {
  const db = adminDb();
  const snap = await db.collection("groupMembers").where("groupId", "==", groupId).where("userId", "==", userId).limit(1).get();
  if (!snap.empty) {
    await snap.docs[0].ref.set({ ...omitUndefined(data), ...nowUpdate() }, { merge: true });
  }
}
