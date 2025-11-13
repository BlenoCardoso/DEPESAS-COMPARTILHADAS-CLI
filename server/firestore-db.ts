import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  onSnapshot,
  enableNetwork,
  disableNetwork,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../client/src/lib/firebase";

// Tipos equivalentes aos do schema SQL
export interface User {
  id?: string;
  openId: string;
  name?: string;
  email?: string;
  loginMethod?: string;
  role: "user" | "admin";
  avatarUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastSignedIn: Timestamp;
}

export interface Group {
  id?: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface GroupMember {
  id?: string;
  groupId: string;
  userId: string;
  role: "owner" | "admin" | "member";
  joinedAt: Timestamp;
}

export interface SharedExpense {
  id?: string;
  groupId: string;
  title: string;
  description?: string;
  amount: number; // em centavos
  currency: string;
  category?: string;
  paidBy: string; // userId
  date: Timestamp;
  status: "pending" | "validated" | "rejected";
  validatedBy?: string;
  validatedAt?: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ExpenseSplit {
  id?: string;
  expenseId: string;
  userId: string;
  amount: number; // em centavos
  paid: boolean;
  paidAt?: Timestamp;
}

export interface PersonalExpense {
  id?: string;
  userId: string;
  title: string;
  description?: string;
  amount: number; // em centavos
  currency: string;
  category?: string;
  date: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Task {
  id?: string;
  userId: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  dueDate?: Timestamp;
  completedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Reminder {
  id?: string;
  userId: string;
  title: string;
  description?: string;
  category?: string;
  reminderDate: Timestamp;
  notified: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CalendarEvent {
  id?: string;
  userId: string;
  title: string;
  description?: string;
  startDate: Timestamp;
  endDate?: Timestamp;
  allDay: boolean;
  color?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Invitation {
  id?: string;
  groupId: string;
  invitedBy: string;
  invitedEmail: string;
  invitedUserId?: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: Timestamp;
  respondedAt?: Timestamp;
}

export interface Notification {
  id?: string;
  userId: string;
  type: "invitation" | "expense" | "validation" | "reminder" | "task" | "general";
  title: string;
  message?: string;
  relatedId?: string;
  read: boolean;
  createdAt: Timestamp;
}

// ============ HELPER FUNCTIONS ============

const addTimestamps = (data: any, isUpdate = false) => {
  const now = serverTimestamp();
  if (isUpdate) {
    return { ...data, updatedAt: now };
  }
  return { ...data, createdAt: now, updatedAt: now };
};

// ============ USER FUNCTIONS ============

export async function upsertUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    // Verificar se usuário já existe
    const q = query(collection(db, 'users'), where('openId', '==', userData.openId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      // Usuário existe, atualizar
      const userDoc = snapshot.docs[0];
      await updateDoc(userDoc.ref, addTimestamps(userData, true));
      return userDoc.id;
    } else {
      // Novo usuário
      const docRef = await addDoc(collection(db, 'users'), addTimestamps({
        ...userData,
        lastSignedIn: serverTimestamp(),
      }));
      return docRef.id;
    }
  } catch (error) {
    console.error('[Firestore] Failed to upsert user:', error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  try {
    const q = query(collection(db, 'users'), where('openId', '==', openId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as User;
    }
    return undefined;
  } catch (error) {
    console.error('[Firestore] Failed to get user:', error);
    return undefined;
  }
}

export async function getUserById(id: string): Promise<User | undefined> {
  try {
    const docRef = doc(db, 'users', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as User;
    }
    return undefined;
  } catch (error) {
    console.error('[Firestore] Failed to get user by ID:', error);
    return undefined;
  }
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  try {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as User;
    }
    return undefined;
  } catch (error) {
    console.error('[Firestore] Failed to get user by email:', error);
    return undefined;
  }
}

// ============ GROUP FUNCTIONS ============

export async function createGroup(groupData: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'groups'), addTimestamps(groupData));
    return docRef.id;
  } catch (error) {
    console.error('[Firestore] Failed to create group:', error);
    throw error;
  }
}

export async function getGroupById(id: string): Promise<Group | undefined> {
  try {
    const docRef = doc(db, 'groups', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Group;
    }
    return undefined;
  } catch (error) {
    console.error('[Firestore] Failed to get group:', error);
    return undefined;
  }
}

export async function getUserGroups(userId: string): Promise<{ group: Group; role: string; joinedAt: Timestamp }[]> {
  try {
    // Buscar memberships do usuário
    const membersQuery = query(
      collection(db, 'groupMembers'),
      where('userId', '==', userId),
      orderBy('joinedAt', 'desc')
    );
    const membersSnapshot = await getDocs(membersQuery);
    
    const result = [];
    for (const memberDoc of membersSnapshot.docs) {
      const memberData = memberDoc.data() as GroupMember;
      const groupDocRef = doc(db, 'groups', memberData.groupId);
      const groupDoc = await getDoc(groupDocRef);
      
      if (groupDoc.exists()) {
        result.push({
          group: { id: groupDoc.id, ...groupDoc.data() } as Group,
          role: memberData.role,
          joinedAt: memberData.joinedAt,
        });
      }
    }
    
    return result;
  } catch (error) {
    console.error('[Firestore] Failed to get user groups:', error);
    return [];
  }
}

export async function updateGroup(id: string, data: Partial<Omit<Group, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  try {
    const docRef = doc(db, 'groups', id);
    await updateDoc(docRef, addTimestamps(data, true));
  } catch (error) {
    console.error('[Firestore] Failed to update group:', error);
    throw error;
  }
}

export async function deleteGroup(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'groups', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('[Firestore] Failed to delete group:', error);
    throw error;
  }
}

// ============ GROUP MEMBER FUNCTIONS ============

export async function addGroupMember(memberData: Omit<GroupMember, 'id' | 'joinedAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'groupMembers'), {
      ...memberData,
      joinedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('[Firestore] Failed to add group member:', error);
    throw error;
  }
}

export async function getGroupMembers(groupId: string): Promise<{ member: GroupMember; user: User }[]> {
  try {
    const membersQuery = query(
      collection(db, 'groupMembers'),
      where('groupId', '==', groupId)
    );
    const membersSnapshot = await getDocs(membersQuery);
    
    const result = [];
    for (const memberDoc of membersSnapshot.docs) {
      const memberData = memberDoc.data() as GroupMember;
      const userDocRef = doc(db, 'users', memberData.userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        result.push({
          member: { id: memberDoc.id, ...memberData },
          user: { id: userDoc.id, ...userDoc.data() } as User,
        });
      }
    }
    
    return result;
  } catch (error) {
    console.error('[Firestore] Failed to get group members:', error);
    return [];
  }
}

export async function removeGroupMember(groupId: string, userId: string): Promise<void> {
  try {
    const q = query(
      collection(db, 'groupMembers'),
      where('groupId', '==', groupId),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    
    const deletePromises = snapshot.docs.map(docSnapshot => deleteDoc(docSnapshot.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('[Firestore] Failed to remove group member:', error);
    throw error;
  }
}

export async function isUserInGroup(userId: string, groupId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'groupMembers'),
      where('userId', '==', userId),
      where('groupId', '==', groupId)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('[Firestore] Failed to check group membership:', error);
    return false;
  }
}

// ============ SHARED EXPENSE FUNCTIONS ============

export async function createSharedExpense(expenseData: Omit<SharedExpense, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'sharedExpenses'), addTimestamps(expenseData));
    return docRef.id;
  } catch (error) {
    console.error('[Firestore] Failed to create shared expense:', error);
    throw error;
  }
}

