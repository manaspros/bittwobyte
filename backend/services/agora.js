// Agora token generation service
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const dotenv = require('dotenv');

dotenv.config();

// Agora app configuration
const appID = process.env.AGORA_APP_ID;
const appCertificate = process.env.AGORA_APP_CERTIFICATE;

// Default expiration time for tokens (1 hour)
const expirationTimeInSeconds = 3600;

/**
 * Generate an Agora RTC token
 * @param {string} channelName - The name of the channel to join
 * @param {string} uid - User ID (can be numeric string)
 * @param {number} role - User role (publisher or subscriber)
 * @param {number} expirationTime - Token expiration time in seconds
 * @returns {string} The generated token
 */
const generateRtcToken = (
  channelName,
  uid,
  role = RtcRole.PUBLISHER,
  expirationTime = expirationTimeInSeconds
) => {
  if (!appID || !appCertificate) {
    throw new Error('Agora credentials not found in environment variables');
  }

  // Calculate privilege expire time
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpireTime = currentTimestamp + expirationTime;

  // Generate the token
  return RtcTokenBuilder.buildTokenWithUid(
    appID,
    appCertificate,
    channelName,
    uid,
    role,
    privilegeExpireTime
  );
};

module.exports = {
  generateRtcToken,
  RtcRole
};