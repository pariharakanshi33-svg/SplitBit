/**
 * User Service — Database operations for Users
 * (Password/login logic removed — Clerk handles auth)
 */

const prisma = require('../utils/prisma');

class UserService {
  /**
   * Create a stub user (friend who doesn't have a Clerk account yet).
   * If a user with this email already exists, returns them.
   */
  async createStubUser({ name, email }) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return existing; // Return existing (could be a real or stub user)
    }
    return prisma.user.create({
      data: { name, email }, // clerkId is null for stubs
    });
  }

  /**
   * Get all contacts (friends) for a specific user
   */
  async getUserContacts(userId) {
    const contacts = await prisma.contact.findMany({
      where: { userId },
      include: {
        friend: {
          select: {
            id: true,
            name: true,
            email: true,
            clerkId: true,
            createdAt: true,
            groupMemberships: {
              include: { group: true },
            },
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    // Map them back to look like regular users so the frontend doesn't break
    return contacts.map(c => c.friend);
  }

  /**
   * Search registered users (those with an account/clerkId)
   */
  async searchRegisteredUsers(query, currentUserId) {
    return prisma.user.findMany({
      where: {
        AND: [
          { clerkId: { not: null } },
          { id: { not: currentUserId } },
          {
            OR: [
              { email: { contains: query, mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } }
            ]
          }
        ]
      },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
      }
    });
  }

  /**
   * Add a registered user to contacts by email
   */
  async addContactByEmail(userId, email) {
    const friend = await prisma.user.findUnique({ where: { email } });
    if (!friend) throw new Error('User not found. They must have a SplitBit account.');
    if (!friend.clerkId) throw new Error('User has not registered their account yet.');
    if (friend.id === userId) throw new Error('You cannot add yourself as a contact.');

    // Check if already a contact
    const existing = await prisma.contact.findUnique({
      where: { userId_friendId: { userId, friendId: friend.id } }
    });
    if (existing) throw new Error('User is already in your contacts.');

    const contact = await prisma.contact.create({
      data: { userId, friendId: friend.id },
      include: { friend: true }
    });
    
    return contact.friend;
  }

  async getUserById(id) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        groupMemberships: { include: { group: true } },
        billParticipants: { include: { bill: true } },
        settlementsOwed: { include: { toUser: true, bill: true } },
        settlementsOwing: { include: { fromUser: true, bill: true } },
      },
    });
  }

  async deleteUser(id) {
    return prisma.user.delete({ where: { id } });
  }
}

module.exports = new UserService();
