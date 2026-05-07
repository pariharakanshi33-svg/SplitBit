/**
 * User Controller — Handles HTTP requests for user operations
 * (signup/login removed — Clerk handles auth)
 */

const userService = require('../services/userService');

class UserController {
  /**
   * POST /api/users
   * Add a friend/stub user (someone without a Clerk account yet).
   * Used when adding participants to a bill or group.
   */
  async addFriend(req, res) {
    try {
      const { name, email } = req.body;

      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      const user = await userService.createStubUser({ name, email });
      res.status(201).json({ id: user.id, name: user.name, email: user.email });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getUsers(req, res) {
    try {
      const contacts = await userService.getUserContacts(req.userId);
      res.json(contacts);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async searchUsers(req, res) {
    try {
      const { q } = req.query;
      if (!q) return res.json([]);
      const users = await userService.searchRegisteredUsers(q, req.userId);
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async addContact(req, res) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email is required' });
      
      const contact = await userService.addContactByEmail(req.userId, email);
      res.status(201).json(contact);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async getUser(req, res) {
    try {
      const user = await userService.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async deleteUser(req, res) {
    try {
      await userService.deleteUser(req.params.id);
      res.json({ message: 'User deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new UserController();
