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

      // Look for an existing user either by their Clerk ID or their Email
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { clerkId: clerkId },
            { email: email }
          ]
        }
      });

      if (user) {
        // If the user exists (either they logged in before, or a stub was created with their email)
        // Update their details safely, attaching the clerkId if it was missing
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            clerkId,
            name,
            email // Ensure their latest email from Clerk is synced
          },
        });
        console.log(`🔗 Synced existing user ${user.id} (Email: ${user.email}) with Clerk ID ${clerkId}`);
      } else {
        // Completely new user
        user = await prisma.user.create({
          data: {
            clerkId,
            name,
            email
          },
        });
        console.log(`✨ Created fresh user ${user.id} with Clerk ID ${clerkId}`);
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
