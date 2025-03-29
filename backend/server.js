const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Import models
const Message = require("./models/Message");
const User = require("./models/User");

// Import mock data generator for fallback
const { generateMockUsers, generateMockMessages } = require("./mockData");

// Store in-memory fallback data if MongoDB is not available
let inMemoryUsers = [];
let inMemoryMessages = {};

// Initialize in-memory fallback data
inMemoryUsers = generateMockUsers(10);

// Pre-populate some rooms with messages
const defaultRooms = ["general", "technology", "random"];
defaultRooms.forEach((room) => {
  inMemoryMessages[room] = generateMockMessages(room, 15);
});

// Connect to MongoDB with better error handling
const connectToMongoDB = async (retries = 5) => {
  try {
    console.log("Attempting to connect to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s
    });
    console.log("Successfully connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);

    if (retries > 0) {
      console.log(`Retrying connection... ${retries} attempts left`);
      // Wait for 2 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return connectToMongoDB(retries - 1);
    }

    console.error("Failed to connect to MongoDB after multiple attempts");
    console.log("Using in-memory fallback mode");
  }
};

// Start MongoDB connection
connectToMongoDB();

const app = express();

// CORS middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// MongoDB fallback middleware
const withMongoDBFallback = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    console.warn("MongoDB not connected, using in-memory fallback");
    req.useInMemoryFallback = true;
  }
  next();
};

// Apply the middleware
app.use(withMongoDBFallback);

// API Routes
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "fallback",
    version: "1.0",
    timestamp: new Date().toISOString(),
  });
});

// Handle OPTIONS requests for CORS preflight
app.options("*", cors());

// Add a catch-all route to help debug missing endpoints
app.use((req, res, next) => {
  const knownRoutes = [
    "/api/health",
    "/api/users",
    "/api/users/online",
    "/api/messages",
  ];

  // For unknown routes, return helpful debugging info
  console.log(`Request for unknown route: ${req.method} ${req.url}`);

  if (req.method === "OPTIONS") {
    // Handle preflight requests
    return res.status(200).end();
  }

  // For API routes, return a structured error
  if (req.url.startsWith("/api/")) {
    return res.status(404).json({
      error: "API endpoint not found",
      requestedUrl: req.url,
      method: req.method,
      knownRoutes: knownRoutes,
      suggestion: "Check the URL path and method",
    });
  }

  next();
});

// Get all online users
app.get("/api/users/online", async (req, res) => {
  try {
    let onlineUsers;

    if (req.useInMemoryFallback) {
      onlineUsers = inMemoryUsers.filter((user) => user.isOnline);
      console.log(
        `Using in-memory fallback: ${onlineUsers.length} online users`
      );
    } else {
      onlineUsers = await User.find({ isOnline: true }).select(
        "_id username isOnline lastSeen"
      );

      // Format for API response
      onlineUsers = onlineUsers.map((user) => ({
        id: user._id,
        username: user.username,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen ? user.lastSeen.toISOString() : null,
      }));
      console.log(`Found ${onlineUsers.length} online users in database`);
    }

    res.json(onlineUsers);
  } catch (error) {
    console.error("Error fetching online users:", error);

    // Return in-memory data as fallback on error
    const fallbackUsers = inMemoryUsers.filter((user) => user.isOnline);
    console.log(
      `Fallback: returning ${fallbackUsers.length} in-memory online users`
    );
    res.json(fallbackUsers);
  }
});

// Get all users
app.get("/api/users", async (req, res) => {
  try {
    let users;

    if (req.useInMemoryFallback) {
      users = inMemoryUsers;
      console.log(`Using in-memory fallback: ${users.length} users`);
    } else {
      const dbUsers = await User.find().select(
        "_id username isOnline lastSeen"
      );

      // Format for API response
      users = dbUsers.map((user) => ({
        id: user._id,
        username: user.username,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen ? user.lastSeen.toISOString() : null,
      }));
      console.log(`Found ${users.length} users in database`);
    }

    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);

    // Return in-memory data as fallback on error
    console.log(`Fallback: returning ${inMemoryUsers.length} in-memory users`);
    res.json(inMemoryUsers);
  }
});

