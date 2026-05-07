const { getAuth } = require('@clerk/express');
const prisma = require('../utils/prisma');

const requireAuth = async (req, res, next) => {
  try {
    // 1. Verify Clerk Auth using the modern getAuth method
    const auth = getAuth(req);
    const clerkId = auth?.userId;
    
    if (!clerkId) {
      return res.status(401).json({ error: 'Unauthorized: No valid session' });
    }

    // 2. Look up our DB user
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return res.status(401).json({
        error: 'User not synced. Please sign in again.',
        code: 'USER_NOT_SYNCED',
      });
    }

    req.userId = user.id;       // Our internal UUID
    req.dbUser = user;          // Full DB record
    next();
  } catch (err) {
    console.error('requireAuth DB lookup error:', err);
    next(err);
  }
};

module.exports = requireAuth;
