// API base URL
const API_BASE = "http://localhost:5001/api"; // adjust if your backend uses 5000 instead

// Globals
let currentUser = null;
let authToken = null;

// Check which page we're on
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  if (path.endsWith("register.html")) {
    setupRegister();
  } else if (path.endsWith("login.html")) {
    setupLogin();
  } else if (path.endsWith("dashboard.html")) {
    checkAuth();
    setupDashboard();
  }
});

// ---------------- REGISTER ----------------
function setupRegister() {
  const registerForm = document.getElementById("register-form");
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if (!name || !username || !password) {
      alert("Please fill in all fields");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Registration successful! You can now log in.");
        window.location.href = "login.html";
      } else {
        alert(`Registration failed: ${data.message}`);
      }
    } catch (err) {
      console.error("Registration error:", err);
      alert("Error during registration. Try again later.");
    }
  });
}

// ---------------- LOGIN ----------------
function setupLogin() {
  const loginForm = document.getElementById("login-form");
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;

    if (!username || !password) {
      alert("Please enter both fields");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        authToken = data.token;
        currentUser = data.user;

        localStorage.setItem("authToken", authToken);
        localStorage.setItem("currentUser", JSON.stringify(currentUser));

        alert(`Welcome, ${currentUser.name}`);
        window.location.href = "dashboard.html";
      } else {
        alert(`Login failed: ${data.message}`);
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Error during login. Try again later.");
    }
  });
}

// ---------------- DASHBOARD ----------------
function setupDashboard() {
  const logoutBtn = document.getElementById("logout-btn");
  const taskForm = document.getElementById("task-form");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutUser);
  }

  if (taskForm) {
    taskForm.addEventListener("submit", createTask);
  }

  // Show user info
  const userInfo = document.getElementById("user-info");
  if (userInfo && currentUser) {
    userInfo.textContent = `Welcome, ${currentUser.name}`;
  }

  // Load tasks
  loadTasks();
}

function checkAuth() {
  const token = localStorage.getItem("authToken");
  const user = localStorage.getItem("currentUser");

  if (!token || !user) {
    window.location.href = "login.html";
    return;
  }

  authToken = token;
  currentUser = JSON.parse(user);
}

// ---------------- TASKS ----------------
async function createTask(e) {
  e.preventDefault();

  const name = document.getElementById("task-name").value;
  const description = document.getElementById("task-desc").value;
  const dueDate = document.getElementById("task-date").value;

  if (!name) {
    alert("Task name is required");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name,
        description,
        dueDate,
        user: currentUser.username,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      alert("Task created!");
      document.getElementById("task-form").reset();
      loadTasks();
    } else {
      alert(`Error creating task: ${data.message}`);
    }
  } catch (err) {
    console.error("Task creation error:", err);
    alert("Failed to create task.");
  }
}

async function loadTasks() {
  const tasksList = document.getElementById("tasks-list");
  if (!tasksList) return;

  try {
    const res = await fetch(`${API_BASE}/tasks/${currentUser.username}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const tasks = await res.json();

    if (res.ok) {
      renderTasks(tasks);
    } else {
      tasksList.innerHTML = "<p>Could not load tasks.</p>";
    }
  } catch (err) {
    console.error("Error loading tasks:", err);
  }
}

function renderTasks(tasks) {
  const tasksList = document.getElementById("tasks-list");
  tasksList.innerHTML = "";

  if (!tasks.length) {
    tasksList.innerHTML = "<p>No tasks yet.</p>";
    return;
  }

  tasks.forEach((task) => {
    const taskDiv = document.createElement("div");
    taskDiv.className = "task-card";

    const dueDate = new Date(task.dueDate).toLocaleDateString();

    taskDiv.innerHTML = `
      <h3>${task.name}</h3>
      <p>${task.description || "No description"}</p>
      <p>Due: ${dueDate}</p>
      <p>Status: ${task.status}</p>
      <button onclick="updateTaskStatus('${task._id}', 'completed')">Complete</button>
      <button onclick="updateTaskStatus('${task._id}', 'inprogress')">In Progress</button>
      <button onclick="deleteTask('${task._id}')">Delete</button>
    `;

    tasksList.appendChild(taskDiv);
  });
}

async function updateTaskStatus(taskId, status) {
  try {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ status }),
    });

    if (res.ok) {
      loadTasks();
    } else {
      alert("Failed to update task");
    }
  } catch (err) {
    console.error("Error updating task:", err);
  }
}

async function deleteTask(taskId) {
  if (!confirm("Delete this task?")) return;

  try {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (res.ok) {
      loadTasks();
    } else {
      alert("Failed to delete task");
    }
  } catch (err) {
    console.error("Error deleting task:", err);
  }
}

// ---------------- LOGOUT ----------------
function logoutUser() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("currentUser");
  window.location.href = "login.html";
}