// Get message history for a room
app.get("/api/messages/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    console.log(`Fetching messages for room: ${roomId}`);

    let messages;

    if (req.useInMemoryFallback) {
      messages = inMemoryMessages[roomId] || [];
      console.log(
        `Using in-memory fallback: ${messages.length} messages for room ${roomId}`
      );
    } else {
      const dbMessages = await Message.find({ room: roomId })
        .sort({ timestamp: 1 })
        .limit(100);

      console.log(
        `Found ${dbMessages.length} messages for room ${roomId} in database`
      );

      // Format for API response - ensure all required fields are present
      messages = dbMessages.map((msg) => {
        const msgObj = msg.toObject();
        msgObj.id = msgObj._id.toString();
        msgObj.timestamp = msgObj.timestamp.toISOString();

        // Make sure user field is populated
        if (!msgObj.user && msgObj.sender) {
          // Try to find the username from our user records
          const senderInfo = Object.values(users).find(
            (u) => u.id === msgObj.sender
          );
          msgObj.user = senderInfo ? senderInfo.username : "Unknown User";
        }

        // Make sure userId is set
        if (!msgObj.userId) {
          msgObj.userId = msgObj.sender;
        }

        return msgObj;
      });
    }

    res.json(messages);
  } catch (error) {
    console.error("Error fetching message history:", error);

    // Return in-memory messages as fallback
    const fallbackMessages = inMemoryMessages[req.params.roomId] || [];
    console.log(
      `Fallback: returning ${fallbackMessages.length} in-memory messages for room ${req.params.roomId}`
    );
    res.json(fallbackMessages);
  }
});

