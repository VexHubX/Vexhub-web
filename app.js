"use strict";

const STORAGE_KEY = "momentum-tasks-v1";

const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const categoryInput = document.querySelector("#task-category");
const searchInput = document.querySelector("#search-input");
const taskList = document.querySelector("#task-list");
const clearCompletedButton = document.querySelector("#clear-completed");
const toast = document.querySelector("#toast");

let tasks = loadTasks();
let activeFilter = "all";
let toastTimeout;

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(saved)) return [];

    return saved.filter((task) =>
      task &&
      typeof task.id === "string" &&
      typeof task.title === "string" &&
      typeof task.completed === "boolean"
    );
  } catch {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    showToast("Could not save tasks in this browser.");
  }
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatToday() {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date());
}

function formatTaskDate(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(new Date(timestamp));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2400);
}

function getVisibleTasks() {
  const query = searchInput.value.trim().toLocaleLowerCase();

  return tasks.filter((task) => {
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "active" && !task.completed) ||
      (activeFilter === "completed" && task.completed);

    const matchesSearch =
      !query ||
      task.title.toLocaleLowerCase().includes(query) ||
      (task.category || "").toLocaleLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });
}

function makeTaskCard(task) {
  const card = document.createElement("article");
  card.className = `task-card${task.completed ? " is-completed" : ""}`;

  const checkbox = document.createElement("button");
  checkbox.className = "task-check";
  checkbox.type = "button";
  checkbox.dataset.action = "toggle";
  checkbox.dataset.id = task.id;
  checkbox.setAttribute("aria-label", task.completed ? "Mark task as incomplete" : "Mark task as complete");
  checkbox.setAttribute("aria-pressed", String(task.completed));

  const checkmark = document.createElement("span");
  checkmark.className = "checkmark";
  checkmark.setAttribute("aria-hidden", "true");
  checkmark.textContent = "✓";
  checkbox.append(checkmark);

  const copy = document.createElement("div");
  copy.className = "task-copy";

  const title = document.createElement("p");
  title.className = "task-title";
  title.textContent = task.title;

  const meta = document.createElement("div");
  meta.className = "task-meta";

  const category = document.createElement("span");
  category.className = "category-tag";
  category.dataset.category = task.category || "Personal";
  category.textContent = task.category || "Personal";

  const date = document.createElement("span");
  date.className = "task-date";
  date.textContent = `Added ${formatTaskDate(task.createdAt || Date.now())}`;

  meta.append(category, date);
  copy.append(title, meta);

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.dataset.action = "delete";
  deleteButton.dataset.id = task.id;
  deleteButton.setAttribute("aria-label", `Delete task: ${task.title}`);
  deleteButton.textContent = "×";

  card.append(checkbox, copy, deleteButton);
  return card;
}

function renderEmptyState() {
  const wrapper = document.createElement("div");
  wrapper.className = "empty-state";

  const icon = document.createElement("span");
  icon.className = "empty-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = activeFilter === "completed" ? "✓" : "✦";

  const heading = document.createElement("h3");
  const description = document.createElement("p");

  if (searchInput.value.trim()) {
    heading.textContent = "No matching tasks";
    description.textContent = "Try another search or adjust your filters.";
  } else if (activeFilter === "completed") {
    heading.textContent = "Nothing completed yet";
    description.textContent = "Complete a task and it will show up here.";
  } else if (activeFilter === "active") {
    heading.textContent = "All caught up";
    description.textContent = "You have no tasks in progress right now.";
  } else {
    heading.textContent = "A fresh start";
    description.textContent = "Add your first task above and build some momentum.";
  }

  wrapper.append(icon, heading, description);
  taskList.append(wrapper);
}

function render() {
  const visibleTasks = getVisibleTasks();
  taskList.replaceChildren();

  if (visibleTasks.length === 0) {
    renderEmptyState();
  } else {
    visibleTasks.forEach((task) => taskList.append(makeTaskCard(task)));
  }

  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const active = total - completed;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  document.querySelector("#all-count").textContent = String(total);
  document.querySelector("#active-count").textContent = String(active);
  document.querySelector("#completed-count").textContent = String(completed);

  document.querySelector("#progress-value").textContent = `${progress}%`;
  document.querySelector("#progress-fill").style.width = `${progress}%`;
  document.querySelector("#progress-track").setAttribute("aria-valuenow", String(progress));

  const progressCaption = document.querySelector("#progress-caption");
  if (total === 0) {
    progressCaption.textContent = "Add a task to get started";
  } else if (completed === total) {
    progressCaption.textContent = "Everything on your list is complete";
  } else {
    progressCaption.textContent = `${completed} of ${total} ${total === 1 ? "task" : "tasks"} complete`;
  }

  document.querySelector("#task-summary").textContent =
    total === 0
      ? "A clear mind starts with a clear list."
      : `${active} ${active === 1 ? "task" : "tasks"} left to focus on.`;

  document.querySelector("#visible-count").textContent =
    `${visibleTasks.length} ${visibleTasks.length === 1 ? "task" : "tasks"}`;

  clearCompletedButton.disabled = completed === 0;
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = taskInput.value.trim();
  if (!title) {
    taskInput.focus();
    return;
  }

  tasks.unshift({
    id: createId(),
    title,
    category: categoryInput.value,
    completed: false,
    createdAt: Date.now()
  });

  saveTasks();
  render();
  taskForm.reset();
  taskInput.focus();
  showToast("Task added to your list.");
});

taskList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const taskId = button.dataset.id;
  const action = button.dataset.action;

  if (action === "toggle") {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    task.completed = !task.completed;
    saveTasks();
    render();
    showToast(task.completed ? "Nice work — task completed." : "Task moved back to in progress.");
  }

  if (action === "delete") {
    tasks = tasks.filter((task) => task.id !== taskId);
    saveTasks();
    render();
    showToast("Task deleted.");
  }
});

document.querySelectorAll(".filter-button").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;

    document.querySelectorAll(".filter-button").forEach((item) => {
      const isActive = item === button;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });

    render();
  });
});

searchInput.addEventListener("input", render);

clearCompletedButton.addEventListener("click", () => {
  const completedCount = tasks.filter((task) => task.completed).length;
  if (completedCount === 0) return;

  tasks = tasks.filter((task) => !task.completed);
  saveTasks();
  render();
  showToast(`Cleared ${completedCount} completed ${completedCount === 1 ? "task" : "tasks"}.`);
});

document.addEventListener("keydown", (event) => {
  const isTyping =
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement ||
    event.target instanceof HTMLSelectElement;

  if (event.key === "/" && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault();
    searchInput.focus();
  }

  if (event.key === "Escape" && document.activeElement === searchInput) {
    searchInput.value = "";
    render();
    searchInput.blur();
  }
});

document.querySelector("#today-date").textContent = formatToday();
render();
