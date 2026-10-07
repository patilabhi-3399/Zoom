import { Server } from "socket.io";

let connections = {}; // roomUrl -> [socketIds]
let messages = {}; // roomUrl -> [{sender, data, socketId}]
let timeOnline = {}; // socketId -> Date
let politePeers = {}; // socketId -> polite flag
let makingOffer = {}; // socketId -> boolean
let ignoreOffer = {}; // socketId -> boolean

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // ===== Updated join-call handler =====
    socket.on("join-call", (roomUrl) => {
      if (!connections[roomUrl]) connections[roomUrl] = [];
      connections[roomUrl].push(socket.id);
      timeOnline[socket.id] = new Date();

      // Notify existing users (exclude the new socket)
      connections[roomUrl].forEach((id) => {
        if (id !== socket.id) {
          io.to(id).emit("user-joined", socket.id, connections[roomUrl]);
        }
      });

      // Send existing users to the new user
      const existingUsers = connections[roomUrl].filter(id => id !== socket.id);
      io.to(socket.id).emit("existing-users", existingUsers);

      // Send existing chat messages to the new user
      if (messages[roomUrl]) {
        messages[roomUrl].forEach((msg) => {
          io.to(socket.id).emit(
            "chat-message",
            msg.data,
            msg.sender,
            msg.socketId
          );
        });
      }
    });

    // Signal handling
    socket.on("signal", (toId, message) => {
      io.to(toId).emit("signal", socket.id, message);
    });

    // Chat messages
    socket.on("chat-message", (data, sender) => {
      // Find room of sender
      const [room, found] = Object.entries(connections).reduce(
        ([r, f], [roomKey, socketArray]) => {
          if (!f && socketArray.includes(socket.id)) return [roomKey, true];
          return [r, f];
        },
        ["", false]
      );

      if (!found) return;

      if (!messages[room]) messages[room] = [];
      messages[room].push({ sender, data, socketId: socket.id });

      // Broadcast to everyone in the room
      connections[room].forEach((id) => {
        io.to(id).emit("chat-message", data, sender, socket.id);
      });
    });

    // Disconnect handling
    socket.on("disconnect", () => {
      // Clean up connections
      for (const [roomKey, socketArray] of Object.entries(connections)) {
        if (socketArray.includes(socket.id)) {
          // Notify remaining users
          socketArray.forEach((id) => {
            if (id !== socket.id) io.to(id).emit("user-left", socket.id);
          });

          connections[roomKey] = socketArray.filter((id) => id !== socket.id);

          if (connections[roomKey].length === 0) {
            delete connections[roomKey];
            delete messages[roomKey];
          }
        }
      }

      // Clean up timers and flags
      delete timeOnline[socket.id];
      delete politePeers[socket.id];
      delete makingOffer[socket.id];
      delete ignoreOffer[socket.id];
    });
  });

  return io;
};
