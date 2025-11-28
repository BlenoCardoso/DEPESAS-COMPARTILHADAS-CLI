import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db-firestore";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============ GROUPS ROUTER ============
  groups: router({
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const groupId = await db.createGroup({
          name: input.name,
          description: input.description,
          ownerId: ctx.user.id!,
        });

        // Adicionar o criador como membro owner
        await db.addGroupMember({
          groupId,
          userId: ctx.user.id!,
          role: "owner",
        });

        return { groupId };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      const result = await db.getUserGroups(ctx.user.id!);
      // ensure date-like fields are JS Dates (db-firestore already normalizes)
      return result;
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const group = await db.getGroupById(input.id) as any;
        if (!group) throw new TRPCError({ code: "NOT_FOUND" });

        const isMember = await db.isUserInGroup(ctx.user.id!, input.id);
        if (!isMember) throw new TRPCError({ code: "FORBIDDEN" });

        return group;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const group = await db.getGroupById(input.id) as any;
        if (!group) throw new TRPCError({ code: "NOT_FOUND" });
        if (group.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

        await db.updateGroup(input.id, {
          name: input.name,
          description: input.description,
        });

        return { success: true, groupId: inv.groupId };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const group = await db.getGroupById(input.id) as any;
        if (!group) throw new TRPCError({ code: "NOT_FOUND" });
        if (group.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

        await db.deleteGroup(input.id);
        return { success: true };
      }),

    getMembers: protectedProcedure
      .input(z.object({ groupId: z.string() }))
      .query(async ({ ctx, input }) => {
        const isMember = await db.isUserInGroup(ctx.user.id!, input.groupId);
        if (!isMember) throw new TRPCError({ code: "FORBIDDEN" });

        return await db.getGroupMembers(input.groupId);
      }),

    removeMember: protectedProcedure
      .input(z.object({
        groupId: z.string(),
        userId: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const group = await db.getGroupById(input.groupId) as any;
        if (!group) throw new TRPCError({ code: "NOT_FOUND" });
        if (group.ownerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

        await db.removeGroupMember(input.groupId, input.userId);
        return { success: true };
      }),
  }),

  // ============ SHARED EXPENSES ROUTER ============
  sharedExpenses: router({
    create: protectedProcedure
      .input(z.object({
        groupId: z.string(),
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        amount: z.number().int().positive(),
        currency: z.string().default("BRL"),
        category: z.string().optional(),
        date: z.date(),
        splits: z.array(z.object({
          userId: z.string(),
          amount: z.number().int().positive(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const isMember = await db.isUserInGroup(ctx.user.id!, input.groupId);
        if (!isMember) throw new TRPCError({ code: "FORBIDDEN" });

        const expenseId = await db.createSharedExpense({
          groupId: input.groupId,
          title: input.title,
          description: input.description,
          amount: input.amount,
          currency: input.currency,
          category: input.category,
          paidBy: ctx.user.id!,
          date: input.date,
          createdBy: ctx.user.id!,
          status: "pending",
        });

        // Criar splits
        for (const split of input.splits) {
          await db.createExpenseSplit({
            expenseId,
            userId: split.userId,
            amount: split.amount,
            paid: split.userId === ctx.user.id, // Quem pagou já está quitado
            groupId: input.groupId,
          });
        }

        // Criar notificações para os membros
        const members = await db.getGroupMembers(input.groupId);
        for (const member of members) {
          if (member.user.id !== ctx.user.id) {
            await db.createNotification({
              userId: member.user.id,
              type: "expense",
              title: "Nova despesa compartilhada",
              message: `${ctx.user.name} adicionou uma despesa: ${input.title}`,
              relatedId: expenseId,
              read: false,
            });
          }
        }

        return { expenseId };
      }),

    list: protectedProcedure
      .input(z.object({ groupId: z.string() }))
      .query(async ({ ctx, input }) => {
        const isMember = await db.isUserInGroup(ctx.user.id!, input.groupId);
        if (!isMember) throw new TRPCError({ code: "FORBIDDEN" });

        return await db.getGroupSharedExpenses(input.groupId);
      }),

    // Total de despesas compartilhadas em todos os grupos do usuário
    countForUser: protectedProcedure
      .query(async ({ ctx }) => {
        const groups = await db.getUserGroups(ctx.user.id!);
        let count = 0;
        let totalAmount = 0; // em centavos
        for (const g of groups) {
          const list = await db.getGroupSharedExpenses(g.group.id);
          count += list.length;
          for (const item of list) {
            const amt = Number(item.expense?.amount) || 0;
            totalAmount += amt;
          }
        }
        return { count, totalAmount };
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const expense = await db.getSharedExpenseById(input.id) as any;
        if (!expense) throw new TRPCError({ code: "NOT_FOUND" });

        const isMember = await db.isUserInGroup(ctx.user.id!, expense.groupId);
        if (!isMember) throw new TRPCError({ code: "FORBIDDEN" });

        const splits = await db.getExpenseSplits(input.id);
        return { expense, splits };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        amount: z.number().int().positive().optional(),
        category: z.string().optional(),
        date: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const expense = await db.getSharedExpenseById(input.id) as any;
        if (!expense) throw new TRPCError({ code: "NOT_FOUND" });
        if (expense.createdBy !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

        await db.updateSharedExpense(input.id, {
          title: input.title,
          description: input.description,
          amount: input.amount,
          category: input.category,
          date: input.date,
        });

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const expense = await db.getSharedExpenseById(input.id) as any;
        if (!expense) throw new TRPCError({ code: "NOT_FOUND" });
        if (expense.createdBy !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

        await db.deleteSharedExpense(input.id);
        return { success: true };
      }),

    validate: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const expense = await db.getSharedExpenseById(input.id) as any;
        if (!expense) throw new TRPCError({ code: "NOT_FOUND" });

        const isMember = await db.isUserInGroup(ctx.user.id!, expense.groupId);
        if (!isMember) throw new TRPCError({ code: "FORBIDDEN" });

        await db.validateSharedExpense(input.id, ctx.user.id!);

        // Notificar o criador
        await db.createNotification({
          userId: expense.createdBy,
          type: "validation",
          title: "Despesa validada",
          message: `${ctx.user.name} validou a despesa: ${expense.title}`,
          relatedId: input.id,
          read: false,
        });

        return { success: true };
      }),

    markSplitPaid: protectedProcedure
      .input(z.object({ splitId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await db.markSplitAsPaid(input.splitId);
        return { success: true };
      }),
  }),

  // ============ PERSONAL EXPENSES ROUTER ============
  personalExpenses: router({
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        amount: z.number().int().positive(),
        currency: z.string().default("BRL"),
        category: z.string().optional(),
        date: z.date(),
      }))
      .mutation(async ({ ctx, input }) => {
        const expenseId = await db.createPersonalExpense({
          userId: ctx.user.id!,
          ...input,
        });

        return { expenseId };
      }),

    list: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getUserPersonalExpenses(
          ctx.user.id!,
          input?.startDate,
          input?.endDate
        );
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        amount: z.number().int().positive().optional(),
        category: z.string().optional(),
        date: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updatePersonalExpense(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await db.deletePersonalExpense(input.id);
        return { success: true };
      }),
  }),

  // ============ TASKS ROUTER ============
  tasks: router({
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
        dueDate: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const taskId = await db.createTask({
          userId: ctx.user.id!,
          ...input,
          completed: false,
        });

        return { taskId };
      }),

    list: protectedProcedure
      .input(z.object({
        completed: z.boolean().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getUserTasks(ctx.user.id!, input?.completed);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        dueDate: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateTask(id, data);
        return { success: true };
      }),

    toggleCompleted: protectedProcedure
      .input(z.object({
        id: z.string(),
        completed: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.toggleTaskCompleted(input.id, input.completed);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteTask(input.id);
        return { success: true };
      }),
  }),

  // ============ REMINDERS ROUTER ============
  reminders: router({
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        category: z.string().optional(),
        reminderDate: z.date(),
      }))
      .mutation(async ({ ctx, input }) => {
        const reminderId = await db.createReminder({
          userId: ctx.user.id!,
          ...input,
          notified: false,
        });

        return { reminderId };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserReminders(ctx.user.id!);
    }),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        reminderDate: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateReminder(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteReminder(input.id);
        return { success: true };
      }),
  }),

  // ============ CALENDAR ROUTER ============
  calendar: router({
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        startDate: z.date(),
        endDate: z.date().optional(),
        allDay: z.boolean().default(false),
        color: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const eventId = await db.createCalendarEvent({
          userId: ctx.user.id!,
          ...input,
        });

        return { eventId };
      }),

    list: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getUserCalendarEvents(
          ctx.user.id!,
          input?.startDate,
          input?.endDate
        );
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        allDay: z.boolean().optional(),
        color: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateCalendarEvent(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteCalendarEvent(input.id);
        return { success: true };
      }),
  }),

  // ============ INVITATIONS ROUTER ============
  invitations: router({
    create: protectedProcedure
      .input(z.object({
        groupId: z.string(),
        invitedEmail: z.string().email(),
      }))
      .mutation(async ({ ctx, input }) => {
        const invitedEmail = input.invitedEmail.trim().toLowerCase();
        const group = await db.getGroupById(input.groupId) as any;
        if (!group) throw new TRPCError({ code: "NOT_FOUND" });

        const isMember = await db.isUserInGroup(ctx.user.id!, input.groupId);
        if (!isMember) throw new TRPCError({ code: "FORBIDDEN" });

        // Verificar se o usuário existe
        const invitedUser = await db.getUserByEmail(invitedEmail);

        const invitationId = await db.createInvitation({
          groupId: input.groupId,
          invitedBy: ctx.user.id!,
          invitedByOpenId: ctx.user.openId, // Firebase UID para regras de leitura direta
          invitedEmail,
          invitedUserId: invitedUser?.id,
          status: "pending",
        });

        // Criar notificação se o usuário existe
        if (invitedUser) {
          await db.createNotification({
            userId: invitedUser.id!,
            type: "invitation",
            title: "Novo convite de grupo",
            message: `${ctx.user.name} convidou você para o grupo ${group.name}`,
            relatedId: invitationId,
            read: false,
          });
        }

        return { invitationId };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      const items = await db.getUserInvitations(ctx.user.id!);
      const userEmail = ctx.user.email?.toLowerCase();
      return items.map((inv: any) => {
        const isPending = inv.status === "pending";
        const isRecipientById = inv.invitedUserId && inv.invitedUserId === ctx.user.id;
        const isRecipientByEmail = userEmail && typeof inv.invitedEmail === "string" && inv.invitedEmail.toLowerCase() === userEmail;
        const canRespond = isPending && (isRecipientById || isRecipientByEmail);
        const canCancel = isPending && inv.invitedBy === ctx.user.id!;
        return { ...inv, canRespond, canCancel };
      });
    }),

    respond: protectedProcedure
      .input(z.object({
        id: z.string(),
        accept: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        const inv = await (db as any).getInvitationById?.(input.id);
        if (!inv) throw new TRPCError({ code: "NOT_FOUND" });
        const userEmail = ctx.user.email?.toLowerCase();
        const isRecipientById = inv.invitedUserId && inv.invitedUserId === ctx.user.id;
        const isRecipientByEmail = userEmail && typeof inv.invitedEmail === "string" && inv.invitedEmail.toLowerCase() === userEmail;
        if (!isRecipientById && !isRecipientByEmail) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const status = input.accept ? "accepted" : "rejected";
        await db.respondToInvitation(input.id, status);

        if (input.accept) {
          // Adicionar usuário ao grupo
          const already = await db.isUserInGroup(ctx.user.id!, inv.groupId);
          if (!already) {
            await db.addGroupMember({
              groupId: inv.groupId,
              userId: ctx.user.id!,
              role: "member",
            });
          }

          // Notificar quem convidou
          await db.createNotification({
            userId: inv.invitedBy,
            type: "invitation",
            title: "Convite aceito",
            message: `${ctx.user.name} aceitou seu convite`,
            relatedId: input.id,
            read: false,
          });
        }

        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        // Buscar convites do usuário (enviados e recebidos) e validar permissão
        const all = await db.getUserInvitations(ctx.user.id!);
        const inv = all.find(i => i.id === input.id);
        if (!inv) throw new TRPCError({ code: "NOT_FOUND" });
        const userEmail = ctx.user.email;
        const isOwner = inv.invitedBy === ctx.user.id!;
        const isRecipient = userEmail && inv.invitedEmail === userEmail;
        if (!isOwner && !isRecipient) throw new TRPCError({ code: "FORBIDDEN" });
        await db.deleteInvitation(input.id);
        return { success: true };
      }),
  }),

  // ============ NOTIFICATIONS ROUTER ============
  notifications: router({
    list: protectedProcedure
      .input(z.object({
        unreadOnly: z.boolean().default(false),
      }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getUserNotifications(ctx.user.id!, input?.unreadOnly);
      }),

    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.markNotificationAsRead(input.id as any);
        return { success: true };
      }),

    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsAsRead(ctx.user.id!);
      return { success: true };
    }),

    getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUnreadNotificationCount(ctx.user.id!);
    }),
  }),

  // ============ REPORTS ROUTER ============
  reports: router({
    summary: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        // grupos do usuário
        const groups = await db.getUserGroups(ctx.user.id!);
        const groupIds = groups.map(g => g.group.id);
        // despesas pessoais (com range opcional)
        const personal = await db.getUserPersonalExpenses(ctx.user.id!, input?.startDate, input?.endDate);
        // despesas compartilhadas agregadas
        let shared: any[] = [];
        for (const gid of groupIds) {
          const list = await db.getGroupSharedExpenses(gid);
          // aplicar filtro de data se informado
          const filtered = list.filter(item => {
            const d = new Date(item.expense.date);
            if (input?.startDate && d < input.startDate) return false;
            if (input?.endDate && d > input.endDate) return false;
            return true;
          });
          shared = shared.concat(filtered);
        }

        const personalTotal = personal.reduce((acc, e: any) => acc + (e.amount || 0), 0);
        const sharedTotal = shared.reduce((acc, e: any) => acc + (e.expense?.amount || 0), 0);
        const byCategory: Record<string, number> = {};
        personal.forEach((e: any) => { const cat = e.category || "Outros"; byCategory[cat] = (byCategory[cat] || 0) + (e.amount || 0); });
        shared.forEach(e => { const cat = e.expense?.category || "Outros"; byCategory[cat] = (byCategory[cat] || 0) + (e.expense?.amount || 0); });
        const categories = Object.entries(byCategory).sort((a,b) => b[1]-a[1]).map(([name,total]) => ({ name, total }));
        return { personalTotal, sharedTotal, grandTotal: personalTotal + sharedTotal, categories };
      }),
  }),
});

export type AppRouter = typeof appRouter;
