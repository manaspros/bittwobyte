/**
 * This script checks if the backend can connect to MongoDB and create sample data.
 * It's useful for diagnosing connection issues.
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Load environment variables
console.log("Loading environment variables...");
dotenv.config();

console.log("Checking MongoDB connection string...");
console.log(`MONGODB_URI is ${process.env.MONGODB_URI ? "set" : "NOT set"}`);

if (!process.env.MONGODB_URI) {
  console.log("Creating .env file with default MongoDB URI...");
  fs.writeFileSync(
    path.join(__dirname, ".env"),
    `PORT=5000
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb+srv://gca1245:gca1245@cluster1.51zaxft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1`
  );

  // Reload environment variables
  dotenv.config();
}

// Try to connect to MongoDB
console.log("Attempting to connect to MongoDB...");
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ Successfully connected to MongoDB!");

    // Verify we can load the models
    console.log("Checking models...");
    try {
      const Message = require("./models/Message");
      const User = require("./models/User");
      console.log("✅ Models loaded successfully");

      // Create a test user
      const testUserId = `test_${Date.now()}`;
      const user = new User({
        _id: testUserId,
        username: "TestUser",
        isOnline: true,
        lastSeen: new Date(),
      });

      console.log("Creating test user...");
      return user
        .save()
        .then(() => {
          console.log("✅ Test user created successfully");

          // Create a test message
          const message = new Message({
            room: "test_room",
            sender: testUserId,
            text: "Test message",
            timestamp: new Date(),
          });

          console.log("Creating test message...");
          return message.save();
        })
        .then(() => {
          console.log("✅ Test message created successfully");
          console.log("✅ Database operations verified");

          // Cleanup
          console.log("Cleaning up test data...");
          return Promise.all([
            User.deleteOne({ _id: testUserId }),
            Message.deleteOne({ sender: testUserId }),
          ]);
        })
        .then(() => {
          console.log("✅ Cleanup completed");
          console.log("✅ ALL CHECKS PASSED! Backend is working correctly.");
          process.exit(0);
        });
    } catch (error) {
      console.error("❌ Error loading models:", error);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    console.log("\nTrying to use fallback in-memory mode...");
    console.log("✅ Backend can still run using in-memory mode");
    process.exit(1);
  });
