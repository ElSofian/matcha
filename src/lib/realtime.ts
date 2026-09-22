import type { Server as SocketIOServer } from "socket.io";

export type RealtimeNotification = {
  type: "like" | "unlike" | "view" | "message" | "match";
  fromUsername?: string;
  preview?: string;
};

declare global {
  var __matchaIO: SocketIOServer | undefined;
}

export function emitNotification(userId: string, notification: RealtimeNotification) {
  global.__matchaIO?.to(`user:${userId}`).emit("notification:new", notification);
}
