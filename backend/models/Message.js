const mongoose = require("mongoose");

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
    required: false, // Optional, only for private messages
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
    of: [String], // Each emoji maps to an array of user IDs
    default: {},
  },
  // Add this field to match what the client-side expects
  user: {
    type: String,
    required: false, // We'll populate this from sender if needed
  },
  userId: {
    type: String,
    required: false, // We'll populate this from sender if needed
  },
});

// Add a pre-save hook to ensure user field is populated from sender
messageSchema.pre("save", function (next) {
  // If user is not set but sender is, use sender as userId
  if (!this.userId && this.sender) {
    this.userId = this.sender;
  }
  next();
});

// Create indexes for faster queries
messageSchema.index({ room: 1, timestamp: 1 });
messageSchema.index({ sender: 1 });

module.exports = mongoose.model("Message", messageSchema);
