const TeamTask = require("../models/TeamTask");
const TeamActivity = require("../models/TeamActivity");
const TeamMessage = require("../models/TeamMessage");

// Preset team members for workload distribution & delegation
const DEFAULT_MEMBERS = [
  { name: "Aniketh Roy", role: "Tech Lead & Architect", avatar: "AR" },
  { name: "Alex Morgan", role: "Senior Frontend Engineer", avatar: "AM" },
  { name: "Sarah Chen", role: "Backend & Systems Lead", avatar: "SC" },
  { name: "David Kim", role: "DevOps & Cloud Engineer", avatar: "DK" },
  { name: "Emily Watson", role: "UI/UX & Product Designer", avatar: "EW" },
];

// Seed initial realistic team deliverables if empty
const seedTeamDataIfEmpty = async (userId, userName) => {
  const count = await TeamTask.countDocuments();
  if (count === 0) {
    const seedTasks = [
      {
        title: "Implement Distributed Rate Limiter & Redis Cache",
        description: "Prevent API throttling and protect endpoints with sliding-window Redis rate limiting.",
        priority: "High",
        status: "In Progress",
        assignee: DEFAULT_MEMBERS[2], // Sarah
        dueDate: new Date(Date.now() + 86400000 * 2), // +2 days
        subtasks: [
          { title: "Configure Redis connection pool", completed: true },
          { title: "Write Express sliding-window middleware", completed: true },
          { title: "Benchmark request throughput under load", completed: false },
        ],
        creatorName: userName || "Aniketh Roy",
        createdBy: userId,
      },
      {
        title: "Design Unified Design Tokens for Dark & Midnight Themes",
        description: "Standardize CSS variables and component contrast ratios for accessibility compliance.",
        priority: "Medium",
        status: "Completed",
        assignee: DEFAULT_MEMBERS[1], // Alex
        dueDate: new Date(Date.now() + 86400000 * 4),
        subtasks: [
          { title: "Audit color palette contrast ratios", completed: true },
          { title: "Refactor theme switcher token mapping", completed: true },
        ],
        creatorName: userName || "Aniketh Roy",
        createdBy: userId,
      },
      {
        title: "Automate Docker Staging Build & GitHub Actions Pipeline",
        description: "Ensure zero-downtime containerized CI/CD deployment on every merge to main.",
        priority: "High",
        status: "Pending",
        assignee: DEFAULT_MEMBERS[3], // David
        dueDate: new Date(Date.now() + 86400000 * 1), // Urgent (+1 day)
        subtasks: [
          { title: "Write multi-stage Dockerfile", completed: false },
          { title: "Configure GitHub Actions workflow secret keys", completed: false },
          { title: "Setup automated smoke testing", completed: false },
        ],
        creatorName: userName || "Aniketh Roy",
        createdBy: userId,
      },
      {
        title: "System Design Wireframes for Real-Time Notification Center",
        description: "Create low-latency WebSocket push architecture diagram for instant team alerts.",
        priority: "Low",
        status: "In Progress",
        assignee: DEFAULT_MEMBERS[4], // Emily
        dueDate: new Date(Date.now() + 86400000 * 6),
        subtasks: [
          { title: "Draft user notification flow wireframes", completed: true },
          { title: "Review with frontend and backend leads", completed: false },
        ],
        creatorName: userName || "Aniketh Roy",
        createdBy: userId,
      },
    ];

    await TeamTask.insertMany(seedTasks);

    // Initial activity logs
    await TeamActivity.create([
      {
        userName: "David Kim",
        action: "accepted assignment",
        taskTitle: "Automate Docker Staging Build & GitHub Actions Pipeline",
        details: "Flagged as high-priority sprint deliverable",
        type: "assignee",
      },
      {
        userName: "Sarah Chen",
        action: "updated progress",
        taskTitle: "Implement Distributed Rate Limiter & Redis Cache",
        details: "Finished 2 of 3 subtasks (In Progress)",
        type: "status",
      },
      {
        userName: "Alex Morgan",
        action: "completed task",
        taskTitle: "Design Unified Design Tokens for Dark & Midnight Themes",
        details: "Merged PR #14 into main",
        type: "status",
      },
    ]);

    // Initial team sync messages
    await TeamMessage.create([
      {
        userName: "Sarah Chen",
        text: "Redis cluster config is tested and ready. Docker pipeline is up next.",
        isBlocker: false,
      },
      {
        userName: "David Kim",
        text: "Working on the GitHub Actions deployment workflow today. Let me know if any env vars change.",
        isBlocker: false,
      },
    ]);
  }
};

