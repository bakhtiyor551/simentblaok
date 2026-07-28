import { Server } from 'socket.io';

let io: Server | null = null;

export function setSocketIO(server: Server) {
  io = server;
}

export function emitEvent(event: string, data: unknown) {
  io?.emit(event, data);
}

export function emitToRoom(room: string, event: string, data: unknown) {
  io?.to(room).emit(event, data);
}
