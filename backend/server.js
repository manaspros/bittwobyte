const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

// Your existing Express routes can go here
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Simple route to get all online users
app.get("/api/users/online", (req, res) => {
  const onlineUsers = Object.values(authenticatedUsers).map((user) => ({
    id: user.id,
    username: user.username,
  }));
  res.json(onlineUsers);
});

const server = http.createServer(app);

// Initialize Socket.io with CORS configuration
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Store active users and their rooms
const users = {};
const authenticatedUsers = {}; // Store authenticated users
const rooms = {
  general: { users: [] }, // Default public room
};

// Store message history
const messageHistory = {};

// Helper function to get private room name
const getPrivateRoomName = (user1, user2) => {
  return user1 < user2
    ? `private:${user1}_${user2}`
    : `private:${user2}_${user1}`;
};

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle authenticated user
  socket.on("authenticated", ({ userId, username }) => {
    // Store authenticated user
    authenticatedUsers[userId] = {
      id: userId,
      username,
      socketId: socket.id,
    };

    users[socket.id] = {
      id: userId,
      username,
      room: "none",
    };

    // Broadcast to all clients that a new user is online
    io.emit("userList", Object.values(authenticatedUsers));

    console.log(`User authenticated: ${username} (${userId})`);
  });

  // Handle user joining
  socket.on("join", ({ username, room }) => {
    // Store user information
    users[socket.id] = { id: socket.id, username, room };

    // Join the specified room
    socket.join(room);

    // Initialize the room if it doesn't exist
    if (!rooms[room]) {
      rooms[room] = { users: [] };
    }

    // Add user to the room's user list
    rooms[room].users.push({ id: socket.id, username });

    // Send message history if available
    if (messageHistory[room]) {
      socket.emit("messageHistory", messageHistory[room]);
    }

    // Send welcome message to the user who joined
    socket.emit("message", {
      user: "system",
      text: `Welcome to the ${room} room, ${username}!`,
      room,
      timestamp: new Date().toISOString(),
    });

    // Broadcast to others in the room that a new user has joined
    socket.to(room).emit("message", {
      user: "system",
      text: `${username} has joined the room`,
      room,
      timestamp: new Date().toISOString(),
    });

    // Update the list of users in the room for all clients in that room
    io.to(room).emit("roomUsers", {
      room,
      users: rooms[room].users,
    });
  });

  // Handle joining private chat
  socket.on("joinPrivateChat", ({ currentUserId, targetUserId }) => {
    const currentUser = authenticatedUsers[currentUserId];
    const targetUser = authenticatedUsers[targetUserId];

    if (!currentUser || !targetUser) {
      socket.emit("error", { message: "User not found" });
      return;
    }

    // Generate room name
    const roomName = getPrivateRoomName(currentUserId, targetUserId);

    // Add to room
    socket.join(roomName);

    // If target user is online, also make them join the room
    const targetSocket = io.sockets.sockets.get(targetUser.socketId);
    if (targetSocket) {
      targetSocket.join(roomName);
    }

    // Get message history for private room
    if (messageHistory[roomName]) {
      socket.emit("messageHistory", messageHistory[roomName]);
    } else {
      messageHistory[roomName] = [];
    }

    console.log(`Private room created: ${roomName}`);

    socket.emit("privateChatJoined", {
      room: roomName,
      withUser: {
        id: targetUser.id,
        username: targetUser.username,
      },
    });
  });

  // Handle sending messages
  socket.on("sendMessage", ({ text, room }) => {
    const user = users[socket.id];

    if (user) {
      const message = {
        user: user.username,
        userId: user.id,
        text,
        room,
        timestamp: new Date().toISOString(),
      };

      // Store in message history
      if (!messageHistory[room]) {
        messageHistory[room] = [];
      }
      messageHistory[room].push(message);

      // Limit history to 100 messages per room
      if (messageHistory[room].length > 100) {
        messageHistory[room] = messageHistory[room].slice(-100);
      }

      // Send the message to everyone in the room including the sender
      io.to(room).emit("message", message);
    }
  });

  // Handle private messages
  socket.on("sendPrivateMessage", ({ recipientId, text }) => {
    const sender = users[socket.id];
    const recipient = Object.values(authenticatedUsers).find(
      (user) => user.id === recipientId
    );

    if (sender && recipient) {
      // Generate room name
      const roomName = getPrivateRoomName(sender.id, recipient.id);

      const message = {
        user: sender.username,
        userId: sender.id,
        text,
        isPrivate: true,
        timestamp: new Date().toISOString(),
      };

      // Store in message history
      if (!messageHistory[roomName]) {
        messageHistory[roomName] = [];
      }
      messageHistory[roomName].push(message);

      // Limit history
      if (messageHistory[roomName].length > 100) {
        messageHistory[roomName] = messageHistory[roomName].slice(-100);
      }

      // Send to everyone in the private room
      io.to(roomName).emit("privateMessage", message);
    }
  });

  // Handle typing indicator
  socket.on("typing", ({ room, isTyping }) => {
    const user = users[socket.id];

    if (user) {
      // Broadcast to everyone in the room except the sender
      socket.to(room).emit("userTyping", {
        userId: user.id,
        username: user.username,
        isTyping,
      });
    }
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    const user = users[socket.id];

    if (user) {
      // Remove from authenticated users
      const authUserId = Object.keys(authenticatedUsers).find(
        (id) => authenticatedUsers[id].socketId === socket.id
      );

      if (authUserId) {
        delete authenticatedUsers[authUserId];
        // Broadcast updated user list
        io.emit("userList", Object.values(authenticatedUsers));
      }

      // Remove user from the room's users list
      if (rooms[user.room]) {
        rooms[user.room].users = rooms[user.room].users.filter(
          (u) => u.id !== socket.id
        );

        // Notify others that user has left
        io.to(user.room).emit("message", {
          user: "system",
          text: `${user.username} has left the room`,
          room: user.room,
          timestamp: new Date().toISOString(),
        });

        // Update the user list for all clients in the room
        io.to(user.room).emit("roomUsers", {
          room: user.room,
          users: rooms[user.room].users,
        });
      }

      // Delete user from users object
      delete users[socket.id];
    }

    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
