// Auth routes for Auth0 integration with Agora
const express = require('express');
const { checkJwt } = require('../middleware/auth');

const router = express.Router();

/**
 * @route GET /api/auth/me
 * @desc Get authenticated user information
 * @access Private (requires Auth0 authentication)
 */
router.get('/me', checkJwt, async (req, res) => {
  try {
    // Return the user info from the decoded JWT
    return res.json({
      user: {
        id: req.user.sub,
        email: req.user.email,
        name: req.user.name
      }
    });
  } catch (error) {
    console.error('Error getting user information:', error);
    return res.status(500).json({ error: 'Failed to get user information' });
  }
});

/**
 * @route GET /api/auth/verify
 * @desc Verify Auth0 token is valid (used for validating tokens on client)
 * @access Private (requires Auth0 authentication)
 */
router.get('/verify', checkJwt, (req, res) => {
  // If middleware passes, token is valid
  res.json({ valid: true });
});

module.exports = router;