import "dotenv/config";
import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { verifyAccessToken } from "./src/lib/auth";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = Number(process.env.PORT) || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

function getCookie(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) return undefined;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "/", true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = getCookie(socket.handshake.headers.cookie, "matcha_session");
    const payload = token ? verifyAccessToken(token) : null;
    if (!payload) {
      next(new Error("unauthorized"));
      return;
    }
    socket.data.userId = payload.sub;
    next();
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);

    socket.on("disconnect", () => {
      socket.leave(`user:${userId}`);
    });
  });

  global.__matchaIO = io;

  httpServer.listen(port, () => {
    console.log(`> CY//MATCH ready on http://${hostname}:${port}`);
  });

  let shuttingDown = false;
  function shutdown(signal: string) {
    if (shuttingDown) {
      // second signal: something's stuck, bail out immediately
      process.exit(0);
    }
    shuttingDown = true;
    console.log(`\n> Received ${signal}, shutting down...`);
    io.close();
    httpServer.close(() => process.exit(0));
    // Safety net in case something keeps the event loop alive.
    setTimeout(() => process.exit(0), 3000).unref();
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
});

declare global {
  var __matchaIO: SocketIOServer | undefined;
}
