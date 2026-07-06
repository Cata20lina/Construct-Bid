// src/socket.js
import { io } from 'socket.io-client';
import { SERVER_URL } from './api.js';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}
