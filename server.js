// This file serves as an entry point to start the backend server
console.log("Starting the Bit2Byte server...");

try {
  // Check if backend directory and server file exist
  const fs = require("fs");
  const path = require("path");

  const serverPath = path.join(__dirname, "backend", "server.js");
  const modelsPath = path.join(__dirname, "backend", "models");
  const mockDataPath = path.join(__dirname, "backend", "mockData.js");
  const envPath = path.join(__dirname, "backend", ".env");

  // Check if the backend directory exists, create if not
  if (!fs.existsSync(path.join(__dirname, "backend"))) {
    console.log("Creating backend directory...");
    fs.mkdirSync(path.join(__dirname, "backend"), { recursive: true });
  }

  // Create models directory if it doesn't exist
  if (!fs.existsSync(modelsPath)) {
    console.log("Creating models directory...");
    fs.mkdirSync(modelsPath, { recursive: true });
  }

  // Check for server.js
  if (!fs.existsSync(serverPath)) {
    console.error(`Error: Backend server file not found at ${serverPath}`);
    console.log("Creating basic server.js file...");

    // Copy the server.js from the main directory if it exists
    const backendServerContent = require("fs").readFileSync(
      path.join(__dirname, "backend", "server.js"),
      "utf8"
    );
    fs.writeFileSync(serverPath, backendServerContent);
  }

  // Create package.json for backend if it doesn't exist
  const backendPackageJsonPath = path.join(
    __dirname,
    "backend",
    "package.json"
  );
  if (!fs.existsSync(backendPackageJsonPath)) {
    console.log("Creating backend package.json...");
    fs.writeFileSync(
      backendPackageJsonPath,
      JSON.stringify(
        {
          name: "bit2byte-backend",
          version: "1.0.0",
          description: "Backend server for bit2byte application",
          main: "server.js",
          scripts: {
            start: "node server.js",
            dev: "nodemon server.js",
          },
          dependencies: {
            cors: "^2.8.5",
            dotenv: "^16.4.7",
            express: "^4.18.2",
            mongoose: "^7.8.6",
            "socket.io": "^4.7.2",
          },
          devDependencies: {
            nodemon: "^3.0.1",
          },
        },
        null,
        2
      )
    );
  }

  // Create .env file if it doesn't exist
  if (!fs.existsSync(envPath)) {
    console.log("Creating backend .env file...");
    fs.writeFileSync(
      envPath,
      `PORT=5000
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb+srv://gca1245:gca1245@cluster1.51zaxft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1`
    );
  }

  // Create mockData.js if it doesn't exist
  if (!fs.existsSync(mockDataPath)) {
    console.log("Creating mockData.js...");
    fs.writeFileSync(
      mockDataPath,
      `const generateMockUsers = (count = 5) => {
  const users = [];
  for (let i = 1; i <= count; i++) {
    users.push({
      id: \`user_\${i}\`,
      username: \`User \${i}\`,
      isOnline: Math.random() > 0.5,
      lastSeen: new Date().toISOString(),
    });
  }
  return users;
};

const generateMockMessages = (room, count = 10) => {
  const messages = [];
  for (let i = 1; i <= count; i++) {
    messages.push({
      id: \`msg_\${room}_\${i}\`,
      user: \`User \${Math.ceil(Math.random() * 5)}\`,
      userId: \`user_\${Math.ceil(Math.random() * 5)}\`,
      text: \`This is message \${i} in room \${room}\`,
      room,
      timestamp: new Date(Date.now() - (count - i) * 60000).toISOString(),
      reactions: {},
    });
  }
  return messages;
};

module.exports = {
  generateMockUsers,
  generateMockMessages,
};`
    );
  }

  // Create models if they don't exist
  if (!fs.existsSync(path.join(modelsPath, "Message.js"))) {
    console.log("Creating Message model...");
    fs.writeFileSync(
      path.join(modelsPath, "Message.js"),
      `const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  room: {
    type: String,
    required: true,
    index: true,
  },
  sender: {
    type: String,
    required: true,
  },
  receiver: {
    type: String,
    required: false,
  },
  text: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  reactions: {
    type: Map,
    of: [String],
    default: {},
  },
  // Add these fields to match what the client expects
  user: {
    type: String,
    required: false,
  },
  userId: {
    type: String,
    required: false,
  }
});

// Add a pre-save hook to ensure user field is populated from sender
messageSchema.pre('save', function(next) {
  // If user is not set but sender is, use sender as userId
  if (!this.userId && this.sender) {
    this.userId = this.sender;
  }
  next();
});

messageSchema.index({ room: 1, timestamp: 1 });

module.exports = mongoose.model("Message", messageSchema);`
    );
  }

  if (!fs.existsSync(path.join(modelsPath, "User.js"))) {
    console.log("Creating User model...");
    fs.writeFileSync(
      path.join(modelsPath, "User.js"),
      `const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  // Add auth0Id as an optional field with proper sparse indexing
  auth0Id: {
    type: String,
    required: false,
    sparse: true, // This allows null values without uniqueness conflicts
    index: true,
  }
});

// Ensure we have proper indexes for queries
userSchema.index({ username: 1 });
userSchema.index({ isOnline: 1 });

module.exports = mongoose.model("User", userSchema);`
    );
  }

  // Start the server
  console.log("All backend files verified. Starting server...");
  require("./backend/server.js");
} catch (error) {
  console.error("Failed to start the server:", error);
}
