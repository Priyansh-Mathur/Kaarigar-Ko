import { io } from 'socket.io-client';
import { getApiBaseUrl, session } from './api';

const WS_BASE = getApiBaseUrl().replace(/\/api\/v1\/?$/, '');

/** Connect to the realtime gateway with the current access token in the handshake. */
export function connectSocket() {
  return io(WS_BASE, {
    transports: ['websocket'],
    auth: { token: session.access() },
    reconnectionAttempts: 5,
  });
}
