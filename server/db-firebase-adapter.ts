/**
 * Adaptador para manter compatibilidade com a interface SQL atual
 * mas usar Firebase Firestore como backend
 */
import { ENV } from './_core/env';
import type {
  User,
  Group,
  GroupMember,
  SharedExpense,
  ExpenseSplit,
  PersonalExpense,
  Task,
  Reminder,
  CalendarEvent,
  Invitation,
  Notification,
} from './firestore-db';

// Se Firebase estiver configurado, use Firestore, senão use null database
const useFirestore = process.env.DATABASE_TYPE === 'firestore';

// Import dinâmico do Firestore apenas se configurado
let firestoreDb: any = null;
if (useFirestore) {
  try {
    // Note: Estas importações só funcionarão no lado cliente
    // Para o servidor, precisaremos do Firebase Admin SDK
    console.log('[Database] Using Firestore backend');
  } catch (error) {
    console.warn('[Database] Firestore not available, using null database');
  }
}

// Wrapper para manter compatibilidade com a interface atual
export async function getDb() {
  if (useFirestore) {
    return { firestore: true }; // Mock object para indicar que está usando Firestore
  }
  return null;
}

// ============ USER FUNCTIONS ============

export async function upsertUser(user: any): Promise<void> {
  if (!useFirestore) {
    console.warn("[Database] No database configured - upsertUser skipped");
    return;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] upsertUser called with:", user.openId);
}

export async function getUserByOpenId(openId: string) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - getUserByOpenId returning undefined");
    return undefined;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] getUserByOpenId called with:", openId);
  return undefined;
}

export async function getUserById(id: number | string) {
  if (!useFirestore) {
    return undefined;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] getUserById called with:", id);
  return undefined;
}

export async function getUserByEmail(email: string) {
  if (!useFirestore) {
    return undefined;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] getUserByEmail called with:", email);
  return undefined;
}

// ============ GROUP FUNCTIONS ============

export async function createGroup(data: any) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - createGroup returning mock ID");
    return "mock-group-id";
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] createGroup called");
  return "mock-group-id";
}

export async function getGroupById(id: number | string) {
  if (!useFirestore) {
    return undefined;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] getGroupById called with:", id);
  return undefined;
}

export async function getUserGroups(userId: number | string) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - getUserGroups returning empty array");
    return [];
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] getUserGroups called with:", userId);
  return [];
}

export async function updateGroup(id: number | string, data: any) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - updateGroup skipped");
    return;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] updateGroup called");
}

export async function deleteGroup(id: number | string) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - deleteGroup skipped");
    return;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] deleteGroup called");
}

// ============ GROUP MEMBER FUNCTIONS ============

export async function addGroupMember(data: any) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - addGroupMember skipped");
    return;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] addGroupMember called");
}

export async function getGroupMembers(groupId: number | string) {
  if (!useFirestore) {
    return [];
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] getGroupMembers called with:", groupId);
  return [];
}

export async function removeGroupMember(groupId: number | string, userId: number | string) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - removeGroupMember skipped");
    return;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] removeGroupMember called");
}

export async function isUserInGroup(userId: number | string, groupId: number | string) {
  if (!useFirestore) {
    return false;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] isUserInGroup called");
  return false;
}

// ============ SHARED EXPENSE FUNCTIONS ============

export async function createSharedExpense(data: any) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - createSharedExpense returning mock ID");
    return "mock-expense-id";
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] createSharedExpense called");
  return "mock-expense-id";
}

export async function getSharedExpenseById(id: number | string) {
  if (!useFirestore) {
    return undefined;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] getSharedExpenseById called with:", id);
  return undefined;
}

export async function getGroupSharedExpenses(groupId: number | string) {
  if (!useFirestore) {
    return [];
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] getGroupSharedExpenses called with:", groupId);
  return [];
}

export async function updateSharedExpense(id: number | string, data: any) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - updateSharedExpense skipped");
    return;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] updateSharedExpense called");
}

export async function deleteSharedExpense(id: number | string) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - deleteSharedExpense skipped");
    return;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] deleteSharedExpense called");
}

export async function validateSharedExpense(id: number | string, validatedBy: number | string) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - validateSharedExpense skipped");
    return;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] validateSharedExpense called");
}

// ============ EXPENSE SPLIT FUNCTIONS ============

export async function createExpenseSplit(data: any) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - createExpenseSplit skipped");
    return;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] createExpenseSplit called");
}

export async function getExpenseSplits(expenseId: number | string) {
  if (!useFirestore) {
    return [];
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] getExpenseSplits called with:", expenseId);
  return [];
}

export async function markSplitAsPaid(id: number | string) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - markSplitAsPaid skipped");
    return;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] markSplitAsPaid called");
}

