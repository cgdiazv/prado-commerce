'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import { getSupportAutoReplyMessage, isWithinSupportBusinessHours } from '@/lib/supportHours';

const ACTIVE_SUPPORT_TICKET_STATUSES = ['open', 'in_progress', 'blocked'];
const VISIBLE_SUPPORT_TICKET_STATUSES = ['open', 'in_progress', 'blocked', 'resolved', 'closed'];

async function requireMerchantUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('You must be signed in.');
  }
  return user;
}

export async function getDashboardSupportThread() {
  try {
    const user = await requireMerchantUser();

    // Look for active or recently updated support chat ticket for this merchant
    const ticket = await prisma.helpdeskTicket.findFirst({
      where: {
        escalatedFrom: 'dashboard_chat',
        status: { in: VISIBLE_SUPPORT_TICKET_STATUSES },
        OR: [
          { requestedByUserId: user.id },
          { requestedByEmail: user.email },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        status: true,
        priority: true,
        updatedAt: true,
      },
    });

    if (!ticket) {
      return {
        currentUserId: user.id,
        ticketStatus: null,
        ticketPriority: null,
        messages: [],
      };
    }

    const ticketStatus = ticket.status.toLowerCase();

    // If agent closed ticket, clear client thread history so new message starts fresh
    if (ticketStatus === 'closed') {
      return {
        currentUserId: user.id,
        ticketStatus: 'closed',
        ticketPriority: ticket.priority,
        messages: [],
      };
    }

    const comments = await prisma.helpdeskTicketComment.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        authorUserId: true,
        authorEmail: true,
        comment: true,
        createdAt: true,
      },
    });

    // Mark as read by merchant
    await prisma.helpdeskTicket.update({
      where: { id: ticket.id },
      data: {
        unreadForUserCount: 0,
        updatedAt: new Date(),
      },
    });

    return {
      currentUserId: user.id,
      ticketStatus: ticket.status,
      ticketPriority: ticket.priority,
      messages: comments.map((item) => ({
        id: item.id,
        author_user_id: item.authorUserId,
        author_email: item.authorEmail,
        comment: item.comment,
        created_at: item.createdAt.toISOString(),
      })),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load support chat thread.';
    return { error: message };
  }
}

async function getOrCreateDashboardSupportTicket(user: { id: string; email: string; company?: string | null }) {
  const activeTicket = await prisma.helpdeskTicket.findFirst({
    where: {
      escalatedFrom: 'dashboard_chat',
      status: { in: ACTIVE_SUPPORT_TICKET_STATUSES },
      OR: [
        { requestedByUserId: user.id },
        { requestedByEmail: user.email },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });

  if (activeTicket?.id) {
    return activeTicket.id;
  }

  // Find user's store if available
  const store = await prisma.store.findFirst({
    where: {
      OR: [
        { ownerUserId: user.id },
        { ownerId: user.id },
      ],
    },
    select: { id: true, name: true },
  });

  const storeLabel = store?.name || user.company || 'Prado Commerce';

  const createdTicket = await prisma.helpdeskTicket.create({
    data: {
      organizationId: store?.id || user.id,
      requestedByUserId: user.id,
      requestedByEmail: user.email,
      subject: `Dashboard Support Chat (${storeLabel})`,
      description: `Conversation started from Prado Commerce dashboard support chat (${storeLabel}).`,
      priority: 'medium',
      status: 'open',
      escalatedFrom: 'dashboard_chat',
      waitingOn: 'none',
      unreadForAgentCount: 0,
      unreadForUserCount: 0,
      lastCommentAuthorEmail: user.email,
    },
  });

  await prisma.helpdeskTicketEvent.create({
    data: {
      ticketId: createdTicket.id,
      eventType: 'escalated',
      eventNote: `Conversation opened from Prado Commerce dashboard support chat (${storeLabel}).`,
      actorUserId: user.id,
      actorEmail: user.email,
      metadata: {
        source: 'dashboard_chat',
        store_id: store?.id || null,
        store_name: store?.name || null,
        company: user.company || null,
      },
    },
  });

  return createdTicket.id;
}

export async function sendDashboardSupportMessage({
  message,
  locale = 'en',
}: {
  message: string;
  locale?: string;
}) {
  const normalizedMessage = typeof message === 'string' ? message.trim().slice(0, 4000) : '';
  if (!normalizedMessage) {
    return { error: 'Message cannot be empty.' };
  }

  try {
    const user = await requireMerchantUser();
    const ticketId = await getOrCreateDashboardSupportTicket(user);
    const isOnline = isWithinSupportBusinessHours();

    // Insert comment
    await prisma.helpdeskTicketComment.create({
      data: {
        ticketId,
        authorUserId: user.id,
        authorEmail: user.email,
        comment: normalizedMessage,
      },
    });

    // Update ticket state
    const currentTicket = await prisma.helpdeskTicket.findUnique({
      where: { id: ticketId },
      select: { unreadForAgentCount: true },
    });

    const unreadForAgent = (currentTicket?.unreadForAgentCount ?? 0) + 1;

    await prisma.helpdeskTicket.update({
      where: { id: ticketId },
      data: {
        unreadForAgentCount: unreadForAgent,
        unreadForUserCount: 0,
        waitingOn: 'agent',
        lastCommentAt: new Date(),
        lastCommentAuthorEmail: user.email,
        updatedAt: new Date(),
      },
    });

    // Log comment event
    await prisma.helpdeskTicketEvent.create({
      data: {
        ticketId,
        eventType: 'comment',
        eventNote: normalizedMessage,
        actorUserId: user.id,
        actorEmail: user.email,
        metadata: { source: 'dashboard_chat', locale },
      },
    });

    if (!isOnline) {
      const autoReplyText = getSupportAutoReplyMessage(locale);
      await prisma.helpdeskTicketComment.create({
        data: {
          ticketId,
          authorUserId: null,
          authorEmail: 'support@pradojob.com',
          comment: autoReplyText,
        },
      });

      await prisma.helpdeskTicketEvent.create({
        data: {
          ticketId,
          eventType: 'comment',
          eventNote: autoReplyText,
          actorUserId: null,
          actorEmail: 'support@pradojob.com',
          metadata: { source: 'dashboard_chat_auto_reply', off_hours: true },
        },
      });
    }

    revalidatePath('/dashboard');
    return { success: true, offHoursAutoReplied: !isOnline };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to send message.';
    return { error: errorMsg };
  }
}
