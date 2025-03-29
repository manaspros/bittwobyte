// Auth0 middleware for verifying JWT tokens
const jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');
const dotenv = require('dotenv');

dotenv.config();

// Auth0 configuration
const AUTH0_DOMAIN = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;

// Initialize JWKS client
const jwksClient = jwksRsa({
  jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5
});

// Function to get signing key
const getSigningKey = (header, callback) => {
  jwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
};

// Middleware for checking JWT token
const checkJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(
    token,
    getSigningKey,
    {
      algorithms: ['RS256'],
      audience: AUTH0_AUDIENCE,
      issuer: `https://${AUTH0_DOMAIN}/`
    },
    (err, decoded) => {
      if (err) {
        console.error('Token verification error:', err);
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      // Add user information to request
      req.user = decoded;
      next();
    }
  );
};

module.exports = {
  checkJwt
};