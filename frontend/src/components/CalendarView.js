import React, { useState, useMemo } from "react";

function CalendarView({
  tasks,
  onToggleTask,
  onToggleFocusToday,
  onStartPomo,
  onDeleteTask,
  onSelectDateToCreate,
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const jumpToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    setSelectedDateKey(`${y}-${m}-${d}`);
  };

  // Group tasks by "YYYY-MM-DD"
  const { tasksByDate, unscheduledTasks } = useMemo(() => {
    const map = {};
    const unscheduled = [];

    tasks.forEach((task) => {
      if (!task.dueDate) {
        unscheduled.push(task);
        return;
      }
      const d = new Date(task.dueDate);
      if (isNaN(d.getTime())) {
        unscheduled.push(task);
        return;
      }
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${day}`;

      if (!map[key]) map[key] = [];
      map[key].push(task);
    });

    return { tasksByDate: map, unscheduledTasks: unscheduled };
  }, [tasks]);

  // Generate calendar grid days
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // 1. Previous month trailing padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, d);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, "0");
      const dayStr = String(d).padStart(2, "0");
      days.push({
        dayNumber: d,
        dateKey: `${y}-${m}-${dayStr}`,
        isCurrentMonth: false,
        isPrevMonth: true,
      });
    }

    // 2. Current month active days
    const todayStr = (() => {
      const t = new Date();
      return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    })();

    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const mStr = String(month + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      const dateKey = `${year}-${mStr}-${dStr}`;
      days.push({
        dayNumber: d,
        dateKey,
        isCurrentMonth: true,
        isToday: dateKey === todayStr,
      });
    }

    // 3. Next month trailing padding days to fill 35 or 42 cells
    const remainingCells = 35 - days.length >= 0 ? 35 - days.length : 42 - days.length;
    for (let d = 1; d <= remainingCells; d++) {
      const nextDate = new Date(year, month + 1, d);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, "0");
      const dayStr = String(d).padStart(2, "0");
      days.push({
        dayNumber: d,
        dateKey: `${y}-${m}-${dayStr}`,
        isCurrentMonth: false,
        isNextMonth: true,
      });
    }

    return days;
  }, [year, month]);

  const selectedDateTasks = tasksByDate[selectedDateKey] || [];

  const formattedSelectedDate = useMemo(() => {
    if (!selectedDateKey) return "";
    const [y, m, d] = selectedDateKey.split("-");
    const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    return dateObj.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedDateKey]);

  return (
    <div className="calendar-view-container">
      {/* Calendar Top Navigation Header */}
      <div className="calendar-header-bar">
        <div className="calendar-nav-controls">
          <h3 className="calendar-month-title">
            {monthNames[month]} <span className="calendar-year">{year}</span>
          </h3>
          <div className="calendar-btn-group">
            <button
              type="button"
              className="cal-btn"
              onClick={prevMonth}
              title="Previous Month"
            >
              ‹
            </button>
            <button
              type="button"
              className="cal-btn cal-btn-today"
              onClick={jumpToToday}
              title="Jump to Today"
            >
              Today
            </button>
            <button
              type="button"
              className="cal-btn"
              onClick={nextMonth}
              title="Next Month"
            >
              ›
            </button>
          </div>
        </div>

        <div className="calendar-legend">
          <span className="legend-item"><span className="legend-dot dot-high" /> High</span>
          <span className="legend-item"><span className="legend-dot dot-medium" /> Medium</span>
          <span className="legend-item"><span className="legend-dot dot-low" /> Low</span>
          <span className="legend-item"><span className="legend-dot dot-done" /> Completed</span>
        </div>
      </div>

      {/* 7-Day Grid Header */}
      <div className="calendar-weekdays-row">
        {dayNames.map((day) => (
          <div key={day} className="calendar-weekday-cell">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days Matrix */}
      <div className="calendar-grid-matrix">
        {calendarDays.map((cell) => {
          const cellTasks = tasksByDate[cell.dateKey] || [];
          const isSelected = cell.dateKey === selectedDateKey;

          return (
            <div
              key={cell.dateKey}
              className={`calendar-day-cell ${
                !cell.isCurrentMonth ? "other-month" : ""
              } ${cell.isToday ? "today-cell" : ""} ${
                isSelected ? "selected-cell" : ""
              }`}
              onClick={() => setSelectedDateKey(cell.dateKey)}
            >
              <div className="day-cell-top">
                <span className={`day-number ${cell.isToday ? "today-badge" : ""}`}>
                  {cell.dayNumber}
                </span>
                {cellTasks.length > 0 && (
                  <span className="day-task-count">{cellTasks.length}</span>
                )}
              </div>

              {/* Task Chips on Calendar Day */}
              <div className="day-task-chips">
                {cellTasks.slice(0, 3).map((task) => {
                  const isDone = task.status === "completed";
                  const priorityClass = task.priority
                    ? task.priority.toLowerCase()
                    : "medium";

                  return (
                    <div
                      key={task._id}
                      className={`task-chip priority-${priorityClass} ${
                        isDone ? "chip-done" : ""
                      }`}
                      title={`${task.title} (${task.priority} Priority)`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDateKey(cell.dateKey);
                      }}
                    >
                      <span className="chip-bullet">
                        {isDone ? "✓" : "●"}
                      </span>
                      <span className="chip-title">{task.title}</span>
                    </div>
                  );
                })}
                {cellTasks.length > 3 && (
                  <div className="chip-more">
                    +{cellTasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Day Deliverables Inspector Panel */}
      <div className="calendar-day-inspector">
        <div className="inspector-header">
          <div className="inspector-title">
            <span className="cal-pin-icon">📌</span>
            <div>
              <h4>{formattedSelectedDate}</h4>
              <p>
                {selectedDateTasks.length} {selectedDateTasks.length === 1 ? "deliverable" : "deliverables"} scheduled
              </p>
            </div>
          </div>

          {onSelectDateToCreate && (
            <button
              type="button"
              className="cal-btn-schedule"
              onClick={() => onSelectDateToCreate(selectedDateKey)}
              title="Schedule a new task for this day"
            >
              + Schedule Task on {selectedDateKey}
            </button>
          )}
        </div>

        {selectedDateTasks.length === 0 ? (
          <div className="inspector-empty">
            <p>No deliverables due on this date. Click "+ Schedule Task" above to plan a task.</p>
          </div>
        ) : (
          <div className="inspector-tasks-list">
            {selectedDateTasks.map((task) => {
              const isCompleted = task.status === "completed";
              const subtaskCount = task.subtasks?.length || 0;
              const completedSubtasks =
                task.subtasks?.filter((st) => st.completed).length || 0;

              return (
                <div
                  key={task._id}
                  className={`inspector-task-item ${
                    isCompleted ? "task-completed" : ""
                  }`}
                >
                  <div className="inspector-task-left">
                    <button
                      type="button"
                      className={`check-round-btn ${isCompleted ? "checked" : ""}`}
                      onClick={() => onToggleTask(task)}
                      title={isCompleted ? "Mark Pending" : "Mark Completed"}
                    >
                      {isCompleted ? "✓" : ""}
                    </button>
                    <div>
                      <h5 className={isCompleted ? "title-strike" : ""}>
                        {task.title}
                      </h5>
                      {task.description && (
                        <p className="task-desc-mini">{task.description}</p>
                      )}
                      <div className="inspector-task-tags">
                        <span className={`badge-pill badge-${task.priority?.toLowerCase()}`}>
                          {task.priority}
                        </span>
                        {subtaskCount > 0 && (
                          <span className="badge-pill badge-subtasks">
                            ☑ {completedSubtasks}/{subtaskCount} subtasks
                          </span>
                        )}
                        {task.isFocusToday && (
                          <span className="badge-pill badge-today">☀️ In Today</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="inspector-task-actions">
                    <button
                      type="button"
                      className="btn-action btn-pomo-mini"
                      onClick={(e) => onStartPomo(task, e)}
                      title="Focus sprint on this task"
                    >
                      🎯 Focus
                    </button>
                    <button
                      type="button"
                      className={`btn-action btn-focus-mini ${
                        task.isFocusToday ? "active" : ""
                      }`}
                      onClick={(e) => onToggleFocusToday(task, e)}
                      title="Pin to Today's Focus"
                    >
                      ☀️
                    </button>
                    <button
                      type="button"
                      className="btn-action btn-delete"
                      onClick={() => onDeleteTask(task._id)}
                      title="Delete task"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Unscheduled Backlog Milestone Drawer */}
      {unscheduledTasks.length > 0 && (
        <div className="unscheduled-drawer">
          <div className="unscheduled-header">
            <strong>📦 Unscheduled Milestones ({unscheduledTasks.length})</strong>
            <span className="unscheduled-sub">Tasks without an assigned deadline date</span>
          </div>
          <div className="unscheduled-chips-row">
            {unscheduledTasks.map((t) => (
              <div
                key={t._id}
                className="unscheduled-chip"
                onClick={() => {
                  if (onSelectDateToCreate) onSelectDateToCreate(selectedDateKey);
                }}
                title={`Click to set due date to ${selectedDateKey}`}
              >
                <span>{t.title}</span>
                <span className="chip-priority-dot" data-priority={t.priority} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarView;
