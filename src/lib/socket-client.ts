"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | undefined;

export function getSocket() {
  socket ??= io({ autoConnect: false });
  return socket;
}
