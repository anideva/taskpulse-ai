import { useEffect, useState, useCallback } from "react";
import API from "../services/api";

function Tasks({ onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [generatedSubtasks, setGeneratedSubtasks] = useState([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("list");
  const [copiedStandup, setCopiedStandup] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchTasks = useCallback(async () => {
    try {
      const res = await API.get("/tasks");
      setTasks(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        onLogout();
      } else {
        setErrorMsg("Failed to load tasks. Please try again.");
      }
    }
  }, [onLogout]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setErrorMsg("");
    setSubmitting(true);
    try {
      await API.post("/tasks", {
        title,
        description,
        priority,
        dueDate: dueDate || undefined,
        subtasks: generatedSubtasks,
      });

      setTitle("");
      setDescription("");
      setPriority("Medium");
      setDueDate("");
      setGeneratedSubtasks([]);
      fetchTasks();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  const generateSubtasks = async () => {
    if (!title.trim()) {
      setErrorMsg("Please enter a task title first before generating AI subtasks.");
      return;
    }

    try {
      setErrorMsg("");
      setLoadingAI(true);
      const res = await API.post("/ai/generate-subtasks", {
        taskTitle: title,
        description: description || title,
        deadline: dueDate,
      });

      if (Array.isArray(res.data)) {
        setGeneratedSubtasks(res.data);
      }
    } catch (error) {
      setErrorMsg(
        error.response?.data?.message ||
          "AI service is currently busy. Please try again or add subtasks manually."
      );
    } finally {
      setLoadingAI(false);
    }
  };

  const removeGeneratedSubtask = (indexToRemove) => {
    setGeneratedSubtasks(generatedSubtasks.filter((_, idx) => idx !== indexToRemove));
  };

  const addManualSubtask = () => {
    if (newSubtaskInput.trim()) {
      setGeneratedSubtasks([...generatedSubtasks, newSubtaskInput.trim()]);
      setNewSubtaskInput("");
    }
  };

  const toggleTaskStatus = async (task) => {
    try {
      const newStatus = task.status === "completed" ? "pending" : "completed";
      await API.put(`/tasks/${task._id}`, { status: newStatus });
      fetchTasks();
    } catch (err) {
      setErrorMsg("Failed to update task status");
    }
  };

  const toggleSubtask = async (task, subtaskIndex) => {
    try {
      const updatedSubtasks = [...(task.subtasks || [])];
      updatedSubtasks[subtaskIndex].completed = !updatedSubtasks[subtaskIndex].completed;

      await API.put(`/tasks/${task._id}`, { subtasks: updatedSubtasks });
      fetchTasks();
    } catch (err) {
      setErrorMsg("Failed to update subtask");
    }
  };

  const deleteTask = async (id) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await API.delete(`/tasks/${id}`);
      fetchTasks();
    } catch (err) {
      setErrorMsg("Failed to delete task");
    }
  };

  const getDeadlineInfo = (taskDueDate, isCompleted) => {
    if (!taskDueDate) return { label: "No deadline", color: "#6c757d", bg: "#f8f9fa" };
    if (isCompleted) return { label: "Completed", color: "#2e7d32", bg: "#e8f5e9" };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(taskDueDate);
    deadline.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: `Overdue by ${Math.abs(diffDays)}d`, color: "#c62828", bg: "#ffebee" };
    }
    if (diffDays === 0) {
      return { label: "Due Today", color: "#e65100", bg: "#fff3e0" };
    }
    if (diffDays <= 3) {
      return { label: `Due in ${diffDays}d`, color: "#ef6c00", bg: "#fff8e1" };
    }
    return {
      label: `Due ${new Date(taskDueDate).toLocaleDateString()}`,
      color: "#00695c",
      bg: "#e0f2f1",
    };
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case "High":
        return { color: "#c62828", bg: "#ffebee", label: "High Priority" };
      case "Low":
        return { color: "#1565c0", bg: "#e3f2fd", label: "Low Priority" };
      default:
        return { color: "#ef6c00", bg: "#fff3e0", label: "Medium Priority" };
    }
  };

  const handleCopyStandup = () => {
    const completedList = tasks
      .filter((t) => t.status === "completed")
      .map((t) => `• ${t.title}`)
      .join("\n");
    const pendingList = tasks
      .filter((t) => t.status !== "completed")
      .map((t) => `• ${t.title} [${t.priority} priority]`)
      .join("\n");

    const standupText = `🚀 TaskPulse AI - Daily Standup\n\n✅ COMPLETED:\n${
      completedList || "None yet"
    }\n\n⏳ IN PROGRESS:\n${pendingList || "None"}\n`;

    navigator.clipboard.writeText(standupText).then(() => {
      setCopiedStandup(true);
      setTimeout(() => setCopiedStandup(false), 3000);
    });
  };

  const priorityWeights = { High: 3, Medium: 2, Low: 1 };

  const processedTasks = tasks
    .filter((task) => {
      if (filter === "pending") return task.status !== "completed";
      if (filter === "completed") return task.status === "completed";
      if (filter === "high") return task.priority === "High";

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = task.title?.toLowerCase().includes(q);
        const descMatch = task.description?.toLowerCase().includes(q);
        const subtaskMatch = task.subtasks?.some((st) =>
          st.title?.toLowerCase().includes(q)
        );
        if (!titleMatch && !descMatch && !subtaskMatch) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "priority") {
        return (
          (priorityWeights[b.priority] || 2) -
          (priorityWeights[a.priority] || 2)
        );
      }
      if (sortBy === "dueDate") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

  const totalTasks = tasks.length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const pendingCount = totalTasks - completedCount;
  const completionRate =
    totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const overdueCount = tasks.filter((t) => {
    if (!t.dueDate || t.status === "completed") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(t.dueDate);
    deadline.setHours(0, 0, 0, 0);
    return deadline < today;
  }).length;
  const highPriorityCount = tasks.filter(
    (t) => t.priority === "High" && t.status !== "completed"
  ).length;

  return (
    <div className="container">
      {/* Top Navbar */}
      <header className="dashboard-header">
        <div className="brand-group">
          <div className="brand-title-wrap">
            <span className="brand-icon">⚡</span>
            <h2 className="brand-title">TaskPulse AI</h2>
          </div>
          <p className="subtitle">
            Intelligent Goal Decomposition & Workflow Dashboard
          </p>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          Sign Out
        </button>
      </header>

      {/* Metrics Stat Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Tasks</span>
            <span className="metric-icon">📋</span>
          </div>
          <div className="metric-value">{totalTasks}</div>
          <span className="metric-sub">Active project backlog</span>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">In Progress</span>
            <span className="metric-icon">⏳</span>
          </div>
          <div className="metric-value">{pendingCount}</div>
          <span
            className="metric-sub"
            style={{ color: highPriorityCount > 0 ? "#e65100" : "#586069" }}
          >
            {highPriorityCount > 0
              ? `${highPriorityCount} high priority`
              : "Work in progress"}
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Completed</span>
            <span className="metric-icon">✅</span>
          </div>
          <div className="metric-value">{completedCount}</div>
          <span className="metric-sub">Finished milestones</span>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Sprint Health</span>
            <span className="metric-icon">⚡</span>
          </div>
          <div className="metric-value">{completionRate}%</div>
          <div className="metric-progress-bar">
            <div
              className="metric-progress-fill"
              style={{
                width: `${completionRate}%`,
                backgroundColor:
                  completionRate === 100
                    ? "#2e7d32"
                    : completionRate >= 50
                    ? "#0366d6"
                    : "#ef6c00",
              }}
            />
          </div>
          <span
            className="metric-sub"
            style={{ color: overdueCount > 0 ? "#c62828" : "#2e7d32" }}
          >
            {overdueCount > 0
              ? `🚨 ${overdueCount} overdue`
              : "All deadlines on track"}
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="alert-error">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg("")} className="close-btn">
            ✕
          </button>
        </div>
      )}

      {/* Task Creation Form */}
      <div className="task-form">
        <h4>Create New Task</h4>
        <form onSubmit={addTask}>
          <div className="form-row">
            <input
              type="text"
              placeholder="Task Title (e.g. Prepare for System Design Interview)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="input-title"
            />
          </div>

          <div className="form-row">
            <textarea
              placeholder="Task Description / Notes (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="2"
              className="input-description"
            />
          </div>

          <div className="form-row-multi">
            <div className="form-group">
              <label>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="select-priority"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input-date"
              />
            </div>

            <div className="form-group-btn">
              <button
                type="button"
                className="ai-btn"
                onClick={generateSubtasks}
                disabled={loadingAI}
              >
                {loadingAI ? "⏳ Breaking down..." : "✨ AI Generate Subtasks"}
              </button>
            </div>
          </div>

          {/* AI Subtasks Preview */}
          {generatedSubtasks.length > 0 && (
            <div className="ai-subtasks-box">
              <div className="ai-subtasks-header">
                <strong>✨ AI Suggested Checklist ({generatedSubtasks.length}):</strong>
                <span className="ai-badge">Will save with task</span>
              </div>
              <ul className="subtasks-preview-list">
                {generatedSubtasks.map((st, index) => (
                  <li key={index} className="subtask-preview-item">
                    <span>• {st}</span>
                    <button
                      type="button"
                      onClick={() => removeGeneratedSubtask(index)}
                      className="remove-subtask-btn"
                      title="Remove subtask"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>

              <div className="add-subtask-row">
                <input
                  type="text"
                  placeholder="Add another custom subtask..."
                  value={newSubtaskInput}
                  onChange={(e) => setNewSubtaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addManualSubtask();
                    }
                  }}
                />
                <button type="button" onClick={addManualSubtask} className="secondary-btn">
                  + Add
                </button>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="submit" disabled={submitting} className="submit-btn">
              {submitting ? "Saving..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>

      {/* Search, Sort & View Controls */}
      <div className="search-sort-bar">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search tasks, notes, or subtasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="clear-search-btn"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="sort-view-actions">
          <div className="sort-control">
            <label>Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="dueDate">Due Date (Earliest)</option>
              <option value="priority">Priority (High → Low)</option>
            </select>
          </div>

          <button
            type="button"
            className="standup-btn"
            onClick={handleCopyStandup}
            title="Copy formatted standup summary to clipboard"
          >
            {copiedStandup ? "✓ Copied!" : "📋 Copy Standup"}
          </button>

          <div className="view-mode-toggle">
            <button
              type="button"
              className={`view-mode-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
              title="List View"
            >
              ☰ List
            </button>
            <button
              type="button"
              className={`view-mode-btn ${viewMode === "kanban" ? "active" : ""}`}
              onClick={() => setViewMode("kanban")}
              title="Kanban Board View"
            >
              ☷ Board
            </button>
          </div>
        </div>
      </div>

      {/* Task Filters & Counts */}
      <div className="tasks-toolbar">
        <h3>
          {viewMode === "kanban" ? "Kanban Sprint Board" : "Task Backlog"} ({processedTasks.length}
          {processedTasks.length !== tasks.length ? ` of ${tasks.length}` : ""})
        </h3>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All ({tasks.length})
          </button>
          <button
            className={`filter-btn ${filter === "pending" ? "active" : ""}`}
            onClick={() => setFilter("pending")}
          >
            Pending ({tasks.filter((t) => t.status !== "completed").length})
          </button>
          <button
            className={`filter-btn ${filter === "completed" ? "active" : ""}`}
            onClick={() => setFilter("completed")}
          >
            Completed ({tasks.filter((t) => t.status === "completed").length})
          </button>
          <button
            className={`filter-btn ${filter === "high" ? "active" : ""}`}
            onClick={() => setFilter("high")}
          >
            High Priority ({tasks.filter((t) => t.priority === "High").length})
          </button>
        </div>
      </div>

      {/* MAIN VIEW: LIST OR KANBAN */}
      {processedTasks.length === 0 ? (
        <div className="empty-state">
          <h4>No tasks found</h4>
          <p>
            {searchQuery
              ? `No tasks match your search "${searchQuery}".`
              : filter !== "all"
              ? `No tasks match the "${filter}" filter.`
              : "You haven't created any tasks yet. Create one above to get organized!"}
          </p>
        </div>
      ) : viewMode === "list" ? (
        /* LIST VIEW */
        <div className="tasks-grid">
          {processedTasks.map((task) => {
            const isCompleted = task.status === "completed";
            const priorityInfo = getPriorityBadge(task.priority);
            const deadlineInfo = getDeadlineInfo(task.dueDate, isCompleted);
            const subtaskCount = task.subtasks?.length || 0;
            const completedSubtasks =
              task.subtasks?.filter((st) => st.completed).length || 0;
            const subtaskPercentage =
              subtaskCount > 0
                ? Math.round((completedSubtasks / subtaskCount) * 100)
                : 0;

            return (
              <div
                key={task._id}
                className={`task-card ${isCompleted ? "task-completed" : ""}`}
              >
                <div className="task-card-header">
                  <div className="task-title-group">
                    <h4 className={isCompleted ? "title-strike" : ""}>{task.title}</h4>
                    {task.description && (
                      <p className="task-desc">{task.description}</p>
                    )}
                  </div>

                  <div className="task-badges">
                    <span
                      className="badge"
                      style={{
                        backgroundColor: priorityInfo.bg,
                        color: priorityInfo.color,
                      }}
                    >
                      {priorityInfo.label}
                    </span>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: deadlineInfo.bg,
                        color: deadlineInfo.color,
                      }}
                    >
                      {deadlineInfo.label}
                    </span>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: isCompleted ? "#e8f5e9" : "#fff8e1",
                        color: isCompleted ? "#2e7d32" : "#f57c00",
                      }}
                    >
                      {isCompleted ? "✓ Completed" : "⏳ Pending"}
                    </span>
                  </div>
                </div>

                {/* Subtasks Checklist */}
                {subtaskCount > 0 && (
                  <div className="subtasks-section">
                    <div className="subtasks-progress-info">
                      <span>
                        Subtasks: {completedSubtasks} of {subtaskCount} completed ({subtaskPercentage}%)
                      </span>
                      <div className="progress-bar-bg">
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${subtaskPercentage}%`,
                            backgroundColor:
                              subtaskPercentage === 100 ? "#2e7d32" : "#1976d2",
                          }}
                        />
                      </div>
                    </div>

                    <div className="subtasks-checklist">
                      {task.subtasks.map((subtask, sIdx) => (
                        <label key={sIdx} className="subtask-checkbox-item">
                          <input
                            type="checkbox"
                            checked={subtask.completed}
                            onChange={() => toggleSubtask(task, sIdx)}
                          />
                          <span className={subtask.completed ? "strikethrough" : ""}>
                            {subtask.title}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="task-card-footer">
                  <button
                    className={`btn-action ${
                      isCompleted ? "btn-reopen" : "btn-complete"
                    }`}
                    onClick={() => toggleTaskStatus(task)}
                  >
                    {isCompleted ? "Mark as Pending" : "Mark as Completed"}
                  </button>
                  <button
                    className="btn-action btn-delete"
                    onClick={() => deleteTask(task._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* KANBAN BOARD VIEW */
        <div className="kanban-board">
          {/* Column 1: In Progress */}
          <div className="kanban-column">
            <div className="kanban-column-header kanban-header-pending">
              <div className="kanban-header-title">
                <span>⏳ In Progress</span>
                <span className="kanban-count">
                  {processedTasks.filter((t) => t.status !== "completed").length}
                </span>
              </div>
            </div>

            <div className="kanban-cards-wrap">
              {processedTasks.filter((t) => t.status !== "completed").length === 0 ? (
                <div className="kanban-empty">No tasks in progress</div>
              ) : (
                processedTasks
                  .filter((t) => t.status !== "completed")
                  .map((task) => {
                    const priorityInfo = getPriorityBadge(task.priority);
                    const deadlineInfo = getDeadlineInfo(task.dueDate, false);
                    const subtaskCount = task.subtasks?.length || 0;
                    const completedSubtasks =
                      task.subtasks?.filter((st) => st.completed).length || 0;
                    const subtaskPercentage =
                      subtaskCount > 0
                        ? Math.round((completedSubtasks / subtaskCount) * 100)
                        : 0;

                    return (
                      <div key={task._id} className="kanban-card">
                        <div className="kanban-card-top">
                          <span
                            className="badge"
                            style={{
                              backgroundColor: priorityInfo.bg,
                              color: priorityInfo.color,
                            }}
                          >
                            {task.priority}
                          </span>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: deadlineInfo.bg,
                              color: deadlineInfo.color,
                            }}
                          >
                            {deadlineInfo.label}
                          </span>
                        </div>

                        <h5 className="kanban-card-title">{task.title}</h5>
                        {task.description && (
                          <p className="kanban-card-desc">{task.description}</p>
                        )}

                        {subtaskCount > 0 && (
                          <div className="kanban-subtask-mini">
                            <span>
                              ✓ {completedSubtasks}/{subtaskCount} subtasks
                            </span>
                            <div className="progress-bar-bg">
                              <div
                                className="progress-bar-fill"
                                style={{ width: `${subtaskPercentage}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="kanban-card-actions">
                          <button
                            className="btn-action btn-complete"
                            onClick={() => toggleTaskStatus(task)}
                            title="Mark Completed"
                          >
                            ✓ Done →
                          </button>
                          <button
                            className="btn-action btn-delete"
                            onClick={() => deleteTask(task._id)}
                            title="Delete Task"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* Column 2: Completed */}
          <div className="kanban-column">
            <div className="kanban-column-header kanban-header-completed">
              <div className="kanban-header-title">
                <span>✅ Completed</span>
                <span className="kanban-count">
                  {processedTasks.filter((t) => t.status === "completed").length}
                </span>
              </div>
            </div>

            <div className="kanban-cards-wrap">
              {processedTasks.filter((t) => t.status === "completed").length === 0 ? (
                <div className="kanban-empty">No completed tasks yet</div>
              ) : (
                processedTasks
                  .filter((t) => t.status === "completed")
                  .map((task) => {
                    const priorityInfo = getPriorityBadge(task.priority);
                    const subtaskCount = task.subtasks?.length || 0;

                    return (
                      <div key={task._id} className="kanban-card kanban-card-done">
                        <div className="kanban-card-top">
                          <span
                            className="badge"
                            style={{
                              backgroundColor: priorityInfo.bg,
                              color: priorityInfo.color,
                            }}
                          >
                            {task.priority}
                          </span>
                          <span className="badge" style={{ backgroundColor: "#e8f5e9", color: "#2e7d32" }}>
                            Done
                          </span>
                        </div>

                        <h5 className="kanban-card-title title-strike">{task.title}</h5>
                        {task.description && (
                          <p className="kanban-card-desc">{task.description}</p>
                        )}

                        {subtaskCount > 0 && (
                          <div className="kanban-subtask-mini">
                            <span>✓ All {subtaskCount} subtasks done</span>
                          </div>
                        )}

                        <div className="kanban-card-actions">
                          <button
                            className="btn-action btn-reopen"
                            onClick={() => toggleTaskStatus(task)}
                            title="Reopen Task"
                          >
                            ← Reopen
                          </button>
                          <button
                            className="btn-action btn-delete"
                            onClick={() => deleteTask(task._id)}
                            title="Delete Task"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tasks;
