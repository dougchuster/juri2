import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(10, Number(searchParams.get("pageSize") || 50)));

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400 });
    }

    const [messagesDesc, total] = await Promise.all([
      db.message.findMany({
        where: { conversationId },
        select: {
          id: true,
          direction: true,
          canal: true,
          content: true,
          contentHtml: true,
          templateVars: true,
          status: true,
          errorMessage: true,
          senderName: true,
          senderPhone: true,
          sentAt: true,
          deliveredAt: true,
          readAt: true,
          receivedAt: true,
          createdAt: true,
          attachments: {
            select: {
              id: true,
              fileName: true,
              mimeType: true,
              fileUrl: true,
              fileSize: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.message.count({ where: { conversationId } }),
    ]);

    const messages = [...messagesDesc]
      .reverse()
      .map((message) => ({
        ...message,
        sentAt: message.sentAt?.toISOString() || null,
        deliveredAt: message.deliveredAt?.toISOString() || null,
        readAt: message.readAt?.toISOString() || null,
        receivedAt: message.receivedAt?.toISOString() || null,
        createdAt: message.createdAt.toISOString(),
      }));
    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      messages,
      page,
      pageSize,
      total,
      totalPages,
      hasMore: page < totalPages,
    });
  } catch (error) {
    console.error("[API] Error fetching messages:", error);
    return NextResponse.json({ messages: [], page: 1, pageSize: 50, total: 0, totalPages: 0, hasMore: false }, { status: 500 });
  }
}
