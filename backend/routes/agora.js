// Agora routes for token generation and call management
const express = require('express');
const { generateRtcToken, RtcRole } = require('../services/agora');
const { checkJwt } = require('../middleware/auth');

const router = express.Router();

/**
 * @route POST /api/agora/token
 * @desc Generate Agora RTC token for a specific channel
 * @access Private (requires Auth0 authentication)
 */
router.post('/token', checkJwt, async (req, res) => {
  try {
    const { channelName, uid = 0, role = 'publisher' } = req.body;

    if (!channelName) {
      return res.status(400).json({ error: 'Channel name is required' });
    }

    // Get role from request or default to publisher
    const userRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    // Get user ID from Auth0 or use provided UID
    const userId = uid || req.user.sub.replace('auth0|', '');

    // Generate the token
    const token = generateRtcToken(channelName, userId, userRole);

    // Return token information
    return res.json({
      token,
      userId,
      channelName,
      role: userRole === RtcRole.PUBLISHER ? 'publisher' : 'subscriber'
    });
  } catch (error) {
    console.error('Error generating Agora token:', error);
    return res.status(500).json({ error: 'Failed to generate token' });
  }
});

/**
 * @route POST /api/agora/create-channel
 * @desc Create a new Agora channel and return tokens for host
 * @access Private (requires Auth0 authentication)
 */
router.post('/create-channel', checkJwt, async (req, res) => {
  try {
    const { channelName, uid } = req.body;
    
    if (!channelName) {
      return res.status(400).json({ error: 'Channel name is required' });
    }

    // Get user ID from Auth0 or use provided UID
    const userId = uid || req.user.sub.replace('auth0|', '');
    
    // Generate host token (publisher role)
    const hostToken = generateRtcToken(channelName, userId, RtcRole.PUBLISHER);
    
    return res.json({
      success: true,
      channelName,
      hostToken,
      hostUid: userId,
      appId: process.env.AGORA_APP_ID
    });
  } catch (error) {
    console.error('Error creating Agora channel:', error);
    return res.status(500).json({ error: 'Failed to create channel' });
  }
});

/**
 * @route POST /api/agora/join-channel
 * @desc Join an existing Agora channel and return token for participant
 * @access Private (requires Auth0 authentication)
 */
router.post('/join-channel', checkJwt, async (req, res) => {
  try {
    const { channelName, uid, role = 'publisher' } = req.body;
    
    if (!channelName) {
      return res.status(400).json({ error: 'Channel name is required' });
    }

    // Get user role
    const userRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    
    // Get user ID from Auth0 or use provided UID
    const userId = uid || req.user.sub.replace('auth0|', '');
    
    // Generate participant token
    const token = generateRtcToken(channelName, userId, userRole);
    
    return res.json({
      success: true,
      channelName,
      token,
      uid: userId,
      role: userRole === RtcRole.PUBLISHER ? 'publisher' : 'subscriber',
      appId: process.env.AGORA_APP_ID
    });
  } catch (error) {
    console.error('Error joining Agora channel:', error);
    return res.status(500).json({ error: 'Failed to join channel' });
  }
});

module.exports = router;