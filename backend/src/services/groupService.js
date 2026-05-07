/**
 * Group Service — Database operations for Groups
 */

const prisma = require('../utils/prisma');

class GroupService {
  async createGroup({ name, members = [], userId }) {
    if (!userId) throw new Error('userId is required');

    // Ensure the creator is always a member
    const hasCreator = members.some(m => m.userId === userId);
    const finalMembers = hasCreator 
      ? members 
      : [...members, { userId, dietType: 'NON_VEG' }];

    return prisma.group.create({
      data: {
        name,
        userId,
        members: {
          create: finalMembers.map(m => ({
            userId: m.userId,
            dietType: m.dietType || 'NON_VEG',
          }))
        }
      },
      include: {
        members: { include: { user: true } }
      }
    });
  }

  async getAllGroups(userId) {
    if (!userId) throw new Error('userId is required');

    return prisma.group.findMany({
      where: {
        OR: [
          { userId: userId }, // Created by the user
          { members: { some: { userId: userId } } } // User is a member
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        members: { include: { user: true } },
        _count: { select: { bills: true } }
      }
    });
  }

  async getGroupById(id) {
    return prisma.group.findUnique({
      where: { id },
      include: {
        members: { include: { user: true } },
        bills: {
          orderBy: { createdAt: 'desc' },
          include: {
            items: true,
            participants: { include: { user: true } },
            settlements: { include: { fromUser: true, toUser: true } },
          }
        }
      }
    });
  }

  async addMember(groupId, { userId, dietType = 'NON_VEG' }) {
    // Check if member already exists
    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });
    if (existing) {
      throw new Error('User is already a member of this group');
    }

    return prisma.groupMember.create({
      data: { groupId, userId, dietType },
      include: { user: true }
    });
  }

  async removeMember(groupId, userId) {
    return prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId } }
    });
  }

  async updateMemberDiet(groupId, userId, dietType) {
    return prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId } },
      data: { dietType },
      include: { user: true }
    });
  }

  async deleteGroup(id) {
    return prisma.group.delete({ where: { id } });
  }
}

module.exports = new GroupService();
