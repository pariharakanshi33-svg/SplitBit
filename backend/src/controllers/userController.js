/**
 * User Controller — Handles HTTP requests for user operations
 */

const userService = require('../services/userService');

class UserController {
  // POST /signup
  async signup(req, res) {
    try {
      const { name, email, password } = req.body;
      
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      const user = await userService.createUser({ name, email, password });
      res.status(201).json({ id: user.id, name: user.name, email: user.email });
    } catch (error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  }

  // POST /users (Add Friend/Stub)
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

      // This will return existing user OR create a stub (no password)
      const user = await userService.createUser({ name, email });
      res.status(201).json({ id: user.id, name: user.name, email: user.email });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await userService.loginUser({ email, password });
      res.json({ id: user.id, name: user.name, email: user.email });
    } catch (error) {
      if (error.message === 'User not found' || error.message === 'Invalid password') {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async getUsers(req, res) {
    try {
      const users = await userService.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getUser(req, res) {
    try {
      const user = await userService.getUserById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async deleteUser(req, res) {
    try {
      await userService.deleteUser(req.params.id);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new UserController();
