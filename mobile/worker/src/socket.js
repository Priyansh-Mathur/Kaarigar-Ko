import Constants from 'expo-constants';
import { io } from 'socket.io-client';
import { tokens } from './api';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  Constants.expoConfig?.extra?.apiUrl ??
  'http://localhost:3000/api/v1';
const WS_BASE = API_URL.replace(/\/api\/v1\/?$/, '');

/** Connect to the realtime gateway with the current access token. */
export function connectSocket() {
  return io(WS_BASE, {
    transports: ['websocket'],
    auth: { token: tokens.access },
    reconnectionAttempts: 5,
  });
}