// ============ PERSONAL EXPENSE FUNCTIONS ============

export async function createPersonalExpense(data: any) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - createPersonalExpense returning mock ID");
    return "mock-personal-expense-id";
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] createPersonalExpense called");
  return "mock-personal-expense-id";
}

export async function getUserPersonalExpenses(userId: number | string, startDate?: Date, endDate?: Date) {
  if (!useFirestore) {
    return [];
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] getUserPersonalExpenses called with:", userId);
  return [];
}

export async function updatePersonalExpense(id: number | string, data: any) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - updatePersonalExpense skipped");
    return;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] updatePersonalExpense called");
}

export async function deletePersonalExpense(id: number | string) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - deletePersonalExpense skipped");
    return;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] deletePersonalExpense called");
}

// ============ TASK FUNCTIONS ============

export async function createTask(data: any) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - createTask returning mock ID");
    return "mock-task-id";
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] createTask called");
  return "mock-task-id";
}

export async function getUserTasks(userId: number | string, completed?: boolean) {
  if (!useFirestore) {
    return [];
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] getUserTasks called with:", userId);
  return [];
}

export async function updateTask(id: number | string, data: any) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - updateTask skipped");
    return;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] updateTask called");
}

export async function deleteTask(id: number | string) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - deleteTask skipped");
    return;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] deleteTask called");
}

export async function toggleTaskCompleted(id: number | string, completed: boolean) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - toggleTaskCompleted skipped");
    return;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] toggleTaskCompleted called");
}

// ============ REMINDER FUNCTIONS ============

export async function createReminder(data: any) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - createReminder returning mock ID");
    return "mock-reminder-id";
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] createReminder called");
  return "mock-reminder-id";
}

export async function getUserReminders(userId: number | string) {
  if (!useFirestore) {
    return [];
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] getUserReminders called with:", userId);
  return [];
}

export async function updateReminder(id: number | string, data: any) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - updateReminder skipped");
    return;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] updateReminder called");
}

export async function deleteReminder(id: number | string) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - deleteReminder skipped");
    return;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] deleteReminder called");
}

// ============ CALENDAR EVENT FUNCTIONS ============

export async function createCalendarEvent(data: any) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - createCalendarEvent returning mock ID");
    return "mock-calendar-event-id";
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] createCalendarEvent called");
  return "mock-calendar-event-id";
}

export async function getUserCalendarEvents(userId: number | string, startDate?: Date, endDate?: Date) {
  if (!useFirestore) {
    return [];
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] getUserCalendarEvents called with:", userId);
  return [];
}

export async function updateCalendarEvent(id: number | string, data: any) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - updateCalendarEvent skipped");
    return;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] updateCalendarEvent called");
}

export async function deleteCalendarEvent(id: number | string) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - deleteCalendarEvent skipped");
    return;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] deleteCalendarEvent called");
}

// ============ INVITATION FUNCTIONS ============

export async function createInvitation(data: any) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - createInvitation returning mock ID");
    return "mock-invitation-id";
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] createInvitation called");
  return "mock-invitation-id";
}

export async function getUserInvitations(userId: number | string) {
  if (!useFirestore) {
    return [];
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] getUserInvitations called with:", userId);
  return [];
}

export async function getInvitationsByEmail(email: string) {
  if (!useFirestore) {
    return [];
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] getInvitationsByEmail called with:", email);
  return [];
}

export async function updateInvitation(id: number | string, data: any) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - updateInvitation skipped");
    return;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] updateInvitation called");
}

export async function respondToInvitation(id: number | string, status: "accepted" | "rejected") {
  if (!useFirestore) {
    console.warn("[Database] No database configured - respondToInvitation skipped");
    return;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] respondToInvitation called");
}

// ============ NOTIFICATION FUNCTIONS ============

export async function createNotification(data: any) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - createNotification returning mock ID");
    return "mock-notification-id";
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] createNotification called");
  return "mock-notification-id";
}

export async function getUserNotifications(userId: number | string, unreadOnly: boolean = false) {
  if (!useFirestore) {
    return [];
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] getUserNotifications called with:", userId);
  return [];
}

export async function markNotificationAsRead(id: number | string) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - markNotificationAsRead skipped");
    return;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] markNotificationAsRead called");
}

export async function markAllNotificationsAsRead(userId: number | string) {
  if (!useFirestore) {
    console.warn("[Database] No database configured - markAllNotificationsAsRead skipped");
    return;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] markAllNotificationsAsRead called");
}

export async function getUnreadNotificationCount(userId: number | string) {
  if (!useFirestore) {
    return 0;
  }
  
  // TODO: Implementar com Firebase Admin SDK no servidor
  console.log("[Database] getUnreadNotificationCount called");
  return 0;
}