import { io } from "socket.io-client";
const host = window.location.hostname;
const URL = import.meta.env.VITE_SOCKET_URL || `http://${host}:3001`;
export const socket = io(URL, { autoConnect: false });
