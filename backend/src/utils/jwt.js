const jwt = require('jsonwebtoken');
const config = require('../config/env');

const ALGORITHM = 'HS256';

function signToken(userId) {
  return jwt.sign({}, config.JWT_SECRET, {
    subject: userId,
    expiresIn: config.JWT_EXPIRES_IN,
    algorithm: ALGORITHM,
  });
}

/** Returns the user id from a valid token; throws for invalid/expired ones. */
function verifyToken(token) {
  const payload = jwt.verify(token, config.JWT_SECRET, { algorithms: [ALGORITHM] });
  if (typeof payload.sub !== 'string' || !payload.sub) {
    throw new jwt.JsonWebTokenError('token has no subject');
  }
  return payload.sub;
}

module.exports = { signToken, verifyToken };
