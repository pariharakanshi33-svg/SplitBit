/**
 * Auth Controller — Clerk user sync
 *
 * POST /api/auth/sync
 * Called by the frontend immediately after Clerk sign-in.
 * Creates or updates the user record in our PostgreSQL database.
 * Also handles merging a stub user (added as friend) with a real Clerk account.
 */

const prisma = require('../utils/prisma');
const { getAuth } = require('@clerk/express');

class AuthController {
  async syncUser(req, res) {
    try {
      const auth = getAuth(req);
      const clerkId = auth?.userId;
      if (!clerkId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { name, email } = req.body;
      if (!name || !email) {
        return res.status(400).json({ error: 'name and email are required' });
      }

      // Check if a stub user exists with this email (added as a friend before signing up)
      const stubUser = await prisma.user.findFirst({
        where: { email, clerkId: null },
      });

      let user;

      if (stubUser) {
        // Claim the stub account — link it to this Clerk ID
        user = await prisma.user.update({
          where: { id: stubUser.id },
          data: { clerkId, name },
        });
        console.log(`🔗 Claimed stub user ${stubUser.id} with Clerk ID ${clerkId}`);
      } else {
        // Upsert by clerkId (handles re-logins gracefully)
        user = await prisma.user.upsert({
          where: { clerkId },
          update: { name, email },
          create: { clerkId, name, email },
        });
      }

      res.json({
        user: { id: user.id, name: user.name, email: user.email },
      });
    } catch (err) {
      console.error('Sync user error:', err);
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new AuthController();
