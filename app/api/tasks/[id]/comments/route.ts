import { NextRequest, NextResponse } from 'next/server';
import {
  connectDB,
  CommentModel,
  TaskModel,
  UserModel,
  NotificationModel,
  getNextId,
} from '@/db/mongodb';

type Params = { params: { id: string } };

const TEAM_PATH: Record<string, string> = {
  Specification: 'spec',
  Design: 'design',
  Development: 'dev',
};

export async function GET(_req: NextRequest, { params }: Params) {
  await connectDB();

  const allComments = await CommentModel.find({ task_id: params.id }).sort({ created_at: 1 });

  const topLevel = allComments.filter((c) => !c.parent_comment_id);
  const replies = allComments.filter((c) => !!c.parent_comment_id);

  const commentTree = topLevel.map((c) => ({
    id: c.id,
    task_id: c.task_id,
    parent_comment_id: c.parent_comment_id ?? null,
    author_id: c.author_id ?? null,
    author_name: c.author_name ?? null,
    body: c.body,
    created_at: c.created_at,
    replies: replies
      .filter((r) => r.parent_comment_id === c.id)
      .map((r) => ({
        id: r.id,
        task_id: r.task_id,
        parent_comment_id: r.parent_comment_id ?? null,
        author_id: r.author_id ?? null,
        author_name: r.author_name ?? null,
        body: r.body,
        created_at: r.created_at,
        replies: [],
      })),
  }));

  return NextResponse.json(commentTree);
}

export async function POST(req: NextRequest, { params }: Params) {
  await connectDB();

  const body = await req.json();

  if (!body.body?.trim()) {
    return NextResponse.json({ error: 'Comment body required' }, { status: 400 });
  }

  const id = await getNextId('comments');
  const comment = await CommentModel.create({
    id,
    task_id: params.id,
    parent_comment_id: body.parent_comment_id || null,
    author_id: body.author_id || null,
    author_name: body.author_name || 'משתמש',
    body: body.body.trim(),
  });

  // Create notifications for @mentions
  const mentions = (body.body.match(/@(\S+)/g) ?? []).map((m: string) => m.slice(1));

  if (mentions.length > 0) {
    const task = await TaskModel.findById(params.id);
    if (task) {
      const teamPath = TEAM_PATH[task.responsible_team ?? ''] ?? 'master';
      const link = `/${teamPath}?open=${params.id}`;
      const authorId = body.author_id || null;

      for (const mention of mentions) {
        const mentioned = await UserModel.findOne({ name: mention });
        if (mentioned && mentioned.id !== authorId) {
          const notifId = await getNextId('notifications');
          await NotificationModel.create({
            id: notifId,
            user_id: mentioned.id,
            type: 'mention',
            message: `${body.author_name || 'מישהו'} תייג אותך בתגובה על משימה #${params.id}`,
            link,
          });
        }
      }
    }
  }

  return NextResponse.json(
    {
      id: comment.id,
      task_id: comment.task_id,
      parent_comment_id: comment.parent_comment_id ?? null,
      author_id: comment.author_id ?? null,
      author_name: comment.author_name ?? null,
      body: comment.body,
      created_at: comment.created_at,
    },
    { status: 201 },
  );
}