export async function getSharedExpenseById(id: string): Promise<SharedExpense | undefined> {
  try {
    const docRef = doc(db, 'sharedExpenses', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as SharedExpense;
    }
    return undefined;
  } catch (error) {
    console.error('[Firestore] Failed to get shared expense:', error);
    return undefined;
  }
}

export async function getGroupSharedExpenses(groupId: string): Promise<{ expense: SharedExpense; paidByUser: User }[]> {
  try {
    const expensesQuery = query(
      collection(db, 'sharedExpenses'),
      where('groupId', '==', groupId),
      orderBy('date', 'desc')
    );
    const expensesSnapshot = await getDocs(expensesQuery);
    
    const result = [];
    for (const expenseDoc of expensesSnapshot.docs) {
      const expenseData = expenseDoc.data() as SharedExpense;
      const userDocRef = doc(db, 'users', expenseData.paidBy);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        result.push({
          expense: { id: expenseDoc.id, ...expenseData },
          paidByUser: { id: userDoc.id, ...userDoc.data() } as User,
        });
      }
    }
    
    return result;
  } catch (error) {
    console.error('[Firestore] Failed to get group expenses:', error);
    return [];
  }
}

// ============ REAL-TIME FUNCTIONS ============

export function subscribeToGroupExpenses(
  groupId: string,
  callback: (expenses: { expense: SharedExpense; paidByUser: User }[]) => void
) {
  const q = query(
    collection(db, 'sharedExpenses'),
    where('groupId', '==', groupId),
    orderBy('date', 'desc')
  );
  
  return onSnapshot(q, async (snapshot) => {
    const result = [];
    for (const expenseDoc of snapshot.docs) {
      const expenseData = expenseDoc.data() as SharedExpense;
      const userDocRef = doc(db, 'users', expenseData.paidBy);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        result.push({
          expense: { id: expenseDoc.id, ...expenseData },
          paidByUser: { id: userDoc.id, ...userDoc.data() } as User,
        });
      }
    }
    callback(result);
  });
}

