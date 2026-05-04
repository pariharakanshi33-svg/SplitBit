/**
 * User Service — Database operations for Users
 */

const prisma = require('../utils/prisma');

class UserService {
  async createUser({ name, email, password }) {
    // Check for existing user
    const existing = await prisma.user.findUnique({ where: { email } });
    
    // If password is provided (from signup flow)
    if (password) {
      if (existing) {
        if (existing.password) {
          throw new Error(`User with email ${email} already exists`);
        } else {
          // Claim stub account
          return prisma.user.update({
            where: { email },
            data: { name, password }
          });
        }
      }
      // Create new full user
      return prisma.user.create({
        data: { name, email, password }
      });
    } else {
      // Stub creation flow (adding a friend)
      if (existing) {
        return existing; // Just return the existing user so they can be added to the group
      }
      // Create stub user (no password)
      return prisma.user.create({
        data: { name, email }
      });
    }
  }

  async loginUser({ email, password }) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('User not found');
    }
    if (user.password !== password) {
      throw new Error('Invalid password');
    }
    return user;
  }

  async getAllUsers() {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        groupMemberships: {
          include: { group: true }
        }
      }
    });
  }

  async getUserById(id) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        groupMemberships: { include: { group: true } },
        billParticipants: { include: { bill: true } },
        settlementsOwed: { include: { toUser: true, bill: true } },
        settlementsOwing: { include: { fromUser: true, bill: true } },
      }
    });
  }

  async deleteUser(id) {
    return prisma.user.delete({ where: { id } });
  }
}

module.exports = new UserService();
