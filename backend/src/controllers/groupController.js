/**
 * Group Controller — Handles HTTP requests for group operations
 */

const groupService = require('../services/groupService');

class GroupController {
  async createGroup(req, res) {
    try {
      const { name, members = [], userId } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Group name is required' });
      }
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const group = await groupService.createGroup({ name, members, userId });
      res.status(201).json(group);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getGroups(req, res) {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const groups = await groupService.getAllGroups(userId);
      res.json(groups);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getGroup(req, res) {
    try {
      const group = await groupService.getGroupById(req.params.id);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }
      res.json(group);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async addMember(req, res) {
    try {
      const { userId, dietType = 'NON_VEG' } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const member = await groupService.addMember(req.params.id, { userId, dietType });
      res.status(201).json(member);
    } catch (error) {
      if (error.message.includes('already a member')) {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async removeMember(req, res) {
    try {
      await groupService.removeMember(req.params.id, req.params.userId);
      res.json({ message: 'Member removed successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateMemberDiet(req, res) {
    try {
      const { dietType } = req.body;
      if (!dietType || !['VEG', 'NON_VEG'].includes(dietType)) {
        return res.status(400).json({ error: 'dietType must be VEG or NON_VEG' });
      }

      const member = await groupService.updateMemberDiet(
        req.params.id, 
        req.params.userId, 
        dietType
      );
      res.json(member);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async deleteGroup(req, res) {
    try {
      await groupService.deleteGroup(req.params.id);
      res.json({ message: 'Group deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new GroupController();
