import "dotenv/config";
import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { verifyAccessToken } from "./src/lib/auth";
import { query, withTransaction } from "./src/lib/db";
import { emitNotification } from "./src/lib/realtime";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = Number(process.env.PORT) || 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const connectedSockets = new Map<string, number>();

type MessagePayload = { recipientUsername?: unknown; content?: unknown };
type StoredMessage = { id: string; sender_username: string; content: string; created_at: string };
type MessageResult = { ok: true; recipientId: string; message: StoredMessage } | { ok: false; error: string };

function getCookie(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.split(";").map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

async function saveMessage(senderId: string, payload: MessagePayload): Promise<MessageResult> {
  const recipientUsername = typeof payload.recipientUsername === "string" ? payload.recipientUsername : "";
  const content = typeof payload.content === "string" ? payload.content.trim() : "";
  if (!/^[A-Za-z0-9_-]{3,50}$/.test(recipientUsername) || content.length < 1 || content.length > 1000) {
    return { ok: false, error: "Invalid message." };
  }

  return withTransaction(async (client) => {
    const { rows: recipients } = await client.query<{ id: string }>(
      "SELECT id FROM users WHERE username = $1 AND is_verified = TRUE",
      [recipientUsername],
    );
    const recipient = recipients[0];
    if (!recipient || recipient.id === senderId) return { ok: false, error: "Recipient not found." } as const;

    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext(LEAST($1::text, $2::text) || ':' || GREATEST($1::text, $2::text)))",
      [senderId, recipient.id],
    );
    const { rows: permittedRows } = await client.query<{ permitted: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM likes WHERE liker_id = $1 AND liked_id = $2)
              AND EXISTS (SELECT 1 FROM likes WHERE liker_id = $2 AND liked_id = $1)
              AND NOT EXISTS (
                SELECT 1 FROM blocks
                WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)
              ) AS permitted`,
      [senderId, recipient.id],
    );
    if (!permittedRows[0].permitted) {
      return { ok: false, error: "Messaging is only available to connected profiles." } as const;
    }

    const { rows: messages } = await client.query<{ id: string; content: string; created_at: Date; sender_username: string }>(
      `WITH inserted AS (
         INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3)
         RETURNING id, content, created_at
       )
       SELECT inserted.id, inserted.content, inserted.created_at, u.username AS sender_username
       FROM inserted JOIN users u ON u.id = $1`,
      [senderId, recipient.id, content],
    );
    await client.query(
      "INSERT INTO notifications (user_id, from_user_id, type) VALUES ($1, $2, 'message')",
      [recipient.id, senderId],
    );
    const message = messages[0];
    return {
      ok: true,
      recipientId: recipient.id,
      message: { ...message, created_at: message.created_at.toISOString() },
    } as const;
  });
}

app.prepare().then(async () => {
  await query("UPDATE users SET is_online = FALSE, last_seen = COALESCE(last_seen, NOW()) WHERE is_online = TRUE");
  const httpServer = createServer((req, res) => handle(req, res, parse(req.url ?? "/", true)));
  const io = new SocketIOServer(httpServer, {
    cors: { origin: process.env.NEXT_PUBLIC_APP_URL, credentials: true },
  });
  global.__matchaIO = io;

  io.use((socket, nextMiddleware) => {
    const token = getCookie(socket.handshake.headers.cookie, "matcha_session");
    const payload = token ? verifyAccessToken(token) : null;
    if (!payload) return nextMiddleware(new Error("unauthorized"));
    socket.data.userId = payload.sub;
    nextMiddleware();
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    const priorConnections = connectedSockets.get(userId) ?? 0;
    connectedSockets.set(userId, priorConnections + 1);
    socket.join(`user:${userId}`);
    if (priorConnections === 0) void query("UPDATE users SET is_online = TRUE WHERE id = $1", [userId]);

    socket.on("message:send", async (payload: MessagePayload, acknowledge: (result: MessageResult) => void = () => undefined) => {
      try {
        const result = await saveMessage(userId, payload);
        acknowledge(result);
        if (result.ok) {
          io.to(`user:${result.recipientId}`).emit("message:new", result.message);
          emitNotification(result.recipientId, {
            type: "message",
            fromUsername: result.message.sender_username,
            preview: result.message.content,
          });
        }
      } catch {
        acknowledge({ ok: false, error: "Unable to send the message." });
      }
    });

    socket.on("disconnect", () => {
      const remaining = (connectedSockets.get(userId) ?? 1) - 1;
      if (remaining > 0) {
        connectedSockets.set(userId, remaining);
      } else {
        connectedSockets.delete(userId);
        void query("UPDATE users SET is_online = FALSE, last_seen = NOW() WHERE id = $1", [userId]);
      }
    });
  });

  httpServer.listen(port, () => console.log(`> CY//MATCH ready on http://${hostname}:${port}`));
  let shuttingDown = false;
  function shutdown(signal: string) {
    if (shuttingDown) process.exit(0);
    shuttingDown = true;
    console.log(`\n> Received ${signal}, shutting down...`);
    io.close();
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  }
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
});