export function subscribeToUserNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void
) {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('read', '==', false),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  
  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(docSnapshot => ({
      id: docSnapshot.id,
      ...docSnapshot.data(),
    })) as Notification[];
    callback(notifications);
  });
}

// ============ INVITATION FUNCTIONS ============

export async function createInvitation(invitationData: Omit<Invitation, 'id' | 'createdAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'invitations'), {
      ...invitationData,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('[Firestore] Failed to create invitation:', error);
    throw error;
  }
}

export async function getUserInvitations(userId: string): Promise<Invitation[]> {
  try {
    // Buscar por convites enviados pelo usuário
    const sentQuery = query(
      collection(db, 'invitations'),
      where('invitedBy', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    // Buscar por convites recebidos pelo usuário (por email)
    const user = await getUserById(userId);
    if (!user?.email) {
      const sentSnapshot = await getDocs(sentQuery);
      return sentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Invitation[];
    }
    
    const receivedQuery = query(
      collection(db, 'invitations'),
      where('invitedEmail', '==', user.email),
      orderBy('createdAt', 'desc')
    );
    
    const [sentSnapshot, receivedSnapshot] = await Promise.all([
      getDocs(sentQuery),
      getDocs(receivedQuery)
    ]);
    
    const sentInvitations = sentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Invitation[];
    const receivedInvitations = receivedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Invitation[];
    
    // Combinar e remover duplicatas
    const allInvitations = [...sentInvitations, ...receivedInvitations];
    const uniqueInvitations = allInvitations.filter((invitation, index, self) => 
      index === self.findIndex(i => i.id === invitation.id)
    );
    
    return uniqueInvitations.sort((a, b) => 
      b.createdAt.toMillis() - a.createdAt.toMillis()
    );
  } catch (error) {
    console.error('[Firestore] Failed to get user invitations:', error);
    return [];
  }
}

export async function getInvitationsByEmail(email: string): Promise<Invitation[]> {
  try {
    const q = query(
      collection(db, 'invitations'),
      where('invitedEmail', '==', email),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Invitation[];
  } catch (error) {
    console.error('[Firestore] Failed to get invitations by email:', error);
    return [];
  }
}

export async function getInvitationById(id: string): Promise<Invitation | undefined> {
  try {
    const docRef = doc(db, 'invitations', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Invitation;
    }
    return undefined;
  } catch (error) {
    console.error('[Firestore] Failed to get invitation:', error);
    return undefined;
  }
}

export async function updateInvitation(id: string, data: Partial<Omit<Invitation, 'id' | 'createdAt'>>): Promise<void> {
  try {
    const docRef = doc(db, 'invitations', id);
    await updateDoc(docRef, {
      ...data,
      ...(data.status && data.status !== 'pending' && { respondedAt: serverTimestamp() })
    });
  } catch (error) {
    console.error('[Firestore] Failed to update invitation:', error);
    throw error;
  }
}

export async function respondToInvitation(id: string, status: 'accepted' | 'rejected', userId?: string): Promise<void> {
  try {
    const updateData: any = {
      status,
      respondedAt: serverTimestamp(),
    };
    
    if (userId) {
      updateData.invitedUserId = userId;
    }
    
    const docRef = doc(db, 'invitations', id);
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('[Firestore] Failed to respond to invitation:', error);
    throw error;
  }
}

// ============ NOTIFICATION FUNCTIONS ============

export async function createNotification(notificationData: Omit<Notification, 'id' | 'createdAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'notifications'), {
      ...notificationData,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('[Firestore] Failed to create notification:', error);
    throw error;
  }
}

export async function getUserNotifications(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
  try {
    let q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    if (unreadOnly) {
      q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[];
  } catch (error) {
    console.error('[Firestore] Failed to get user notifications:', error);
    return [];
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'notifications', id);
    await updateDoc(docRef, { read: true });
  } catch (error) {
    console.error('[Firestore] Failed to mark notification as read:', error);
    throw error;
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const snapshot = await getDocs(q);
    
    const updatePromises = snapshot.docs.map(docSnapshot => 
      updateDoc(docSnapshot.ref, { read: true })
    );
    
    await Promise.all(updatePromises);
  } catch (error) {
    console.error('[Firestore] Failed to mark all notifications as read:', error);
    throw error;
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('[Firestore] Failed to get unread notification count:', error);
    return 0;
  }
}

// ============ EXPENSE SPLIT FUNCTIONS ============

export async function createExpenseSplit(splitData: Omit<ExpenseSplit, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'expenseSplits'), splitData);
    return docRef.id;
  } catch (error) {
    console.error('[Firestore] Failed to create expense split:', error);
    throw error;
  }
}

