import { useEffect, useState } from "react";
import API from "../services/api";

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [generatedSubtasks, setGeneratedSubtasks] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);


  const fetchTasks = async () => {
    const res = await API.get("/tasks");
    setTasks(res.data);
  };

  const addTask = async (e) => {
    e.preventDefault();
   await API.post("/tasks", { title, dueDate });
    setTitle("");
    fetchTasks();
  };

  const generateSubtasks = async () => {

  try {

    setLoadingAI(true);

    const res = await API.post(
      "/ai/generate-subtasks",
      {
        taskTitle: title,
        description: title,
        deadline: dueDate,
      }
    );

    setGeneratedSubtasks(res.data);

  } catch (error) {

    console.log(error);

  } finally {

    setLoadingAI(false);

  }
};


  const completeTask = async (id) => {
    await API.put(`/tasks/${id}`, { status: "completed" });
    fetchTasks();
  };

  const deleteTask = async (id) => {
    await API.delete(`/tasks/${id}`);
    fetchTasks();
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const getDeadlineColor = (dueDate) => {
  if (!dueDate) return "#ffffff";

  const today = new Date();
  const deadline = new Date(dueDate);
  const diffDays =
    (deadline - today) / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return "#ffe5e5";       // overdue
  if (diffDays <= 3) return "#fff4cc";      // due soon
  return "#e6fffa";                         // future
};


  return (
    <div className="container">
       <button
      style={{
        position: "absolute",
        top: "20px",
        right: "20px",
        background: "#dc3545",
        color: "white",
        border: "none",
        padding: "8px 14px",
        borderRadius: "6px",
        cursor: "pointer",
      }}
      onClick={() => {
        localStorage.removeItem("token");
        window.location.reload();
      }}
    >
      Logout
    </button>

    <h3>My Tasks</h3>

<div className="task-form">
  <h4>Create New Task</h4>

  <form onSubmit={addTask} className="task-input">
  <input
    placeholder="New task title"
    value={title}
    onChange={(e) => setTitle(e.target.value)}
    required
  />

  <input
    type="date"
    value={dueDate}
    onChange={(e) => setDueDate(e.target.value)}
  />

  <button type="submit">Add</button>

    <button
    type="button"
    onClick={generateSubtasks}
    disabled={loadingAI}
  >
    {loadingAI
      ? "Generating..."
      : "✨ Generate with AI"}
  </button>
</form>
{generatedSubtasks.length > 0 && (
  <div className="ai-subtasks">
    <h5>AI Suggested Subtasks</h5>

    {generatedSubtasks.map((subtask, index) => (
      <div key={index}>
        • {subtask}
      </div>
    ))}
  </div>
)}

      <div>
  {tasks.length === 0 ? (
    <div className="empty-state">
      <h3>No tasks yet</h3>
      <p>Create your first task and stay organized.</p>
    </div>
  ) : (
    tasks.map((task) => (
    <div
  className="task-item"
  key={task._id}
  style={{ backgroundColor: getDeadlineColor(task.dueDate) }}
>

      <div>
        <strong>{task.title}</strong>
        <div
  style={{
    color:
      task.status === "completed"
        ? "green"
        : "#f39c12",
    fontWeight: "bold",
  }}
>
  {task.status === "completed"
    ? "🟢 Completed"
    : "🟡 Pending"}
</div>
        <div>
          Deadline:{" "}
          {task.dueDate
            ? new Date(task.dueDate).toLocaleDateString()
            : "Not set"}
        </div>
      </div>

      <div className="task-buttons">
        {task.status !== "completed" && (
          <button onClick={() => completeTask(task._id)}>
            Complete
          </button>
        )}
        <button onClick={() => deleteTask(task._id)}>
          Delete
        </button>
      </div>
    </div>
  ))
)}
</div>
</div>
</div>
  );
}

export default Tasks;