// GET /api/team/tasks
exports.getTeamTasks = async (req, res) => {
  try {
    const userName = req.user?.name || "Team Member";
    await seedTeamDataIfEmpty(req.user?._id, userName);

    const tasks = await TeamTask.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch team tasks", error: error.message });
  }
};

// POST /api/team/tasks
exports.createTeamTask = async (req, res) => {
  try {
    const { title, description, priority, dueDate, assignee, subtasks } = req.body;
    const userName = req.user?.name || "Team Member";

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const assignedMember = assignee || DEFAULT_MEMBERS[0];

    const task = await TeamTask.create({
      title,
      description,
      priority: priority || "Medium",
      dueDate: dueDate || undefined,
      assignee: assignedMember,
      subtasks: Array.isArray(subtasks)
        ? subtasks.map((st) => (typeof st === "string" ? { title: st, completed: false } : st))
        : [],
      createdBy: req.user?._id,
      creatorName: userName,
    });

    // Record activity
    await TeamActivity.create({
      user: req.user?._id,
      userName,
      action: "created team task",
      taskTitle: title,
      details: `Assigned to ${assignedMember.name} with ${priority || "Medium"} priority`,
      type: "create",
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: "Failed to create team task", error: error.message });
  }
};

// PUT /api/team/tasks/:id
exports.updateTeamTask = async (req, res) => {
  try {
    const task = await TeamTask.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Team task not found" });
    }

    const userName = req.user?.name || "Team Member";
    let changeLog = [];
    let activityType = "status";

    if (req.body.status !== undefined && req.body.status !== task.status) {
      changeLog.push(`changed status from "${task.status}" to "${req.body.status}"`);
      task.status = req.body.status;
      activityType = "status";
    }

    if (req.body.priority !== undefined && req.body.priority !== task.priority) {
      changeLog.push(`changed priority from "${task.priority}" to "${req.body.priority}"`);
      task.priority = req.body.priority;
      activityType = "priority";
    }

    if (req.body.assignee !== undefined && req.body.assignee.name !== task.assignee?.name) {
      changeLog.push(`reassigned to ${req.body.assignee.name}`);
      task.assignee = req.body.assignee;
      activityType = "assignee";
    }

    if (req.body.dueDate !== undefined) {
      task.dueDate = req.body.dueDate;
    }

    if (req.body.subtasks !== undefined) {
      task.subtasks = req.body.subtasks;
    }

    if (req.body.title !== undefined) {
      task.title = req.body.title;
    }

    if (req.body.description !== undefined) {
      task.description = req.body.description;
    }

    const updatedTask = await task.save();

    // Log activity if key attributes changed
    if (changeLog.length > 0) {
      await TeamActivity.create({
        user: req.user?._id,
        userName,
        action: changeLog.join(", "),
        taskTitle: task.title,
        details: `Updated in team collaboration board`,
        type: activityType,
      });
    }

    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: "Failed to update team task", error: error.message });
  }
};

// DELETE /api/team/tasks/:id
exports.deleteTeamTask = async (req, res) => {
  try {
    const task = await TeamTask.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: "Team task not found" });
    }

    const title = task.title;
    const userName = req.user?.name || "Team Member";
    await task.deleteOne();

    await TeamActivity.create({
      user: req.user?._id,
      userName,
      action: "removed task",
      taskTitle: title,
      details: "Deleted from team sprint",
      type: "delete",
    });

    res.json({ message: "Task removed from team workspace" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete team task", error: error.message });
  }
};

// GET /api/team/activity
exports.getTeamActivities = async (req, res) => {
  try {
    const activities = await TeamActivity.find().sort({ createdAt: -1 }).limit(40);
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch team activities", error: error.message });
  }
};

// GET /api/team/messages
exports.getTeamMessages = async (req, res) => {
  try {
    const messages = await TeamMessage.find().sort({ createdAt: 1 }).limit(50);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch team messages", error: error.message });
  }
};

// POST /api/team/messages
exports.postTeamMessage = async (req, res) => {
  try {
    const { text, isBlocker } = req.body;
    const userName = req.user?.name || "Team Member";

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Message text is required" });
    }

    const message = await TeamMessage.create({
      user: req.user?._id,
      userName,
      text: text.trim(),
      isBlocker: !!isBlocker,
    });

    if (isBlocker) {
      await TeamActivity.create({
        user: req.user?._id,
        userName,
        action: "flagged a team blocker",
        taskTitle: "Sprint Blocker",
        details: text.trim(),
        type: "message",
      });
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: "Failed to post team message", error: error.message });
  }
};

// GET /api/team/members
exports.getTeamMembers = (req, res) => {
  res.json(DEFAULT_MEMBERS);
};