// Debug endpoint to check saved messages
app.get("/api/debug/messages/:roomId", async (req, res) => {
  try {
    const { roomId } = req.params;
    console.log(`Debug: Fetching raw messages for room: ${roomId}`);

    if (mongoose.connection.readyState === 1) {
      const dbMessages = await Message.find({ room: roomId })
        .sort({ timestamp: 1 })
        .limit(100);

      res.json({
        count: dbMessages.length,
        mongoStatus: "connected",
        messages: dbMessages,
      });
    } else {
      res.json({
        count: inMemoryMessages[roomId]?.length || 0,
        mongoStatus: "disconnected",
        messages: inMemoryMessages[roomId] || [],
      });
    }
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add new endpoint to get user by ID with clearer error handling - Fix URL-encoded IDs
app.get("/api/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`Looking up user by ID: ${userId}`);

    // Decode the URL-encoded userId if needed
    const decodedUserId = decodeURIComponent(userId);
    console.log(`Decoded user ID: ${decodedUserId}`);

    let user;

    if (req.useInMemoryFallback) {
      // Try both encoded and decoded IDs for in-memory users
      user = inMemoryUsers.find(
        (u) =>
          u.id === userId ||
          u.id === decodedUserId ||
          u.rawAuthId === userId ||
          u.rawAuthId === decodedUserId
      );
      console.log(
        user
          ? `Found user in memory: ${user.username}`
          : `User not found in memory: ${userId} / ${decodedUserId}`
      );
    } else {
      // First try the direct ID lookup
      user = await User.findById(userId);

      // If not found, try with the decoded ID
      if (!user && userId !== decodedUserId) {
        user = await User.findById(decodedUserId);
      }

      // If still not found, try by rawAuthId or auth0Id
      if (!user) {
        user = await User.findOne({
          $or: [
            { rawAuthId: userId },
            { rawAuthId: decodedUserId },
            { auth0Id: userId },
            { auth0Id: decodedUserId },
          ],
        });
      }

      console.log(
        user
          ? `Found user in DB: ${user.username}`
          : `User not found in DB: ${userId} / ${decodedUserId}`
      );

      if (user) {
        // Format for API response
        user = {
          id: user._id,
          username: user.username,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen ? user.lastSeen.toISOString() : null,
          authProvider: user.authProvider,
          email: user.email,
          picture: user.picture,
        };
      }
    }

    if (!user) {
      return res.status(404).json({
        error: "User not found",
        code: "USER_NOT_FOUND",
        message: "The requested user does not exist. Please log in again.",
      });
    }

    res.json(user);
  } catch (error) {
    console.error("Error looking up user:", error);
    res.status(500).json({ error: "Error looking up user" });
  }
});

// Create/update user
app.post("/api/users", async (req, res) => {
  try {
    console.log("User creation/update request received:", req.body);
    const { userId, username, authProvider, auth0Id, email, picture } =
      req.body;

    if (!userId || !username) {
      console.log("Missing required fields:", { userId, username });
      return res.status(400).json({
        error: "userId and username are required",
        receivedData: { userId, username },
      });
    }

    // Decode URL-encoded values if needed
    const decodedUserId = decodeURIComponent(userId);
    const decodedAuth0Id = auth0Id ? decodeURIComponent(auth0Id) : null;

    console.log("Processing user data:", {
      userId,
      decodedUserId,
      username,
      authProvider,
      auth0Id,
      decodedAuth0Id,
    });

    let user;

    if (mongoose.connection.readyState === 1) {
      console.log("MongoDB connected, saving user to database");
      // Try to find existing user with multiple search criteria
      try {
        // First look for exact match on _id
        user = await User.findById(decodedUserId);

        if (!user && decodedUserId !== userId) {
          // Try with raw userId if different from decoded
          user = await User.findById(userId);
        }

        if (!user && decodedAuth0Id) {
          // Try to find by auth0Id or rawAuthId
          user = await User.findOne({
            $or: [
              { auth0Id: auth0Id },
              { auth0Id: decodedAuth0Id },
              { rawAuthId: auth0Id },
              { rawAuthId: decodedAuth0Id },
            ],
          });

          if (user) {
            console.log(`Found user by auth0Id: ${user._id}`);
          }
        }

        if (user) {
          console.log(`Updating existing user: ${user._id} (${username})`);
          // Update existing user
          user.username = username;
          user.isOnline = true;
          user.lastSeen = new Date();

          // Update auth provider info if available
          if (authProvider) user.authProvider = authProvider;
          if (auth0Id) {
            user.auth0Id = auth0Id;
            user.rawAuthId = decodedAuth0Id;
          }
          if (email) user.email = email;
          if (picture) user.picture = picture;

          await user.save();
          console.log(`Updated user: ${username} (${user._id})`);
        } else {
          console.log(`Creating new user: ${decodedUserId} (${username})`);
          // Create new user
          user = new User({
            _id: decodedUserId,
            username,
            isOnline: true,
            lastSeen: new Date(),
            authProvider,
            auth0Id,
            rawAuthId: decodedAuth0Id,
            email,
            picture,
          });

          await user.save();
          console.log(`Created new user: ${username} (${user._id})`);
        }
      } catch (dbError) {
        console.error("Database error during user lookup/save:", dbError);

        // Try creating the user as a last resort if there was a lookup error
        if (!user) {
          try {
            console.log(
              `Attempting to create user as fallback: ${decodedUserId}`
            );
            user = new User({
              _id: decodedUserId,
              username,
              isOnline: true,
              lastSeen: new Date(),
              authProvider,
              auth0Id,
              rawAuthId: decodedAuth0Id,
              email,
              picture,
            });

            await user.save();
            console.log(
              `Created user after error recovery: ${username} (${user._id})`
            );
          } catch (fallbackError) {
            console.error(
              "Failed to create user even in fallback mode:",
              fallbackError
            );
            throw fallbackError; // Re-throw to be caught by outer catch
          }
        }
      }

      // Format the response
      const responseUser = {
        id: user._id,
        username: user.username,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen ? user.lastSeen.toISOString() : null,
        authProvider: user.authProvider,
        email: user.email,
        picture: user.picture,
      };

      console.log("Sending successful response:", responseUser);
      res.status(201).json(responseUser);
    } else {
      // In-memory fallback
      console.log("MongoDB not connected, using in-memory fallback");
      const existingUserIndex = inMemoryUsers.findIndex(
        (u) => u.id === userId || u.id === decodedUserId
      );

      if (existingUserIndex >= 0) {
        // Update existing user
        inMemoryUsers[existingUserIndex] = {
          ...inMemoryUsers[existingUserIndex],
          username,
          isOnline: true,
          lastSeen: new Date().toISOString(),
          authProvider,
          auth0Id,
          email,
          picture,
        };
        console.log(`Updated in-memory user: ${username}`);
      } else {
        // Create new user
        const newUser = {
          id: decodedUserId,
          username,
          isOnline: true,
          lastSeen: new Date().toISOString(),
          authProvider,
          auth0Id,
          email,
          picture,
        };
        inMemoryUsers.push(newUser);
        console.log(`Created new in-memory user: ${username}`);
      }

      // Find the user we just created/updated
      const user = inMemoryUsers.find(
        (u) => u.id === decodedUserId || u.id === userId
      );
      console.log("Sending in-memory user response:", user);
      res.status(201).json(user);
    }
  } catch (error) {
    console.error("Error creating/updating user:", error.message);
    console.error(error.stack);
    res.status(500).json({
      error: "Failed to create/update user",
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
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

// Store active voice channels and their participants
const voiceChannels = {
  "voice-general": { participants: [] },
  "voice-gaming": { participants: [] },
  "voice-music": { participants: [] },
};

// Helper function to get private room name
const getPrivateRoomName = (user1, user2) => {
  return user1 < user2
    ? `private:${user1}_${user2}`
    : `private:${user2}_${user1}`;
};

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle authenticated user - updated to properly handle Auth0 users with URL encoding
  socket.on(
    "authenticated",
    async ({ userId, username, authProvider, auth0Id, email }) => {
      try {
        // Verify this is a valid auth request
        if (!userId || !username) {
          console.log(
            "Invalid authentication request - missing user ID or username"
          );
          socket.emit("error", { message: "Invalid authentication data" });
          return;
        }

        // Handle URL encoding in user IDs
        const decodedUserId = decodeURIComponent(userId);
        const decodedAuth0Id = auth0Id ? decodeURIComponent(auth0Id) : null;

        console.log(`Authentication request for: ${username}`);
        console.log(`User ID: ${userId} (decoded: ${decodedUserId})`);
        console.log(
          `Auth0 ID: ${auth0Id || "none"} (decoded: ${
            decodedAuth0Id || "none"
          })`
        );
        console.log(`Provider: ${authProvider || "unknown"}`);

        // Check for Auth0 authentication
        const isAuth0User = authProvider === "auth0" && auth0Id;

        if (mongoose.connection.readyState === 1) {
          // First try to find by auth0Id for Auth0 users (try both encoded and decoded)
          let user = null;

          if (isAuth0User) {
            try {
              user = await User.findOne({
                $or: [
                  { auth0Id: auth0Id },
                  { auth0Id: decodedAuth0Id },
                  { rawAuthId: auth0Id },
                  { rawAuthId: decodedAuth0Id },
                  { _id: userId },
                  { _id: decodedUserId },
                ],
              });

              if (user) {
                console.log(`Found existing user by auth IDs: ${user._id}`);
              }
            } catch (err) {
              console.log("Error searching by auth0Id:", err.message);
            }
          }

          // If not found, try by _id (try both encoded and decoded)
          if (!user) {
            try {
              user = await User.findOne({
                $or: [{ _id: userId }, { _id: decodedUserId }],
              });

              if (user) {
                console.log(`Found existing user by _id: ${user._id}`);

                // Update auth0Id if missing but we have it now
                if (isAuth0User && !user.auth0Id) {
                  user.auth0Id = auth0Id;
                  user.rawAuthId = decodedAuth0Id || auth0Id;
                  user.authProvider = "auth0";
                  if (email) user.email = email; // Store email if available
                  console.log(
                    `Updated missing auth0Id for existing user: ${user._id}`
                  );
                }
              }
            } catch (err) {
              console.log(`User not found by ID: ${userId} / ${decodedUserId}`);
            }
          }

          if (user) {
            // Update existing user
            console.log(`Updating existing user: ${username} (${user._id})`);
            user.isOnline = true;
            user.lastSeen = new Date();
            // Only update username if it's changed
            if (user.username !== username) {
              user.username = username;
            }
            await user.save();
          } else if (isAuth0User) {
            // Create new Auth0 user - use decoded ID as _id
            const userData = {
              _id: decodedUserId || userId,
              username,
              isOnline: true,
              lastSeen: new Date(),
              authProvider: "auth0",
              auth0Id: auth0Id,
              rawAuthId: decodedAuth0Id || auth0Id,
            };

            // Add email if available
            if (email) userData.email = email;

            user = new User(userData);
            await user.save();
            console.log(`Created new Auth0 user: ${username} (${user._id})`);
          } else {
            console.log(`Skipping creation of non-Auth0 user: ${username}`);
            // For temporary non-auth0 users, still store in memory
            users[socket.id] = {
              id: userId,
              username,
              room: "none",
            };
            return;
          }
        }

        // Update in-memory user if MongoDB not available
        const existingUserIndex = inMemoryUsers.findIndex(
          (u) => u.id === userId
        );
        if (existingUserIndex >= 0) {
          inMemoryUsers[existingUserIndex].isOnline = true;
          inMemoryUsers[existingUserIndex].lastSeen = new Date().toISOString();
        } else {
          inMemoryUsers.push({
            id: userId,
            username,
            isOnline: true,
            lastSeen: new Date().toISOString(),
          });
        }

        // Store in authenticatedUsers map using actual user ID (critical for lookup)
        authenticatedUsers[userId] = {
          id: userId,
          username,
          socketId: socket.id,
          authProvider: isAuth0User ? "auth0" : undefined,
        };

        console.log(`Stored user in authenticatedUsers with ID: ${userId}`);
        console.log(
          `Available authenticated users: ${Object.keys(
            authenticatedUsers
          ).join(", ")}`
        );

        // Also store in socket-indexed map for other lookups
        users[socket.id] = {
          id: userId, // Use actual userId, not socket.id
          username,
          room: "none",
        };

        // Broadcast updated user list to all clients
        let onlineUsers;
        if (mongoose.connection.readyState === 1) {
          onlineUsers = await User.find({ isOnline: true }).select(
            "_id username isOnline lastSeen"
          );
          onlineUsers = onlineUsers.map((user) => ({
            id: user._id,
            username: user.username,
            isOnline: user.isOnline,
            lastSeen: user.lastSeen ? user.lastSeen.toISOString() : null,
          }));
        } else {
          onlineUsers = inMemoryUsers.filter((u) => u.isOnline);
        }

        io.emit("userList", onlineUsers);

        console.log(`User authenticated: ${username} (${userId})`);
      } catch (error) {
        console.error("Error handling user authentication:", error);
        console.error("Error details:", error.message);
        socket.emit("error", {
          message: "Authentication failed",
          error: error.message,
        });
      }
    }
  );

  // Handle user joining
  socket.on("join", async ({ username, room }) => {
    console.log(`User ${username} joining room: ${room}`);

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

    try {
      // Get message history
      let messageHistory;

      if (mongoose.connection.readyState === 1) {
        console.log(`Fetching message history from MongoDB for room: ${room}`);
        messageHistory = await Message.find({ room })
          .sort({ timestamp: 1 })
          .limit(100);

        // Format messages for client
        messageHistory = messageHistory.map((msg) => {
          const msgObj = msg.toObject();
          msgObj.id = msgObj._id.toString();
          msgObj.timestamp = msgObj.timestamp.toISOString();

          // Ensure user field is set for message display
          if (!msgObj.user) {
            // Try to find username based on the sender ID
            const senderUser = Object.values(users).find(
              (u) => u.id === msgObj.sender
            );
            if (senderUser) {
              msgObj.user = senderUser.username;
            } else {
              msgObj.user = username; // Default to current user as fallback
            }
          }

          return msgObj;
        });

        console.log(
          `Found ${messageHistory.length} messages in MongoDB for room ${room}`
        );
      } else {
        messageHistory = inMemoryMessages[room] || [];
        console.log(
          `Using ${messageHistory.length} in-memory messages for room ${room}`
        );
      }

      // Send message history to the user
      socket.emit("messageHistory", messageHistory);

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
    } catch (error) {
      console.error("Error handling user joining room:", error);
    }
  });

  // Handle joining private chat
  socket.on("joinPrivateChat", async ({ currentUserId, targetUserId }) => {
    console.log(
      `Join private chat request: ${currentUserId} -> ${targetUserId}`
    );

    // Improved user lookup - first try direct lookup in authenticatedUsers
    let currentUser = authenticatedUsers[currentUserId];

    // If that fails, check if they sent the socket ID instead
    if (!currentUser && currentUserId === socket.id) {
      // Find by socket ID
      const userId = Object.keys(authenticatedUsers).find(
        (id) => authenticatedUsers[id].socketId === socket.id
      );

      if (userId) {
        currentUser = authenticatedUsers[userId];
        currentUserId = userId; // Update for use in room name
        console.log(`Found user by socket ID lookup: ${currentUserId}`);
      }
    }

    // As a last resort, try the socket-based users list
    if (!currentUser) {
      const socketUser = users[socket.id];
      if (socketUser) {
        // If we find a socket user but not in authenticated users, they're probably
        // not properly authenticated - try to fix by looking up their user record
        try {
          if (mongoose.connection.readyState === 1) {
            const dbUser = await User.findById(socketUser.id);
            if (dbUser) {
              // Found in DB but not in authenticatedUsers - restore their auth state
              authenticatedUsers[socketUser.id] = {
                id: socketUser.id,
                username: socketUser.username,
                socketId: socket.id,
              };
              currentUser = authenticatedUsers[socketUser.id];
              currentUserId = socketUser.id;
              console.log(
                `Restored missing authenticated user: ${currentUserId}`
              );
            }
          }
        } catch (err) {
          console.log("Could not restore user authentication");
        }

        // If we still don't have a current user, create a temporary one
        if (!currentUser) {
          currentUser = {
            id: socketUser.id,
            username: socketUser.username,
            socketId: socket.id,
          };
          currentUserId = socketUser.id;
          console.log(`Using temporary user from socket: ${socketUser.id}`);
        }
      }
    }

    // Debug output
    console.log(
      `Authentication state check - authenticated users: ${Object.keys(
        authenticatedUsers
      ).join(", ")}`
    );
    console.log(
      `Socket users: ${Object.keys(users)
        .map((id) => `${id} (${users[id].username})`)
        .join(", ")}`
    );

    if (!currentUser) {
      console.log(
        "Current user not found in any user collection - authentication may have failed"
      );
      socket.emit("error", {
        message: "User authentication issue. Please try logging in again.",
        code: "AUTH_ERROR",
      });
      return;
    }

    // Find the target user
    const targetUser = authenticatedUsers[targetUserId];

    try {
      // Get target user information
      let dbTargetUser;
      if (mongoose.connection.readyState === 1) {
        dbTargetUser = await User.findById(targetUserId);
        if (!dbTargetUser) {
          console.log(`Target user not found in DB: ${targetUserId}`);
          socket.emit("error", { message: "Target user not found" });
          return;
        }
      } else {
        dbTargetUser = inMemoryUsers.find((u) => u.id === targetUserId);
        if (!dbTargetUser) {
          console.log(`Target user not found in memory: ${targetUserId}`);
          socket.emit("error", { message: "Target user not found" });
          return;
        }
      }

      // Generate room name
      const roomName = getPrivateRoomName(currentUserId, targetUserId);
      console.log(`Created private room: ${roomName}`);

      // Add current user to room
      socket.join(roomName);
      console.log(`Added ${currentUser.username} to room ${roomName}`);

      // If target user is online, also make them join the room
      if (targetUser) {
        const targetSocket = io.sockets.sockets.get(targetUser.socketId);
        if (targetSocket) {
          targetSocket.join(roomName);
          console.log(`Added ${targetUser.username} to room ${roomName}`);
        } else {
          console.log(`Target user socket not found: ${targetUser.socketId}`);
        }
      } else {
        console.log(`Target user not currently connected: ${targetUserId}`);
      }

      // Get message history
      let messageHistory = [];
      if (mongoose.connection.readyState === 1) {
        messageHistory = await Message.find({ room: roomName })
          .sort({ timestamp: 1 })
          .limit(100);

        // Format for client
        messageHistory = messageHistory.map((msg) => {
          const msgObj = msg.toObject();
          msgObj.id = msgObj._id.toString();
          msgObj.timestamp = msgObj.timestamp.toISOString();
          return msgObj;
        });
      } else {
        messageHistory = inMemoryMessages[roomName] || [];
      }

      // Send message history to the user
      socket.emit("messageHistory", messageHistory);

      // Format withUser information
      const withUser = {
        id: dbTargetUser._id || dbTargetUser.id,
        username: dbTargetUser.username,
        isOnline: dbTargetUser.isOnline || false,
        lastSeen: dbTargetUser.lastSeen
          ? dbTargetUser.lastSeen.toISOString
            ? dbTargetUser.lastSeen.toISOString()
            : dbTargetUser.lastSeen
          : null,
      };

      // Emit the privateChatJoined event with the room name and target user
      socket.emit("privateChatJoined", {
        room: roomName,
        withUser,
      });

      console.log(
        `Private chat ready: ${currentUser.username} with ${withUser.username}`
      );
    } catch (error) {
      console.error("Error joining private chat:", error);
      socket.emit("error", { message: "Failed to join private chat" });
    }
  });

  // Handle sending messages
  socket.on("sendMessage", async ({ text, room }) => {
    const user = users[socket.id];

    if (user) {
      const messageData = {
        user: user.username,
        userId: user.id,
        text,
        room,
        timestamp: new Date().toISOString(),
      };

      try {
        // Save message to storage
        if (mongoose.connection.readyState === 1) {
          // Save to MongoDB - fix the message structure to match the schema
          const message = new Message({
            room,
            sender: user.id,
            user: user.username, // Add this to store username with message
            userId: user.id, // Add this to store user ID with message
            text,
            timestamp: new Date(),
          });

          // Save and get the saved message with ID
          const savedMessage = await message.save();

          // Update the messageData with the MongoDB ID
          messageData.id = savedMessage._id.toString();

          console.log(`Message saved to MongoDB with ID: ${messageData.id}`);
        } else {
          // Save to in-memory storage
          if (!inMemoryMessages[room]) {
            inMemoryMessages[room] = [];
          }

          // Create a message with a unique ID
          const newMessageId = `msg_${room}_${Date.now()}`;
          messageData.id = newMessageId;

          const newMessage = {
            id: newMessageId,
            user: user.username,
            userId: user.id,
            text,
            room,
            timestamp: new Date().toISOString(),
            reactions: {},
          };

          inMemoryMessages[room].push(newMessage);
          console.log(
            `Message saved to in-memory storage with ID: ${newMessageId}`
          );
        }

        // Send the message to everyone in the room including the sender
        io.to(room).emit("message", messageData);
      } catch (error) {
        console.error("Error saving message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    }
  });

  // Handle private messages
  socket.on("sendPrivateMessage", async ({ recipientId, text }) => {
    const sender = users[socket.id];

    if (!sender) {
      socket.emit("error", { message: "Your session is not valid" });
      return;
    }

    try {
      // Check if recipient exists
      let recipient;
      if (mongoose.connection.readyState === 1) {
        recipient = await User.findOne({ _id: recipientId });
      } else {
        recipient = inMemoryUsers.find((u) => u.id === recipientId);
      }

      if (!recipient) {
        socket.emit("error", { message: "Recipient not found" });
        return;
      }

      // Generate room name
      const roomName = getPrivateRoomName(sender.id, recipientId);

      const messageData = {
        user: sender.username,
        userId: sender.id,
        text,
        isPrivate: true,
        timestamp: new Date().toISOString(),
      };

      // Save message to storage
      if (mongoose.connection.readyState === 1) {
        // Save to MongoDB
        const message = new Message({
          room: roomName,
          sender: sender.id,
          receiver: recipientId,
          user: sender.username, // Add username for consistency
          userId: sender.id, // Add userId for consistency
          text,
          timestamp: new Date(),
        });
        const savedMessage = await message.save();
        messageData.id = savedMessage._id.toString();
      } else {
        // Save to in-memory storage
        if (!inMemoryMessages[roomName]) {
          inMemoryMessages[roomName] = [];
        }

        const newMessage = {
          id: `msg_${roomName}_${Date.now()}`,
          user: sender.username,
          userId: sender.id,
          text,
          room: roomName,
          isPrivate: true,
          timestamp: new Date().toISOString(),
          reactions: {},
        };

        inMemoryMessages[roomName].push(newMessage);
        messageData.id = newMessage.id;
      }

      // Send to everyone in the private room
      io.to(roomName).emit("privateMessage", messageData);
    } catch (error) {
      console.error("Error sending private message:", error);
      socket.emit("error", { message: "Failed to send private message" });
    }
  });

  // Handle message reactions
  socket.on("addReaction", async ({ messageId, reaction }) => {
    try {
      const user = users[socket.id];
      if (!user) {
        socket.emit("error", { message: "User not found" });
        return;
      }

      // Find and update message
      if (mongoose.connection.readyState === 1) {
        // Update in MongoDB
        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit("error", { message: "Message not found" });
          return;
        }

        // Add the reaction to the message
        if (!message.reactions) {
          message.reactions = {};
        }

        if (!message.reactions[reaction]) {
          message.reactions[reaction] = [];
        }

        // Check if user already reacted with this emoji
        const userIndex = message.reactions[reaction].indexOf(user.id);
        if (userIndex === -1) {
          // Add user to this reaction
          message.reactions[reaction].push(user.id);
        } else {
          // Remove user from this reaction (toggle)
          message.reactions[reaction].splice(userIndex, 1);
          // Remove the emoji entry if no users left
          if (message.reactions[reaction].length === 0) {
            delete message.reactions[reaction];
          }
        }

        await message.save();

        // Broadcast the updated reactions to everyone in the room
        io.to(message.room).emit("messageReactionUpdated", {
          messageId,
          reactions: message.reactions,
        });
      } else {
        // Update in in-memory storage
        // Find the message in all rooms
        let foundMessage = null;
        let roomName = null;

        for (const [room, messages] of Object.entries(inMemoryMessages)) {
          const msgIndex = messages.findIndex((m) => m.id === messageId);
          if (msgIndex !== -1) {
            foundMessage = messages[msgIndex];
            roomName = room;
            break;
          }
        }

        if (!foundMessage) {
          socket.emit("error", { message: "Message not found" });
          return;
        }

        // Add the reaction to the message
        if (!foundMessage.reactions) {
          foundMessage.reactions = {};
        }

        if (!foundMessage.reactions[reaction]) {
          foundMessage.reactions[reaction] = [];
        }

        // Check if user already reacted with this emoji
        const userIndex = foundMessage.reactions[reaction].indexOf(user.id);
        if (userIndex === -1) {
          // Add user to this reaction
          foundMessage.reactions[reaction].push(user.id);
        } else {
          // Remove user from this reaction (toggle)
          foundMessage.reactions[reaction].splice(userIndex, 1);
          // Remove the emoji entry if no users left
          if (foundMessage.reactions[reaction].length === 0) {
            delete foundMessage.reactions[reaction];
          }
        }

        // Broadcast the updated reactions to everyone in the room
        io.to(roomName).emit("messageReactionUpdated", {
          messageId,
          reactions: foundMessage.reactions,
        });
      }
    } catch (error) {
      console.error("Error handling message reaction:", error);
      socket.emit("error", { message: "Failed to add reaction" });
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

  // Handle explicit message history requests
  socket.on("getMessageHistory", async ({ room }) => {
    if (!room) return;

    try {
      // Get message history
      let messageHistory;

      if (mongoose.connection.readyState === 1) {
        console.log(`Fetching message history for room (requested): ${room}`);
        messageHistory = await Message.find({ room })
          .sort({ timestamp: 1 })
          .limit(100);

        // Format messages for client
        messageHistory = messageHistory.map((msg) => {
          const msgObj = msg.toObject();
          msgObj.id = msgObj._id.toString();
          msgObj.timestamp = msgObj.timestamp.toISOString();
          return msgObj;
        });
      } else {
        messageHistory = inMemoryMessages[room] || [];
      }

      // Send message history to the user
      socket.emit("messageHistory", messageHistory);
      console.log(`Sent ${messageHistory.length} messages for room ${room}`);
    } catch (error) {
      console.error("Error fetching message history:", error);
      socket.emit("error", { message: "Failed to fetch message history" });
    }
  });

  // Handle user disconnection
  socket.on("disconnect", async () => {
    const user = users[socket.id];

    if (user) {
      try {
        // Find the user from authenticated users
        const authUserId = Object.keys(authenticatedUsers).find(
          (id) => authenticatedUsers[id].socketId === socket.id
        );

        if (authUserId) {
          // Update user status
          if (mongoose.connection.readyState === 1) {
            // Update in MongoDB
            await User.findByIdAndUpdate(authUserId, {
              isOnline: false,
              lastSeen: new Date(),
            });
          } else {
            // Update in in-memory storage
            const userIndex = inMemoryUsers.findIndex(
              (u) => u.id === authUserId
            );
            if (userIndex !== -1) {
              inMemoryUsers[userIndex].isOnline = false;
              inMemoryUsers[userIndex].lastSeen = new Date().toISOString();
            }
          }

          // Remove from memory
          delete authenticatedUsers[authUserId];

          // Get updated user list and broadcast
          let updatedUsers;
          if (mongoose.connection.readyState === 1) {
            updatedUsers = await User.find().select(
              "_id username isOnline lastSeen"
            );
            updatedUsers = updatedUsers.map((user) => ({
              id: user._id,
              username: user.username,
              isOnline: user.isOnline,
              lastSeen: user.lastSeen ? user.lastSeen.toISOString() : null,
            }));
          } else {
            updatedUsers = inMemoryUsers;
          }

          io.emit("userList", updatedUsers);
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
      } catch (error) {
        console.error("Error handling user disconnection:", error);
      }
    }

    console.log(`User disconnected: ${socket.id}`);
  });

  // Handle joining a voice channel
  socket.on("joinVoiceChannel", ({ channelId, userId, username }) => {
    console.log(`User ${username} joining voice channel: ${channelId}`);

    // Create channel if it doesn't exist
    if (!voiceChannels[channelId]) {
      voiceChannels[channelId] = { participants: [] };
    }

    // Add user to channel participants if not already there
    const isAlreadyInChannel = voiceChannels[channelId].participants.some(
      (p) => p.id === userId
    );

    if (!isAlreadyInChannel) {
      voiceChannels[channelId].participants.push({
        id: userId,
        username,
        socketId: socket.id,
      });
    }

    // Join the socket room for this voice channel
    socket.join(`voice-${channelId}`);

    // Broadcast updated participants list
    io.emit("voiceChannelParticipants", {
      channelId,
      participants: voiceChannels[channelId].participants,
    });
  });

  // Handle leaving a voice channel
  socket.on("leaveVoiceChannel", ({ channelId, userId }) => {
    console.log(`User ${userId} leaving voice channel: ${channelId}`);

    // Remove user from channel participants
    if (voiceChannels[channelId]) {
      voiceChannels[channelId].participants = voiceChannels[
        channelId
      ].participants.filter((p) => p.id !== userId);

      // Leave the socket room
      socket.leave(`voice-${channelId}`);

      // Broadcast updated participants list
      io.emit("voiceChannelParticipants", {
        channelId,
        participants: voiceChannels[channelId].participants,
      });
    }
  });

  // Handle request for voice channel participants
  socket.on("getVoiceChannelParticipants", ({ channelId }) => {
    const participants = voiceChannels[channelId]?.participants || [];
    socket.emit("voiceChannelParticipants", { channelId, participants });
  });

  // WebRTC signaling for video calls
  socket.on("joinVideoCall", ({ room, userId }) => {
    socket.join(room);

    // Notify others in the room
    socket.to(room).emit("userJoinedVideoCall", { userId });

    // Send list of participants to the new user
    const socketsInRoom = io.sockets.adapter.rooms.get(room);
    const participants = [];

    if (socketsInRoom) {
      for (const socketId of socketsInRoom) {
        if (socketId !== socket.id) {
          const participant = Object.values(users).find(
            (u) => u.socketId === socketId
          );
          if (participant) {
            participants.push(participant.id);
          }
        }
      }
    }

    socket.emit("videoCallParticipants", { participants });
  });

  socket.on("leaveVideoCall", ({ room, userId }) => {
    socket.leave(room);
    socket.to(room).emit("userLeftVideoCall", { userId });
  });

  socket.on("videoCallSignal", (data) => {
    const { to } = data;

    // Find the socket ID for the target user
    const targetUser = Object.values(authenticatedUsers).find(
      (u) => u.id === to
    );

    if (targetUser && targetUser.socketId) {
      io.to(targetUser.socketId).emit("videoCallSignal", data);
    }
  });
});

// Add listener to handle errors globally
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(500).json({ error: "Server error", message: err.message });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
