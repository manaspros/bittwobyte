const mongoose = require("mongoose");

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
  auth0Id: {
    type: String,
    required: false,
  },
  authProvider: {
    type: String,
    enum: ["auth0", "anonymous", "google-oauth2", null],
    default: null,
  },
  email: {
    type: String,
    required: false,
  },
  picture: {
    type: String,
    required: false,
  },
  // Raw Auth0 sub (unencoded)
  rawAuthId: {
    type: String,
    required: false,
    index: true,
  },
});

// Ensure we have proper indexes for queries
userSchema.index({ username: 1 });
userSchema.index({ isOnline: 1 });
userSchema.index({ auth0Id: 1 }, { sparse: true });
userSchema.index({ email: 1 }, { sparse: true });

module.exports = mongoose.model("User", userSchema);
