import React, { useState, useEffect, useCallback } from "react";
import API from "../services/api";

function TeamHub() {
  const [teamTasks, setTeamTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("board"); // "board" | "activity" | "communication"

  // New task form state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState("High");
  const [newAssigneeIndex, setNewAssigneeIndex] = useState(0);
  const [newDueDate, setNewDueDate] = useState("");
  const [submittingTask, setSubmittingTask] = useState(false);

  // Communication message state
  const [newMsgText, setNewMsgText] = useState("");
  const [isBlocker, setIsBlocker] = useState(false);
  const [submittingMsg, setSubmittingMsg] = useState(false);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchTeamData = useCallback(async () => {
    try {
      setErrorMsg("");
      const [tasksRes, actRes, msgRes, memRes] = await Promise.all([
        API.get("/team/tasks"),
        API.get("/team/activity"),
        API.get("/team/messages"),
        API.get("/team/members"),
      ]);

      setTeamTasks(tasksRes.data);
      setActivities(actRes.data);
      setMessages(msgRes.data);
      setMembers(memRes.data);
    } catch (err) {
      setErrorMsg("Failed to load team collaboration data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  // Create new team task
  const handleCreateTeamTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSubmittingTask(true);
    try {
      const chosenAssignee = members[newAssigneeIndex] || members[0];
      await API.post("/team/tasks", {
        title: newTitle.trim(),
        description: newDesc.trim(),
        priority: newPriority,
        assignee: chosenAssignee,
        dueDate: newDueDate || undefined,
      });

      setNewTitle("");
      setNewDesc("");
      setNewDueDate("");
      fetchTeamData();
    } catch (err) {
      setErrorMsg("Failed to create team task.");
    } finally {
      setSubmittingTask(false);
    }
  };

  // Update task status
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await API.put(`/team/tasks/${taskId}`, { status: newStatus });
      fetchTeamData();
    } catch (err) {
      setErrorMsg("Failed to update task status.");
    }
  };

  // Update task priority
  const handlePriorityChange = async (taskId, newPriorityVal) => {
    try {
      await API.put(`/team/tasks/${taskId}`, { priority: newPriorityVal });
      fetchTeamData();
    } catch (err) {
      setErrorMsg("Failed to update task priority.");
    }
  };

  // Reassign task to a different team member
  const handleReassign = async (taskId, memberName) => {
    const targetMember = members.find((m) => m.name === memberName);
    if (!targetMember) return;

    try {
      await API.put(`/team/tasks/${taskId}`, { assignee: targetMember });
      fetchTeamData();
    } catch (err) {
      setErrorMsg("Failed to reassign task.");
    }
  };

  // Delete team task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Remove this deliverable from the team sprint?")) return;
    try {
      await API.delete(`/team/tasks/${taskId}`);
      fetchTeamData();
    } catch (err) {
      setErrorMsg("Failed to delete team task.");
    }
  };

  // Post team message / blocker
  const handlePostMessage = async (e) => {
    e.preventDefault();
    if (!newMsgText.trim()) return;

    setSubmittingMsg(true);
    try {
      await API.post("/team/messages", {
        text: newMsgText.trim(),
        isBlocker,
      });
      setNewMsgText("");
      setIsBlocker(false);
      fetchTeamData();
    } catch (err) {
      setErrorMsg("Failed to post sync message.");
    } finally {
      setSubmittingMsg(false);
    }
  };

  // Filter tasks
  const filteredTasks = teamTasks.filter((t) => {
    if (selectedMember !== "all" && t.assignee?.name !== selectedMember) {
      return false;
    }
    if (priorityFilter !== "all" && t.priority !== priorityFilter) {
      return false;
    }
    return true;
  });

  // Top urgent tasks (High priority and not completed)
  const urgentTasks = teamTasks.filter(
    (t) => t.priority === "High" && t.status !== "Completed"
  );

  const activeBlockers = messages.filter((m) => m.isBlocker);

  return (
    <div className="team-hub-container">
      {/* Team Header Banner */}
      <div className="team-hub-header">
        <div className="team-hub-brand">
          <span className="team-icon-badge">👥</span>
          <div>
            <h3>Project Sprint Alpha — Team Collaboration Hub</h3>
            <p>
              Shared Engineering Command Center: Task Distribution, Live Change Feed & Standup Sync
            </p>
          </div>
        </div>

        <div className="team-hub-quick-stats">
          <div className="team-stat-item">
            <span className="stat-label">Total Shared</span>
            <span className="stat-value">{teamTasks.length}</span>
          </div>
          <div className="team-stat-item stat-urgent">
            <span className="stat-label">🔴 High Priority</span>
            <span className="stat-value">{urgentTasks.length}</span>
          </div>
          <div className="team-stat-item stat-blockers">
            <span className="stat-label">🚨 Active Blockers</span>
            <span className="stat-value">{activeBlockers.length}</span>
          </div>
          <div className="team-stat-item stat-done">
            <span className="stat-label">✅ Completed</span>
            <span className="stat-value">
              {teamTasks.filter((t) => t.status === "Completed").length}
            </span>
          </div>
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

      {/* Team Sub-Navigation Tabs */}
      <div className="team-nav-tabs">
        <button
          type="button"
          className={`team-nav-tab ${activeTab === "board" ? "active" : ""}`}
          onClick={() => setActiveTab("board")}
        >
          📋 Task Distribution & Priority Queue ({teamTasks.length})
        </button>
        <button
          type="button"
          className={`team-nav-tab ${activeTab === "activity" ? "active" : ""}`}
          onClick={() => setActiveTab("activity")}
        >
          🔄 Live Change & Audit Feed ({activities.length})
        </button>
        <button
          type="button"
          className={`team-nav-tab ${activeTab === "communication" ? "active" : ""}`}
          onClick={() => setActiveTab("communication")}
        >
          💬 Standup Sync & Blockers ({messages.length})
          {activeBlockers.length > 0 && <span className="blocker-pill-badge">{activeBlockers.length} Alert</span>}
        </button>
      </div>

      {loading ? (
        <div className="team-loading">Loading team workspace...</div>
      ) : activeTab === "board" ? (
        /* ==========================================================================
           TAB 1: WORKLOAD DISTRIBUTION & PRIORITY QUEUE
           ========================================================================== */
        <div className="team-board-layout">
          {/* Workload Distribution Directory */}
          <div className="team-members-bar">
            <div className="members-bar-title">
              <strong>👥 Team Workload Distribution:</strong>
              <span>Click a member to filter their assigned deliverables</span>
            </div>
            <div className="members-scroll-row">
              <button
                type="button"
                className={`member-chip ${selectedMember === "all" ? "active" : ""}`}
                onClick={() => setSelectedMember("all")}
              >
                <span className="avatar-circle">🌐</span>
                <span className="member-name">All Members ({teamTasks.length})</span>
              </button>
              {members.map((m) => {
                const count = teamTasks.filter((t) => t.assignee?.name === m.name && t.status !== "Completed").length;
                return (
                  <button
                    key={m.name}
                    type="button"
                    className={`member-chip ${selectedMember === m.name ? "active" : ""}`}
                    onClick={() => setSelectedMember(m.name)}
                    title={`${m.name} (${m.role})`}
                  >
                    <span className="avatar-circle">{m.avatar}</span>
                    <div className="member-info-col">
                      <span className="member-name">{m.name}</span>
                      <span className="member-role">{m.role}</span>
                    </div>
                    <span className={`member-load-badge ${count > 2 ? "high-load" : ""}`}>
                      {count} active
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Urgent Priority Dispatch Notice */}
          {urgentTasks.length > 0 && (
            <div className="priority-dispatch-banner">
              <div className="dispatch-header">
                <span className="fire-icon">🔥</span>
                <div>
                  <h4>Priority Dispatch Queue ({urgentTasks.length} Urgent Deliverables)</h4>
                  <p>These tasks are flagged as Critical/High priority and need to be tackled first by the team.</p>
                </div>
              </div>

              <div className="dispatch-grid">
                {urgentTasks.map((task) => (
                  <div key={task._id} className="dispatch-card">
                    <div className="dispatch-card-top">
                      <span className="badge-critical">🔴 Critical First</span>
                      <div className="assignee-pill-mini">
                        <span className="avatar-mini">{task.assignee?.avatar || "UN"}</span>
                        <span>{task.assignee?.name}</span>
                      </div>
                    </div>
                    <h5 className="dispatch-title">{task.title}</h5>
                    {task.description && <p className="dispatch-desc">{task.description}</p>}
                    <div className="dispatch-actions">
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task._id, e.target.value)}
                        className="status-select-mini"
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Review">In Review</option>
                        <option value="Completed">Completed</option>
                      </select>
                      <select
                        value={task.assignee?.name || ""}
                        onChange={(e) => handleReassign(task._id, e.target.value)}
                        className="assignee-select-mini"
                        title="Reassign to teammate"
                      >
                        {members.map((m) => (
                          <option key={m.name} value={m.name}>
                            Delegate to: {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Task Creation & All Tasks Grid */}
          <div className="team-split-grid">
            {/* Left: Create Shared Deliverable */}
            <div className="team-create-card">
              <h4>+ Create & Delegate Team Task</h4>
              <form onSubmit={handleCreateTeamTask}>
                <div className="form-group-team">
                  <label>Deliverable Title:</label>
                  <input
                    type="text"
                    placeholder="e.g. Implement WebSocket Real-Time Chat"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group-team">
                  <label>Technical Description:</label>
                  <textarea
                    placeholder="Specification, acceptance criteria, or PR notes..."
                    rows={2}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                </div>
                <div className="form-row-team">
                  <div className="form-group-team">
                    <label>Priority:</label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                    >
                      <option value="High">🔴 High (Tackle First)</option>
                      <option value="Medium">🟡 Medium (Normal Sprint)</option>
                      <option value="Low">🔵 Low (Maintenance)</option>
                    </select>
                  </div>
                  <div className="form-group-team">
                    <label>Assign To Teammate:</label>
                    <select
                      value={newAssigneeIndex}
                      onChange={(e) => setNewAssigneeIndex(parseInt(e.target.value, 10))}
                    >
                      {members.map((m, idx) => (
                        <option key={m.name} value={idx}>
                          {m.name} — {m.role}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group-team">
                  <label>Deadline Date:</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={submittingTask} className="btn-team-submit">
                  {submittingTask ? "Delegating..." : "🚀 Assign & Dispatch Task"}
                </button>
              </form>
            </div>

            {/* Right: All Distributed Tasks */}
            <div className="team-tasks-catalog">
              <div className="catalog-header">
                <h4>
                  Shared Team Deliverables ({filteredTasks.length})
                  {selectedMember !== "all" && <span className="filter-pill">Filter: {selectedMember}</span>}
                </h4>
                <div className="catalog-filters">
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="priority-filter-select"
                  >
                    <option value="all">All Priorities</option>
                    <option value="High">🔴 High Only</option>
                    <option value="Medium">🟡 Medium Only</option>
                    <option value="Low">🔵 Low Only</option>
                  </select>
                </div>
              </div>

              {filteredTasks.length === 0 ? (
                <div className="catalog-empty">No deliverables match this filter.</div>
              ) : (
                <div className="catalog-list">
                  {filteredTasks.map((task) => {
                    const isDone = task.status === "Completed";
                    const isHigh = task.priority === "High";

                    return (
                      <div
                        key={task._id}
                        className={`team-task-row ${isDone ? "task-done" : ""} ${isHigh && !isDone ? "border-urgent" : ""}`}
                      >
                        <div className="task-row-main">
                          <div className="task-row-top">
                            <span className={`badge-pill badge-${task.priority.toLowerCase()}`}>
                              {task.priority === "High" ? "🔴 High Priority" : task.priority}
                            </span>
                            <span className={`status-pill status-${task.status.toLowerCase().replace(" ", "-")}`}>
                              {task.status}
                            </span>
                            {task.dueDate && (
                              <span className="due-date-pill">
                                📅 {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>

                          <h5 className={`task-row-title ${isDone ? "title-strike" : ""}`}>{task.title}</h5>
                          {task.description && <p className="task-row-desc">{task.description}</p>}

                          {task.subtasks?.length > 0 && (
                            <div className="task-row-subtasks">
                              <span>
                                ☑ {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length} milestones complete
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Assignee & Controls Column */}
                        <div className="task-row-controls">
                          <div className="assignee-box">
                            <span className="avatar-chip">{task.assignee?.avatar || "UN"}</span>
                            <div>
                              <strong>{task.assignee?.name}</strong>
                              <span className="assignee-role-sub">{task.assignee?.role}</span>
                            </div>
                          </div>

                          <div className="task-row-actions">
                            <select
                              value={task.priority}
                              onChange={(e) => handlePriorityChange(task._id, e.target.value)}
                              className="priority-dropdown"
                              title="Update deliverable priority"
                            >
                              <option value="High">🔴 High</option>
                              <option value="Medium">🟡 Medium</option>
                              <option value="Low">🔵 Low</option>
                            </select>

                            <select
                              value={task.status}
                              onChange={(e) => handleStatusChange(task._id, e.target.value)}
                              className="status-dropdown"
                              title="Update team status"
                            >
                              <option value="Pending">Pending</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Review">In Review</option>
                              <option value="Completed">Completed</option>
                            </select>

                            <select
                              value={task.assignee?.name || ""}
                              onChange={(e) => handleReassign(task._id, e.target.value)}
                              className="reassign-dropdown"
                              title="Reassign to teammate"
                            >
                              {members.map((m) => (
                                <option key={m.name} value={m.name}>
                                  Reassign: {m.name}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              className="btn-delete-row"
                              onClick={() => handleDeleteTask(task._id)}
                              title="Delete task"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === "activity" ? (
        /* ==========================================================================
           TAB 2: LIVE CHANGE & AUDIT FEED ("Who is making what change")
           ========================================================================== */
        <div className="team-activity-container">
          <div className="activity-feed-header">
            <h4>🔄 Live Team Audit & Change Log</h4>
            <p>Real-time record of all status changes, task reassignments, priority updates, and team actions.</p>
          </div>

          {activities.length === 0 ? (
            <div className="catalog-empty">No activity recorded yet.</div>
          ) : (
            <div className="activity-timeline">
              {activities.map((act) => {
                const icon =
                  act.type === "create"
                    ? "✨"
                    : act.type === "priority"
                    ? "⚡"
                    : act.type === "assignee"
                    ? "👤"
                    : act.type === "message"
                    ? "🚨"
                    : act.type === "delete"
                    ? "🗑️"
                    : "🔄";

                return (
                  <div key={act._id} className="activity-timeline-item">
                    <span className="timeline-icon">{icon}</span>
                    <div className="timeline-content">
                      <div className="timeline-header-line">
                        <strong className="timeline-user">{act.userName}</strong>
                        <span className="timeline-action">{act.action}</span>
                        {act.taskTitle && <span className="timeline-task">"{act.taskTitle}"</span>}
                        <span className="timeline-time">
                          {new Date(act.createdAt).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          — {new Date(act.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      {act.details && <p className="timeline-details">{act.details}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ==========================================================================
           TAB 3: STANDUP SYNC & BLOCKER CHAT ("Proper Communication")
           ========================================================================== */
        <div className="team-communication-container">
          <div className="comm-header">
            <h4>💬 Team Standup Sync & Blocker Board</h4>
            <p>Asynchronous standup coordination: share progress, raise blockers, and align on deliverables.</p>
          </div>

          {/* Active Blocker Alert Section */}
          {activeBlockers.length > 0 && (
            <div className="blocker-alert-box">
              <div className="blocker-box-title">
                <span>🚨 Active Project Blockers ({activeBlockers.length})</span>
                <span className="blocker-sub">Urgent attention requested</span>
              </div>
              {activeBlockers.map((b) => (
                <div key={b._id} className="blocker-item">
                  <strong>{b.userName}:</strong> <span>{b.text}</span>
                  <span className="blocker-time">
                    {new Date(b.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Messages Stream */}
          <div className="messages-stream">
            {messages.map((msg) => (
              <div
                key={msg._id}
                className={`msg-bubble ${msg.isBlocker ? "msg-blocker" : ""}`}
              >
                <div className="msg-top-line">
                  <span className="msg-author">{msg.userName}</span>
                  {msg.isBlocker && <span className="badge-blocker-tag">🚨 BLOCKER</span>}
                  <span className="msg-time">
                    {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="msg-body">{msg.text}</div>
              </div>
            ))}
          </div>

          {/* Post Message Input Bar */}
          <form onSubmit={handlePostMessage} className="message-post-form">
            <input
              type="text"
              placeholder="Post a standup sync update, announcement, or blocker..."
              value={newMsgText}
              onChange={(e) => setNewMsgText(e.target.value)}
              className="msg-input"
            />
            <label className="blocker-checkbox" title="Flag as critical blocker">
              <input
                type="checkbox"
                checked={isBlocker}
                onChange={(e) => setIsBlocker(e.target.checked)}
              />
              <span>🚨 Flag Blocker</span>
            </label>
            <button type="submit" disabled={submittingMsg} className="btn-send-msg">
              {submittingMsg ? "Sending..." : "Send Update"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default TeamHub;
