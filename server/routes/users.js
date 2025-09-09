const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching users');
  }
});


// In a real application, you should use a library like bcrypt to hash and compare passwords.
// Storing plaintext passwords is a major security risk.
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Username and password are required');
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    
    if (rows.length === 0) {
      return res.status(401).send('Invalid username or password');
    }

    const user = rows[0];

    if (user.password !== password) {
      return res.status(401).send('Invalid username or password');
    }

    // Don't send the password back to the client
    const { password: dbPassword, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);

  } catch (error) {
    console.error(error);
    res.status(500).send('Error during login');
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { username, role, password } = req.body;

  if (!username || !role) {
    return res.status(400).send('Username and role are required');
  }

  try {
    let query = 'UPDATE users SET username = ?, role = ?';
    const params = [username, role];

    if (password) {
      query += ', password = ?';
      params.push(password);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await db.query(query, params);
    res.status(200).send('User updated successfully');

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).send('Error updating user');
  }
});

module.exports = router;

