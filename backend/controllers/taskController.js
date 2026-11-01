const Task = require("../models/Task");

const createTask = async (req, res) => {
  try {
    const { title, description, priority, dueDate, subtasks, isFocusToday } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const formattedSubtasks = Array.isArray(subtasks)
      ? subtasks.map((st) =>
          typeof st === "string" ? { title: st, completed: false } : st
        )
      : [];

    const task = await Task.create({
      user: req.user.id,
      title,
      description,
      priority,
      dueDate,
      subtasks: formattedSubtasks,
      isFocusToday: !!isFocusToday,
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check ownership
    if (task.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Forbidden: You do not own this task" });
    }

    task.title = req.body.title !== undefined ? req.body.title : task.title;
    task.description = req.body.description !== undefined ? req.body.description : task.description;
    task.status = req.body.status !== undefined ? req.body.status : task.status;
    task.priority = req.body.priority !== undefined ? req.body.priority : task.priority;
    task.dueDate = req.body.dueDate !== undefined ? req.body.dueDate : task.dueDate;
    if (req.body.isFocusToday !== undefined) {
      task.isFocusToday = req.body.isFocusToday;
    }
    if (req.body.subtasks !== undefined) {
      task.subtasks = req.body.subtasks;
    }

    const updatedTask = await task.save();
    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Ensure task belongs to logged-in user
    if (task.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Forbidden: You do not own this task" });
    }

    await task.deleteOne();

    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



module.exports = { createTask, getMyTasks, updateTask, deleteTask };

