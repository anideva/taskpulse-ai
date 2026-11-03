import { useEffect, useState, useCallback } from "react";
import API from "../services/api";
import soundEngine from "../services/soundEngine";

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

  // Filter, Search, Sort, View, & Theme States
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("list");
  const [theme, setTheme] = useState(
    localStorage.getItem("taskpulse_theme") || "light"
  );

  // Pomodoro Focus Timer State & Customization
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [pomoPreset, setPomoPreset] = useState("standard"); // "standard" (25/5) | "coding" (50/10) | "extended" (50/15) | "custom"
  const [customFocusMin, setCustomFocusMin] = useState(25);
  const [customBreakMin, setCustomBreakMin] = useState(5);
  const [pomoSessionsCompleted, setPomoSessionsCompleted] = useState(0); // Completed focus sprints counter
  const [pomoMinutes, setPomoMinutes] = useState(25);
  const [pomoSeconds, setPomoSeconds] = useState(0);
  const [pomoRunning, setPomoRunning] = useState(false);
  const [pomoMode, setPomoMode] = useState("focus"); // "focus" | "break" | "longBreak"
  const [pomoActiveTask, setPomoActiveTask] = useState(null);

  // Peaceful Instrumental & Ambient Sound States
  const [ambientPlaying, setAmbientPlaying] = useState(false);
  const [ambientSound, setAmbientSound] = useState("zen"); // "zen" | "rain" | "waves"
  const [ambientVolume, setAmbientVolume] = useState(0.4);
  const [autoSound, setAutoSound] = useState(true); // Automatically run sound throughout focus sprints

  // Feedback states
  const [copiedStandup, setCopiedStandup] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const getFocusDuration = useCallback(() => {
    if (pomoPreset === "coding" || pomoPreset === "extended") return 50;
    if (pomoPreset === "custom") return Math.max(1, parseInt(customFocusMin, 10) || 25);
    return 25; // standard
  }, [pomoPreset, customFocusMin]);

  const getBreakDuration = useCallback(() => {
    if (pomoPreset === "coding") return 10;
    if (pomoPreset === "extended") return 15;
    if (pomoPreset === "custom") return Math.max(1, parseInt(customBreakMin, 10) || 5);
    return 5; // standard
  }, [pomoPreset, customBreakMin]);

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

  // Pomodoro Timer Countdown Effect with 4-Session Long Break Automation
  useEffect(() => {
    let interval = null;
    if (pomoRunning) {
      interval = setInterval(() => {
        setPomoSeconds((prevSec) => {
          if (prevSec > 0) {
            return prevSec - 1;
          }
          setPomoMinutes((prevMin) => {
            if (prevMin > 0) {
              return prevMin - 1;
            }
            // Timer expired!
            setPomoRunning(false);
            soundEngine.stopAmbient();
            setAmbientPlaying(false);
            soundEngine.playChime();

            if (pomoMode === "focus") {
              const nextCount = pomoSessionsCompleted + 1;
              setPomoSessionsCompleted(nextCount);
              // Every 4 focus sessions trigger an automated 30m long break
              if (nextCount % 4 === 0) {
                setPomoMode("longBreak");
                return 30; // 30 mins
              } else {
                setPomoMode("break");
                return getBreakDuration();
              }
            } else {
              // Coming from break or longBreak -> transition back to focus
              setPomoMode("focus");
              return getFocusDuration();
            }
          });
          return 59;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [pomoRunning, pomoMode, pomoSessionsCompleted, getBreakDuration, getFocusDuration]);

  // Synchronize continuous ambient sound throughout the entire sprint session
  useEffect(() => {
    if (pomoRunning && pomoMode === "focus" && autoSound) {
      soundEngine.startAmbient(ambientSound, ambientVolume);
      setAmbientPlaying(true);
    } else if (!pomoRunning && autoSound && ambientPlaying) {
      soundEngine.stopAmbient();
      setAmbientPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomoRunning, pomoMode, autoSound]);

  // Preset Switcher Handler
  const handleApplyPreset = (presetName) => {
    setPomoPreset(presetName);
    setPomoRunning(false);
    if (pomoMode === "focus") {
      let mins = 25;
      if (presetName === "coding" || presetName === "extended") mins = 50;
      else if (presetName === "custom") mins = Math.max(1, parseInt(customFocusMin, 10) || 25);
      setPomoMinutes(mins);
      setPomoSeconds(0);
    } else if (pomoMode === "break") {
      let mins = 5;
      if (presetName === "coding") mins = 10;
      else if (presetName === "extended") mins = 15;
      else if (presetName === "custom") mins = Math.max(1, parseInt(customBreakMin, 10) || 5);
      setPomoMinutes(mins);
      setPomoSeconds(0);
    }
  };

  // Ambient Sound Controls
  const toggleAmbientSound = () => {
    if (ambientPlaying) {
      soundEngine.stopAmbient();
      setAmbientPlaying(false);
    } else {
      soundEngine.startAmbient(ambientSound, ambientVolume);
      setAmbientPlaying(true);
    }
  };

  const handleSoundChange = (newSound) => {
    setAmbientSound(newSound);
    if (ambientPlaying) {
      soundEngine.startAmbient(newSound, ambientVolume);
    }
  };

  const handleVolumeChange = (newVol) => {
    setAmbientVolume(newVol);
    soundEngine.setVolume(newVol);
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem("taskpulse_theme", newTheme);
  };

  const isTaskDueToday = (task) => {
    if (task.isFocusToday) return true;
    if (!task.dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(task.dueDate);
    deadline.setHours(0, 0, 0, 0);
    return deadline <= today;
  };

  const toggleFocusToday = async (task, e) => {
    if (e) e.stopPropagation();
    try {
      await API.put(`/tasks/${task._id}`, {
        isFocusToday: !task.isFocusToday,
      });
      fetchTasks();
    } catch (err) {
      setErrorMsg("Failed to update daily focus state");
    }
  };

  const startPomoForTask = (task, e) => {
    if (e) e.stopPropagation();
    setPomoActiveTask(task.title);
    setShowPomodoro(true);
    setPomoMode("focus");
    setPomoMinutes(getFocusDuration());
    setPomoSeconds(0);
    setPomoRunning(true);
  };

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
        isFocusToday: filter === "today",
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
    if (!taskDueDate) return { label: "No deadline", color: "#6c757d", bg: "rgba(108, 117, 125, 0.12)" };
    if (isCompleted) return { label: "Completed", color: "#2e7d32", bg: "rgba(46, 125, 50, 0.12)" };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(taskDueDate);
    deadline.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: `Overdue by ${Math.abs(diffDays)}d`, color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" };
    }
    if (diffDays === 0) {
      return { label: "Due Today", color: "#f97316", bg: "rgba(249, 115, 22, 0.15)" };
    }
    if (diffDays <= 3) {
      return { label: `Due in ${diffDays}d`, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" };
    }
    return {
      label: `Due ${new Date(taskDueDate).toLocaleDateString()}`,
      color: "#0d9488",
      bg: "rgba(13, 148, 136, 0.15)",
    };
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case "High":
        return { color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", label: "High Priority" };
      case "Low":
        return { color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)", label: "Low Priority" };
      default:
        return { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)", label: "Medium Priority" };
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

  // Filter and Sort Processed Tasks
  const processedTasks = tasks
    .filter((task) => {
      if (filter === "today" && !isTaskDueToday(task)) return false;
      if (filter === "pending" && task.status === "completed") return false;
      if (filter === "completed" && task.status !== "completed") return false;
      if (filter === "high" && task.priority !== "High") return false;

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

  // Analytics Metrics
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

  const todayTasks = tasks.filter(isTaskDueToday);
  const todayCompletedCount = todayTasks.filter((t) => t.status === "completed").length;

  return (
    <div className={`app-wrapper theme-${theme}`}>
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

          <div className="header-right-actions">
            {/* Theme Selector */}
            <div className="theme-switcher">
              <button
                type="button"
                className={`theme-pill ${theme === "light" ? "active" : ""}`}
                onClick={() => handleThemeChange("light")}
                title="Light Studio Theme"
              >
                ☀️ Light
              </button>
              <button
                type="button"
                className={`theme-pill ${theme === "slate" ? "active" : ""}`}
                onClick={() => handleThemeChange("slate")}
                title="Slate Gray Theme"
              >
                🌫️ Slate
              </button>
              <button
                type="button"
                className={`theme-pill ${theme === "midnight" ? "active" : ""}`}
                onClick={() => handleThemeChange("midnight")}
                title="Midnight Obsidian Theme"
              >
                🌙 Dark
              </button>
            </div>

            {/* Pomodoro Toggle */}
            <button
              type="button"
              className={`pomo-toggle-btn ${showPomodoro ? "active" : ""}`}
              onClick={() => setShowPomodoro(!showPomodoro)}
              title="Toggle Pomodoro Timer"
            >
              ⏱️ {pomoRunning ? `${pomoMinutes}:${String(pomoSeconds).padStart(2, "0")}` : "Focus Timer"}
            </button>

            <button type="button" className="logout-btn" onClick={onLogout}>
              Sign Out
            </button>
          </div>
        </header>

        {/* Pomodoro Focus Studio Widget */}
        {showPomodoro && (
          <div className="pomodoro-widget">
            <div className="pomodoro-header">
              <div className="pomodoro-title">
                <span className="pomo-clock-icon">⏱️</span>
                <strong>Pomodoro Focus Studio</strong>
                <span className={`pomodoro-mode-badge ${pomoMode}`}>
                  {pomoMode === "focus"
                    ? `🎯 Focus Sprint (${getFocusDuration()}m)`
                    : pomoMode === "break"
                    ? `☕ Short Break (${getBreakDuration()}m)`
                    : "🎉 30m Long Recharge Break"}
                </span>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowPomodoro(false)}
                title="Minimize Timer"
              >
                ✕
              </button>
            </div>

            {/* Sprint Cycle & 4th Session Long Break Indicator */}
            <div className="pomodoro-cycle-bar">
              <div className="cycle-indicator">
                <span className="cycle-label">Sprint Cycle:</span>
                <div className="cycle-dots">
                  {[1, 2, 3, 4].map((num) => {
                    const currentInCycle =
                      (pomoSessionsCompleted % 4) ||
                      (pomoSessionsCompleted > 0 && pomoMode === "longBreak" ? 4 : 0);
                    const isDone = num <= currentInCycle;
                    return (
                      <span
                        key={num}
                        className={`cycle-dot ${isDone ? "completed" : ""}`}
                        title={`Sprint ${num} of 4`}
                      >
                        {isDone ? "🍅" : "⚪"}
                      </span>
                    );
                  })}
                </div>
                <span className="cycle-text">
                  {pomoMode === "longBreak"
                    ? "🎉 4 Sprints Complete! Enjoy your 30m Long Break!"
                    : `${pomoSessionsCompleted % 4}/4 sprints completed (30m long break after 4th)`}
                </span>
              </div>
            </div>

            {/* Presets Selector */}
            <div className="pomodoro-presets">
              <span className="preset-label">Mode:</span>
              <button
                type="button"
                className={`preset-pill ${pomoPreset === "standard" ? "active" : ""}`}
                onClick={() => handleApplyPreset("standard")}
                title="General Tasks: 25m focus / 5m break"
              >
                ⚡ General (25m / 5m)
              </button>
              <button
                type="button"
                className={`preset-pill ${pomoPreset === "coding" ? "active" : ""}`}
                onClick={() => handleApplyPreset("coding")}
                title="Coding & Deep Work: 50m focus / 10m break"
              >
                💻 Coding & Deep (50m / 10m)
              </button>
              <button
                type="button"
                className={`preset-pill ${pomoPreset === "extended" ? "active" : ""}`}
                onClick={() => handleApplyPreset("extended")}
                title="Extended Sprint: 50m focus / 15m break"
              >
                🧠 Deep Sprint (50m / 15m)
              </button>
              <button
                type="button"
                className={`preset-pill ${pomoPreset === "custom" ? "active" : ""}`}
                onClick={() => handleApplyPreset("custom")}
                title="Custom Duration"
              >
                ⚙️ Custom
              </button>
            </div>

            {/* Custom Inputs (if custom preset chosen) */}
            {pomoPreset === "custom" && (
              <div className="pomodoro-custom-row">
                <div className="custom-input-group">
                  <label>Focus (mins):</label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={customFocusMin}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 25;
                      setCustomFocusMin(val);
                      if (pomoMode === "focus" && !pomoRunning) {
                        setPomoMinutes(val);
                        setPomoSeconds(0);
                      }
                    }}
                  />
                </div>
                <div className="custom-input-group">
                  <label>Break (mins):</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={customBreakMin}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 5;
                      setCustomBreakMin(val);
                      if (pomoMode === "break" && !pomoRunning) {
                        setPomoMinutes(val);
                        setPomoSeconds(0);
                      }
                    }}
                  />
                </div>
              </div>
            )}

            <div className="pomodoro-body">
              <div className="pomodoro-time-display">
                {String(pomoMinutes).padStart(2, "0")}:{String(pomoSeconds).padStart(2, "0")}
              </div>

              {pomoActiveTask && (
                <div className="pomodoro-task-target">
                  🎯 Focused on: <span>{pomoActiveTask}</span>
                </div>
              )}

              <div className="pomodoro-actions">
                <button
                  type="button"
                  className={`pomo-btn ${pomoRunning ? "pomo-pause" : "pomo-start"}`}
                  onClick={() => setPomoRunning(!pomoRunning)}
                >
                  {pomoRunning ? "⏸ Pause" : "▶ Start Sprint"}
                </button>
                <button
                  type="button"
                  className="pomo-btn pomo-reset"
                  onClick={() => {
                    setPomoRunning(false);
                    if (pomoMode === "focus") {
                      setPomoMinutes(getFocusDuration());
                    } else if (pomoMode === "break") {
                      setPomoMinutes(getBreakDuration());
                    } else {
                      setPomoMinutes(30);
                    }
                    setPomoSeconds(0);
                  }}
                >
                  ↺ Reset
                </button>
                <button
                  type="button"
                  className="pomo-btn pomo-switch"
                  onClick={() => {
                    setPomoRunning(false);
                    if (pomoMode === "focus") {
                      setPomoMode("break");
                      setPomoMinutes(getBreakDuration());
                    } else {
                      setPomoMode("focus");
                      setPomoMinutes(getFocusDuration());
                    }
                    setPomoSeconds(0);
                  }}
                >
                  {pomoMode === "focus"
                    ? `Switch to Break (${getBreakDuration()}m)`
                    : `Switch to Focus (${getFocusDuration()}m)`}
                </button>
              </div>
            </div>

            {/* Peaceful Instrumental & Ambient Music Bar */}
            <div className="pomodoro-audio-bar">
              <div className="audio-bar-left">
                <button
                  type="button"
                  className={`audio-toggle-btn ${ambientPlaying ? "playing" : ""}`}
                  onClick={toggleAmbientSound}
                  title="Toggle continuous ambient sound manually"
                >
                  {ambientPlaying ? "🔊 Sound: Playing" : "🔈 Sound: Off"}
                </button>
                <div className="audio-sound-picker">
                  <button
                    type="button"
                    className={`sound-pill ${ambientSound === "zen" ? "active" : ""}`}
                    onClick={() => handleSoundChange("zen")}
                  >
                    🎶 Zen Chords
                  </button>
                  <button
                    type="button"
                    className={`sound-pill ${ambientSound === "rain" ? "active" : ""}`}
                    onClick={() => handleSoundChange("rain")}
                  >
                    🌧️ Gentle Rain
                  </button>
                  <button
                    type="button"
                    className={`sound-pill ${ambientSound === "waves" ? "active" : ""}`}
                    onClick={() => handleSoundChange("waves")}
                  >
                    🌊 Ocean Waves
                  </button>
                </div>
              </div>

              <div className="audio-bar-right">
                <label
                  className="auto-sound-toggle"
                  title="Sound runs continuously throughout your entire focus session"
                >
                  <input
                    type="checkbox"
                    checked={autoSound}
                    onChange={(e) => setAutoSound(e.target.checked)}
                  />
                  <span>Run throughout sprint</span>
                </label>
                <span className="vol-icon" title="Volume">
                  🔉
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={ambientVolume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="vol-slider"
                  title={`Volume: ${Math.round(ambientVolume * 100)}%`}
                />
                <button
                  type="button"
                  className="btn-chime-test"
                  onClick={() => soundEngine.playChime()}
                  title="Test session completion bell chime"
                >
                  🔔 Test Bell
                </button>
              </div>
            </div>

            {/* Continuous Sound Status Banner */}
            {ambientPlaying && (
              <div className="ambient-live-banner">
                <span className="live-pulse-dot">●</span>
                <span>
                  Soundscape active:{" "}
                  <strong>
                    {ambientSound === "zen"
                      ? "🎶 Peaceful Zen Chords (Continuous Progression)"
                      : ambientSound === "rain"
                      ? "🌧️ Gentle Rain (Continuous Scape)"
                      : "🌊 Ocean Waves (Continuous Tide)"}
                  </strong>{" "}
                  — running continuously throughout your focus sprint.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="alert-error">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg("")} className="close-btn">
              ✕
            </button>
          </div>
        )}

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
              style={{ color: highPriorityCount > 0 ? "#f97316" : "var(--text-muted)" }}
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
                      ? "#22c55e"
                      : completionRate >= 50
                      ? "#3b82f6"
                      : "#f97316",
                }}
              />
            </div>
            <span
              className="metric-sub"
              style={{ color: overdueCount > 0 ? "#ef4444" : "#22c55e" }}
            >
              {overdueCount > 0
                ? `🚨 ${overdueCount} overdue`
                : "All deadlines on track"}
            </span>
          </div>
        </div>

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
              type="button"
              className={`filter-btn ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              All ({tasks.length})
            </button>
            <button
              type="button"
              className={`filter-btn filter-today-btn ${filter === "today" ? "active" : ""}`}
              onClick={() => setFilter("today")}
            >
              ☀️ Today ({todayTasks.length})
            </button>
            <button
              type="button"
              className={`filter-btn ${filter === "pending" ? "active" : ""}`}
              onClick={() => setFilter("pending")}
            >
              Pending ({tasks.filter((t) => t.status !== "completed").length})
            </button>
            <button
              type="button"
              className={`filter-btn ${filter === "completed" ? "active" : ""}`}
              onClick={() => setFilter("completed")}
            >
              Completed ({tasks.filter((t) => t.status === "completed").length})
            </button>
            <button
              type="button"
              className={`filter-btn ${filter === "high" ? "active" : ""}`}
              onClick={() => setFilter("high")}
            >
              High Priority ({tasks.filter((t) => t.priority === "High").length})
            </button>
          </div>
        </div>

        {/* Today's Focus Agenda Banner */}
        {filter === "today" && (
          <div className="today-agenda-banner">
            <div className="today-banner-content">
              <span className="today-banner-icon">☀️</span>
              <div>
                <h4>Today's Focus Agenda</h4>
                <p>
                  {new Date().toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  — {todayCompletedCount} of {todayTasks.length} daily goals completed
                </p>
              </div>
            </div>
            {todayTasks.length > 0 && (
              <div className="today-banner-progress">
                <div
                  className="today-banner-fill"
                  style={{
                    width: `${todayTasks.length > 0 ? (todayCompletedCount / todayTasks.length) * 100 : 0}%`,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* MAIN VIEW: LIST OR KANBAN */}
        {processedTasks.length === 0 ? (
          <div className="empty-state">
            <h4>No tasks found</h4>
            <p>
              {searchQuery
                ? `No tasks match your search "${searchQuery}".`
                : filter === "today"
                ? "No tasks scheduled for today! Click ☀️ on any task below to add it to Today's Agenda."
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
                          backgroundColor: isCompleted
                            ? "rgba(34, 197, 94, 0.15)"
                            : "rgba(249, 115, 22, 0.15)",
                          color: isCompleted ? "#22c55e" : "#f97316",
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
                                subtaskPercentage === 100 ? "#22c55e" : "#3b82f6",
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
                      type="button"
                      className={`btn-action btn-focus-today ${
                        task.isFocusToday ? "active" : ""
                      }`}
                      onClick={(e) => toggleFocusToday(task, e)}
                      title="Toggle Pin to Today's Focus"
                    >
                      ☀️ {task.isFocusToday ? "In Today" : "Focus Today"}
                    </button>
                    <button
                      type="button"
                      className="btn-action btn-pomo-start"
                      onClick={(e) => startPomoForTask(task, e)}
                      title={`Start ${getFocusDuration()}m Focus Sprint on this task`}
                    >
                      🎯 Focus ({getFocusDuration()}m)
                    </button>
                    <button
                      type="button"
                      className={`btn-action ${
                        isCompleted ? "btn-reopen" : "btn-complete"
                      }`}
                      onClick={() => toggleTaskStatus(task)}
                    >
                      {isCompleted ? "Mark as Pending" : "Mark as Completed"}
                    </button>
                    <button
                      type="button"
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
                              type="button"
                              className={`btn-action btn-focus-mini ${
                                task.isFocusToday ? "active" : ""
                              }`}
                              onClick={(e) => toggleFocusToday(task, e)}
                              title="Pin to Today"
                            >
                              ☀️
                            </button>
                            <button
                              type="button"
                              className="btn-action btn-pomo-mini"
                              onClick={(e) => startPomoForTask(task, e)}
                              title={`Start ${getFocusDuration()}m Focus Sprint`}
                            >
                              🎯 {getFocusDuration()}m
                            </button>
                            <button
                              type="button"
                              className="btn-action btn-complete"
                              onClick={() => toggleTaskStatus(task)}
                              title="Mark Completed"
                            >
                              ✓ Done →
                            </button>
                            <button
                              type="button"
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
                            <span
                              className="badge"
                              style={{
                                backgroundColor: "rgba(34, 197, 94, 0.15)",
                                color: "#22c55e",
                              }}
                            >
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
                              type="button"
                              className="btn-action btn-reopen"
                              onClick={() => toggleTaskStatus(task)}
                              title="Reopen Task"
                            >
                              ← Reopen
                            </button>
                            <button
                              type="button"
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
    </div>
  );
}

export default Tasks;
