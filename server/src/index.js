
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { registerRoomHandlers } = require("./sockets/roomSocket");

const app = express();
app.use(cors());
app.use(express.json());
app.get("/", (_req, res) => res.json({ ok: true, name: "PromQuest Server" }));
app.get("/health", (_req, res) => res.json({ ok: true, status: "healthy" }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET","POST"] } });
const rooms = new Map();

io.on("connection", (socket) => {
  console.log("connected", socket.id);
  registerRoomHandlers(io, socket, rooms);
  socket.on("disconnect", () => {
    for (const [, room] of rooms.entries()) {
      const before = room.players.length;
      room.players = room.players.filter(p => p.socketId !== socket.id);
      if (before !== room.players.length) io.to(room.code).emit("room:update", sanitizeRoom(room, socket.id));
    }
  });
});

function sanitizeRoom(room, socketId) {
  return room;
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => console.log(`PromQuest server running on port ${PORT}`));
