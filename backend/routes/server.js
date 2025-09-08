const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = 'your_jwt_secret_key'; // In production, use environment variable

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/taskmanager', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected successfully"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
});

// Task Schema
const taskSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    status: { type: String, default: 'todo' },
    dueDate: { type: Date },
    user: { type: String, required: true }, // store username
  },
  { timestamps: true }
);

// Models
const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });

    req.user = user; // { userId, username }
    next();
  });
};

// ------------------- ROUTES -------------------

// User registration
app.post('/api/register', async (req, res) => {
  try {
    const { username, name, password } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: 'Username already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, name, password: hashedPassword });
    await newUser.save();

    // create JWT right after register
    const token = jwt.sign({ userId: newUser._id, username: newUser.username }, JWT_SECRET, {
      expiresIn: '24h',
    });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { username: newUser.username, name: newUser.name },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, {
      expiresIn: '24h',
    });

    res.json({
      message: 'Login successful',
      token,
      user: { username: user.username, name: user.name },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// Create a new task
app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { name, description, dueDate } = req.body;

    const newTask = new Task({
      name,
      description,
      dueDate,
      user: req.user.username, // get username from token
    });

    await newTask.save();

    res.status(201).json({ message: 'Task created successfully', task: newTask });
  } catch (error) {
    res.status(500).json({ message: 'Error creating task', error: error.message });
  }
});

// Get tasks for logged in user
app.get('/api/tasks/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;

    // security check: only allow if username matches logged-in user
    if (username !== req.user.username) {
      return res.status(403).json({ message: 'Not authorized to view these tasks' });
    }

    const tasks = await Task.find({ user: username }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
});

// Update a task
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status, dueDate } = req.body;

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // ensure only task owner can update
    if (task.user !== req.user.username) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    task.name = name || task.name;
    task.description = description || task.description;
    task.status = status || task.status;
    task.dueDate = dueDate || task.dueDate;

    await task.save();

    res.json({ message: 'Task updated successfully', task });
  } catch (error) {
    res.status(500).json({ message: 'Error updating task', error: error.message });
  }
});

// Delete a task
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (task.user !== req.user.username) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await task.deleteOne();

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting task', error: error.message });
  }
});

// Health check
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