export async function getExpenseSplits(expenseId: string): Promise<{ split: ExpenseSplit; user: User }[]> {
  try {
    const splitsQuery = query(
      collection(db, 'expenseSplits'),
      where('expenseId', '==', expenseId)
    );
    const splitsSnapshot = await getDocs(splitsQuery);
    
    const result = [];
    for (const splitDoc of splitsSnapshot.docs) {
      const splitData = splitDoc.data() as ExpenseSplit;
      const userDocRef = doc(db, 'users', splitData.userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        result.push({
          split: { id: splitDoc.id, ...splitData },
          user: { id: userDoc.id, ...userDoc.data() } as User,
        });
      }
    }
    
    return result;
  } catch (error) {
    console.error('[Firestore] Failed to get expense splits:', error);
    return [];
  }
}

export async function markSplitAsPaid(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'expenseSplits', id);
    await updateDoc(docRef, { 
      paid: true, 
      paidAt: serverTimestamp() 
    });
  } catch (error) {
    console.error('[Firestore] Failed to mark split as paid:', error);
    throw error;
  }
}

export async function updateSharedExpense(id: string, data: Partial<Omit<SharedExpense, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
  try {
    const docRef = doc(db, 'sharedExpenses', id);
    await updateDoc(docRef, addTimestamps(data, true));
  } catch (error) {
    console.error('[Firestore] Failed to update shared expense:', error);
    throw error;
  }
}

export async function deleteSharedExpense(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'sharedExpenses', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('[Firestore] Failed to delete shared expense:', error);
    throw error;
  }
}

export async function validateSharedExpense(id: string, validatedBy: string): Promise<void> {
  try {
    const docRef = doc(db, 'sharedExpenses', id);
    await updateDoc(docRef, {
      status: 'validated',
      validatedBy,
      validatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('[Firestore] Failed to validate shared expense:', error);
    throw error;
  }
}

// ============ OFFLINE SUPPORT ============

export async function enableOffline(): Promise<void> {
  try {
    await disableNetwork(db);
    console.log('[Firestore] Offline mode enabled');
  } catch (error) {
    console.error('[Firestore] Failed to enable offline mode:', error);
  }
}

export async function enableOnline(): Promise<void> {
  try {
    await enableNetwork(db);
    console.log('[Firestore] Online mode enabled');
  } catch (error) {
    console.error('[Firestore] Failed to enable online mode:', error);
  }
}