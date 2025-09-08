const express = require('express');
const Task = require('../models/task');

const router = express.Router();

// Get all tasks for a user
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const tasks = await Task.find({ user: username }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching tasks', error: error.message });
  }
});

// Create a new task
router.post('/', async (req, res) => {
  try {
    const task = new Task(req.body);
    await task.save();
    res.status(201).json({ message: 'Task created successfully', task });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error creating task', error: error.message });
  }
});

// Update a task
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedTask = await Task.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (!updatedTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ message: 'Task updated successfully', task: updatedTask });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error updating task', error: error.message });
  }
});

// Delete a task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTask = await Task.findByIdAndDelete(id);

    if (!deletedTask) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error deleting task', error: error.message });
  }
});

module.exports = router;
