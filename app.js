// TaskFlow • Daily Tasks, Dynamic List Tiles & Habit Alarms Engine

// Base Predefined List Categories
const BASE_CATEGORIES = [
  { id: "all", name: "All Tasks", icon: "📁", badgeClass: "badge-other", colorClass: "tile-all" },
  { id: "Shopping", name: "Shopping List", icon: "🛒", badgeClass: "badge-shopping", colorClass: "tile-shopping" },
  { id: "Work", name: "Work List", icon: "💼", badgeClass: "badge-work", colorClass: "tile-work" },
  { id: "Visit", name: "Visit List", icon: "✈️", badgeClass: "badge-visit", colorClass: "tile-visit" },
  { id: "Movie", name: "Movie List", icon: "🎬", badgeClass: "badge-movie", colorClass: "tile-movie" },
  { id: "Study", name: "Study List", icon: "📚", badgeClass: "badge-study", colorClass: "tile-study" },
  { id: "Health", name: "Health List", icon: "🥗", badgeClass: "badge-health", colorClass: "tile-health" },
  { id: "Personal", name: "Personal List", icon: "🏠", badgeClass: "badge-personal", colorClass: "tile-personal" }
];

// Initial Sample Tasks (without priority)
const DEFAULT_TASKS = [
  {
    id: "task-1",
    title: "Buy organic milk, sourdough bread, and avocado",
    category: "Shopping",
    dueDate: new Date().toISOString().split("T")[0],
    completed: false,
    createdAt: Date.now() - 3600000 * 5
  },
  {
    id: "task-2",
    title: "Prepare quarterly UI roadmap presentation",
    category: "Work",
    dueDate: new Date().toISOString().split("T")[0],
    completed: true,
    createdAt: Date.now() - 3600000 * 4
  },
  {
    id: "task-3",
    title: "Visit art exhibition & botanical gardens this weekend",
    category: "Visit",
    dueDate: "",
    completed: false,
    createdAt: Date.now() - 3600000 * 3
  },
  {
    id: "task-4",
    title: "Watch Inception or Interstellar with friends",
    category: "Movie",
    dueDate: "",
    completed: false,
    createdAt: Date.now() - 3600000 * 2
  },
  {
    id: "task-5",
    title: "Review JavaScript async/await & Web Audio API",
    category: "Study",
    dueDate: new Date().toISOString().split("T")[0],
    completed: false,
    createdAt: Date.now() - 3600000 * 1
  },
  {
    id: "task-6",
    title: "30-minute cardio & core workout",
    category: "Health",
    dueDate: "",
    completed: true,
    createdAt: Date.now()
  }
];

// Initial Sample Habits
const DEFAULT_HABITS = [
  {
    id: "habit-1",
    title: "Drink Water (1 Glass)",
    icon: "💧",
    time: "08:30",
    frequency: "Every Day",
    alarmEnabled: true,
    streak: 4,
    lastCompletedDate: getYesterdayDateStr(),
    createdAt: Date.now() - 86400000 * 4
  },
  {
    id: "habit-2",
    title: "Morning Meditation",
    icon: "🧘",
    time: "09:00",
    frequency: "Every Day",
    alarmEnabled: true,
    streak: 2,
    lastCompletedDate: getYesterdayDateStr(),
    createdAt: Date.now() - 86400000 * 2
  },
  {
    id: "habit-3",
    title: "Read 15 Pages of Book",
    icon: "📚",
    time: "21:00",
    frequency: "Every Day",
    alarmEnabled: true,
    streak: 6,
    lastCompletedDate: "",
    createdAt: Date.now() - 86400000 * 6
  }
];

// App State
let tasks = [];
let habits = [];
let customCategories = [];
let selectedListId = "all";
let currentFilter = "all";
let searchQuery = "";
let currentView = "tasks";
let lastTriggeredAlarmMinute = "";
let activeAlarmInterval = null;
let activeAlarmHabit = null;

// Audio Context for Web Audio Synthesizer
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

// Synthesized Tone Player
function playTone(freq, type, duration, delay = 0) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + delay + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch (e) {
    console.warn("Audio playback issue:", e);
  }
}

// Gentle 3-Tone Completion Chime
function playChimeSound() {
  playTone(523.25, "sine", 0.4, 0);      // C5
  playTone(659.25, "sine", 0.4, 0.12);   // E5
  playTone(783.99, "sine", 0.6, 0.24);   // G5
}

// Repeating Alarm Tone
function startAlarmLoop() {
  stopAlarmLoop();
  playAlarmBurst();
  activeAlarmInterval = setInterval(() => {
    playAlarmBurst();
  }, 2500);
}

function playAlarmBurst() {
  playTone(880, "triangle", 0.25, 0);     // A5
  playTone(880, "triangle", 0.25, 0.2);   // A5
  playTone(1174.66, "sine", 0.5, 0.4);    // D6
}

function stopAlarmLoop() {
  if (activeAlarmInterval) {
    clearInterval(activeAlarmInterval);
    activeAlarmInterval = null;
  }
}

// DOM Elements - Sidebar Tasks Form (Left Panel)
const taskForm = document.getElementById("taskForm");
const taskTitleInput = document.getElementById("taskTitleInput");
const taskCategory = document.getElementById("taskCategory");
const customCategoryGroup = document.getElementById("customCategoryGroup");
const customCategoryInput = document.getElementById("customCategoryInput");
const taskDueDate = document.getElementById("taskDueDate");

// DOM Elements - Inline Add Item in Selected List (Middle Panel)
const inlineAddForm = document.getElementById("inlineAddForm");
const inlineTaskTitleInput = document.getElementById("inlineTaskTitleInput");
const inlineTaskDueDate = document.getElementById("inlineTaskDueDate");

// DOM Elements - Middle Panel & Right Rail
const rightTilesPanel = document.getElementById("rightTilesPanel");
const listTilesGrid = document.getElementById("listTilesGrid");
const totalTilesCountPill = document.getElementById("totalTilesCountPill");
const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const emptyStateTitle = document.getElementById("emptyStateTitle");
const emptyStateDesc = document.getElementById("emptyStateDesc");
const searchInput = document.getElementById("searchInput");
const filterTabs = document.querySelectorAll(".filter-tab");
const clearCompletedBtn = document.getElementById("clearCompletedBtn");
const listHeading = document.getElementById("listHeading");
const currentListIcon = document.getElementById("currentListIcon");
const listCountSubtitle = document.getElementById("listCountSubtitle");

// DOM Elements - Habits
const habitForm = document.getElementById("habitForm");
const habitTitleInput = document.getElementById("habitTitleInput");
const habitIcon = document.getElementById("habitIcon");
const habitTime = document.getElementById("habitTime");
const habitFrequency = document.getElementById("habitFrequency");
const habitAlarmEnabled = document.getElementById("habitAlarmEnabled");
const testSoundBtn = document.getElementById("testSoundBtn");
const habitsGrid = document.getElementById("habitsGrid");
const habitsEmptyState = document.getElementById("habitsEmptyState");
const habitsSummaryStats = document.getElementById("habitsSummaryStats");
const habitCountBadge = document.getElementById("habitCountBadge");
const nextAlarmText = document.getElementById("nextAlarmText");
const nextAlarmLabel = document.getElementById("nextAlarmLabel");
const quickAddHabitBtn = document.getElementById("quickAddHabitBtn");

// DOM Elements - Navigation & Modes
const modeTaskBtn = document.getElementById("modeTaskBtn");
const modeHabitBtn = document.getElementById("modeHabitBtn");
const taskFormSection = document.getElementById("taskFormSection");
const habitFormSection = document.getElementById("habitFormSection");
const viewTasksTab = document.getElementById("viewTasksTab");
const viewHabitsTab = document.getElementById("viewHabitsTab");
const tasksViewContainer = document.getElementById("tasksViewContainer");
const habitsViewContainer = document.getElementById("habitsViewContainer");
const mainSectionHeading = document.getElementById("mainSectionHeading");

// DOM Elements - Layout & Theme
const appSidebar = document.getElementById("appSidebar");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const currentDateDisplay = document.getElementById("currentDateDisplay");

// DOM Elements - Counters
const countAll = document.getElementById("countAll");
const countActive = document.getElementById("countActive");
const countCompleted = document.getElementById("countCompleted");

// DOM Elements - Edit Task Modal
const editTaskModal = document.getElementById("editTaskModal");
const editTaskForm = document.getElementById("editTaskForm");
const editTaskId = document.getElementById("editTaskId");
const editTaskTitle = document.getElementById("editTaskTitle");
const editTaskCategory = document.getElementById("editTaskCategory");
const editCustomCategoryGroup = document.getElementById("editCustomCategoryGroup");
const editCustomCategoryInput = document.getElementById("editCustomCategoryInput");
const editTaskDueDate = document.getElementById("editTaskDueDate");
const closeEditModalBtn = document.getElementById("closeEditModalBtn");
const cancelEditModalBtn = document.getElementById("cancelEditModalBtn");

// DOM Elements - Alarm Modal
const alarmModal = document.getElementById("alarmModal");
const alarmModalTitle = document.getElementById("alarmModalTitle");
const alarmModalTime = document.getElementById("alarmModalTime");
const alarmCompleteBtn = document.getElementById("alarmCompleteBtn");
const alarmSnoozeBtn = document.getElementById("alarmSnoozeBtn");
const alarmDismissBtn = document.getElementById("alarmDismissBtn");

// Initialize Application
function init() {
  loadTheme();
  loadData();
  populateCategoryDropdowns();
  displayCurrentDate();
  setDefaultHabitTime();
  setupEventListeners();
  requestNotificationPermission();
  render();
  startAlarmClockEngine();
}

function setDefaultHabitTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  if (habitTime) habitTime.value = `${hh}:${mm}`;
}

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    document.addEventListener("click", () => {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }, { once: true });
  }
}

// Load data from LocalStorage
function loadData() {
  // Load Custom Categories
  const savedCustom = localStorage.getItem("custom_user_categories_v1");
  if (savedCustom) {
    try {
      customCategories = JSON.parse(savedCustom);
    } catch (e) {
      customCategories = [];
    }
  } else {
    customCategories = [];
  }

  // Load Tasks
  const savedTasks = localStorage.getItem("daily_tasks_data_v4");
  if (savedTasks) {
    try {
      tasks = JSON.parse(savedTasks);
    } catch (e) {
      tasks = DEFAULT_TASKS;
    }
  } else {
    tasks = DEFAULT_TASKS;
    saveTasks();
  }

  // Load Habits
  const savedHabits = localStorage.getItem("daily_habits_data");
  if (savedHabits) {
    try {
      habits = JSON.parse(savedHabits);
    } catch (e) {
      habits = DEFAULT_HABITS;
    }
  } else {
    habits = DEFAULT_HABITS;
    saveHabits();
  }
}

function saveCustomCategories() {
  localStorage.setItem("custom_user_categories_v1", JSON.stringify(customCategories));
}

function saveTasks() {
  localStorage.setItem("daily_tasks_data_v4", JSON.stringify(tasks));
}

function saveHabits() {
  localStorage.setItem("daily_habits_data", JSON.stringify(habits));
}

function getAllCategories() {
  return [
    ...BASE_CATEGORIES,
    ...customCategories,
    { id: "Other", name: "+ Other / Custom", icon: "✨", badgeClass: "badge-other", colorClass: "tile-other", isOtherAction: true }
  ];
}

function populateCategoryDropdowns() {
  const standardAndCustom = [
    ...BASE_CATEGORIES.filter((c) => c.id !== "all"),
    ...customCategories
  ];

  let optionsHtml = standardAndCustom
    .map((c) => `<option value="${c.id}">${c.icon} ${c.name}</option>`)
    .join("");

  optionsHtml += `<option value="Other">✨ Other (Create Custom Category)</option>`;

  if (taskCategory) taskCategory.innerHTML = optionsHtml;
  if (editTaskCategory) editTaskCategory.innerHTML = optionsHtml;
}

function displayCurrentDate() {
  const options = { weekday: "long", month: "short", day: "numeric", year: "numeric" };
  const today = new Date();
  if (currentDateDisplay) {
    currentDateDisplay.textContent = today.toLocaleDateString("en-US", options);
  }
}

// Event Listeners Setup
function setupEventListeners() {
  // Mode Switcher in Sidebar
  if (modeTaskBtn && modeHabitBtn) {
    modeTaskBtn.addEventListener("click", () => switchSidebarMode("task"));
    modeHabitBtn.addEventListener("click", () => switchSidebarMode("habit"));
  }

  // View Switcher Tabs
  if (viewTasksTab && viewHabitsTab) {
    viewTasksTab.addEventListener("click", () => switchMainView("tasks"));
    viewHabitsTab.addEventListener("click", () => switchMainView("habits"));
  }

  if (quickAddHabitBtn) {
    quickAddHabitBtn.addEventListener("click", () => {
      switchSidebarMode("habit");
      openSidebar();
    });
  }

  // Task Category Dropdown Change (Toggle Custom Category Input)
  if (taskCategory && customCategoryGroup) {
    const toggleSidebarCustomCategory = () => {
      if (taskCategory.value === "Other") {
        customCategoryGroup.style.display = "flex";
        if (customCategoryInput) {
          customCategoryInput.focus();
          customCategoryInput.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      } else {
        customCategoryGroup.style.display = "none";
      }
    };
    taskCategory.addEventListener("change", toggleSidebarCustomCategory);
    taskCategory.addEventListener("input", toggleSidebarCustomCategory);
  }

  // Edit Task Category Dropdown Change
  if (editTaskCategory && editCustomCategoryGroup) {
    const toggleEditCustomCategory = () => {
      if (editTaskCategory.value === "Other") {
        editCustomCategoryGroup.style.display = "flex";
        if (editCustomCategoryInput) {
          editCustomCategoryInput.focus();
        }
      } else {
        editCustomCategoryGroup.style.display = "none";
      }
    };
    editTaskCategory.addEventListener("change", toggleEditCustomCategory);
    editTaskCategory.addEventListener("input", toggleEditCustomCategory);
  }

  // INLINE ADD ITEM IN SELECTED LIST FORM
  if (inlineAddForm) {
    inlineAddForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = inlineTaskTitleInput.value.trim();
      if (!title) return;

      const targetCategory = selectedListId === "all" ? "Personal" : selectedListId;

      const newTask = {
        id: "task-" + Date.now(),
        title: title,
        category: targetCategory,
        dueDate: inlineTaskDueDate ? inlineTaskDueDate.value : "",
        completed: false,
        createdAt: Date.now()
      };

      tasks.unshift(newTask);
      saveTasks();
      inlineTaskTitleInput.value = "";
      if (inlineTaskDueDate) inlineTaskDueDate.value = "";

      playTone(620, "sine", 0.18);
      render();
    });
  }

  // Sidebar Task Form Submit
  taskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = taskTitleInput.value.trim();
    if (!title) return;

    let chosenCat = taskCategory.value;

    // Handle Custom Category creation if 'Other' was chosen
    if (chosenCat === "Other") {
      const customName = customCategoryInput ? customCategoryInput.value.trim() : "";
      if (customName) {
        chosenCat = createOrGetCustomCategory(customName);
      } else {
        chosenCat = "Personal";
      }
    }

    const newTask = {
      id: "task-" + Date.now(),
      title: title,
      category: chosenCat,
      dueDate: taskDueDate.value,
      completed: false,
      createdAt: Date.now()
    };

    tasks.unshift(newTask);
    saveTasks();
    taskTitleInput.value = "";
    taskDueDate.value = "";
    if (customCategoryInput) customCategoryInput.value = "";
    if (customCategoryGroup) customCategoryGroup.style.display = "none";

    selectedListId = chosenCat;
    if (taskCategory) taskCategory.value = chosenCat;

    if (window.innerWidth <= 980) closeSidebar();
    render();
  });

  // Habit Form Submit
  habitForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = habitTitleInput.value.trim();
    const timeVal = habitTime.value;
    if (!title || !timeVal) return;

    const newHabit = {
      id: "habit-" + Date.now(),
      title: title,
      icon: habitIcon.value,
      time: timeVal,
      frequency: habitFrequency.value,
      alarmEnabled: habitAlarmEnabled.checked,
      streak: 0,
      lastCompletedDate: "",
      createdAt: Date.now()
    };

    habits.unshift(newHabit);
    saveHabits();
    habitTitleInput.value = "";

    switchMainView("habits");
    if (window.innerWidth <= 980) closeSidebar();
    render();
  });

  // Sound Test
  if (testSoundBtn) {
    testSoundBtn.addEventListener("click", () => {
      playAlarmBurst();
    });
  }

  // Search Filter
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.toLowerCase();
    renderTasksListOnly();
  });

  // Filter Tabs
  filterTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      filterTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentFilter = tab.dataset.filter;
      renderTasksListOnly();
    });
  });

  // Clear Completed Tasks
  clearCompletedBtn.addEventListener("click", () => {
    const listTasks = selectedListId === "all" ? tasks : tasks.filter((t) => t.category === selectedListId);
    const hasCompleted = listTasks.some((t) => t.completed);
    if (!hasCompleted) return;

    if (confirm("Are you sure you want to delete completed tasks from this list?")) {
      if (selectedListId === "all") {
        tasks = tasks.filter((t) => !t.completed);
      } else {
        tasks = tasks.filter((t) => !(t.category === selectedListId && t.completed));
      }
      saveTasks();
      render();
    }
  });

  // Theme Toggle
  themeToggleBtn.addEventListener("click", toggleTheme);

  // Mobile Sidebar
  if (mobileMenuBtn) mobileMenuBtn.addEventListener("click", openSidebar);
  if (closeSidebarBtn) closeSidebarBtn.addEventListener("click", closeSidebar);
  if (sidebarBackdrop) sidebarBackdrop.addEventListener("click", closeSidebar);

  // Edit Task Modal Listeners
  if (closeEditModalBtn) closeEditModalBtn.addEventListener("click", closeEditModal);
  if (cancelEditModalBtn) cancelEditModalBtn.addEventListener("click", closeEditModal);
  if (editTaskForm) {
    editTaskForm.addEventListener("submit", (e) => {
      e.preventDefault();
      saveTaskEdits();
    });
  }

  // Alarm Modal Listeners
  if (alarmCompleteBtn) {
    alarmCompleteBtn.addEventListener("click", () => {
      if (activeAlarmHabit) checkInHabit(activeAlarmHabit.id);
      closeAlarmModal();
    });
  }

  if (alarmSnoozeBtn) {
    alarmSnoozeBtn.addEventListener("click", () => {
      snoozeCurrentAlarm(5);
      closeAlarmModal();
    });
  }

  if (alarmDismissBtn) {
    alarmDismissBtn.addEventListener("click", () => {
      closeAlarmModal();
    });
  }
}

// Helper: Create custom category and add to state if new
function createOrGetCustomCategory(rawName) {
  const formattedName = rawName.trim();
  const id = formattedName.replace(/\s+/g, "_");

  // Check if exists in base or custom
  const existing = getAllCategories().find(
    (c) => c.id.toLowerCase() === id.toLowerCase() || c.name.toLowerCase() === formattedName.toLowerCase()
  );

  if (existing) return existing.id;

  const newCat = {
    id: id,
    name: formattedName.endsWith("List") ? formattedName : `${formattedName} List`,
    icon: "🏷️",
    badgeClass: "badge-other",
    colorClass: "tile-custom",
    isCustom: true
  };

  customCategories.push(newCat);
  saveCustomCategories();
  populateCategoryDropdowns();
  return id;
}

// Mode & View Switching
function switchSidebarMode(mode) {
  if (mode === "task") {
    modeTaskBtn.classList.add("active");
    modeHabitBtn.classList.remove("active");
    taskFormSection.style.display = "flex";
    habitFormSection.style.display = "none";
  } else {
    modeHabitBtn.classList.add("active");
    modeTaskBtn.classList.remove("active");
    habitFormSection.style.display = "flex";
    taskFormSection.style.display = "none";
  }
}

function switchMainView(view) {
  currentView = view;
  const layout = document.querySelector(".app-layout");
  if (view === "tasks") {
    viewTasksTab.classList.add("active");
    viewHabitsTab.classList.remove("active");
    tasksViewContainer.style.display = "flex";
    habitsViewContainer.style.display = "none";
    if (rightTilesPanel) rightTilesPanel.style.display = "flex";
    if (layout && window.innerWidth > 980) layout.style.gridTemplateColumns = "290px minmax(0, 1fr) 280px";
    mainSectionHeading.textContent = "Task & List Dashboard 📋";
  } else {
    viewHabitsTab.classList.add("active");
    viewTasksTab.classList.remove("active");
    habitsViewContainer.style.display = "flex";
    tasksViewContainer.style.display = "none";
    if (rightTilesPanel) rightTilesPanel.style.display = "none";
    if (layout && window.innerWidth > 980) layout.style.gridTemplateColumns = "290px minmax(0, 1fr)";
    mainSectionHeading.textContent = "Habits & Timely Reminders 🌱";
  }
}

function openSidebar() {
  if (appSidebar) appSidebar.classList.add("open");
  if (sidebarBackdrop) sidebarBackdrop.classList.add("active");
}

function closeSidebar() {
  if (appSidebar) appSidebar.classList.remove("open");
  if (sidebarBackdrop) sidebarBackdrop.classList.remove("active");
}

// Render Everything
function render() {
  renderListTiles();
  renderTasksListOnly();
  renderHabits();
  updateNextAlarmWidget();
}

// Render Separate List Category Tiles (Right Vertical Rail)
function renderListTiles() {
  listTilesGrid.innerHTML = "";

  const allCats = getAllCategories();
  const listsCount = allCats.filter((c) => !c.isOtherAction).length;
  if (totalTilesCountPill) totalTilesCountPill.textContent = `${listsCount} Lists`;

  allCats.forEach((cat) => {
    const card = document.createElement("div");

    // Special "+ Other / Custom" Action Tile
    if (cat.isOtherAction) {
      card.className = "list-tile-card tile-other";
      card.innerHTML = `
        <div class="tile-top">
          <span class="tile-icon">✨</span>
          <span class="tile-badge-count">+ New</span>
        </div>
        <div class="tile-info">
          <h4>Custom Category</h4>
          <div class="tile-stats-text">Click to Add Tile</div>
        </div>
        <div class="tile-progress-bar">
          <div class="tile-progress-fill" style="width: 100%; opacity: 0.25;"></div>
        </div>
      `;

      card.addEventListener("click", () => {
        switchSidebarMode("task");
        if (taskCategory) taskCategory.value = "Other";
        if (customCategoryGroup) customCategoryGroup.style.display = "flex";
        if (customCategoryInput) customCategoryInput.focus();
        openSidebar();
      });

      listTilesGrid.appendChild(card);
      return;
    }

    const isActive = selectedListId === cat.id;
    card.className = `list-tile-card ${cat.colorClass} ${isActive ? "active" : ""}`;

    const catTasks = cat.id === "all" ? tasks : tasks.filter((t) => t.category === cat.id);
    const total = catTasks.length;
    const completed = catTasks.filter((t) => t.completed).length;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    card.innerHTML = `
      <div class="tile-top">
        <span class="tile-icon">${cat.icon}</span>
        <span class="tile-badge-count">${completed}/${total}</span>
      </div>
      <div class="tile-info">
        <h4>${escapeHtml(cat.name)}</h4>
        <div class="tile-stats-text">${percent}% Done (${total - completed} left)</div>
      </div>
      <div class="tile-progress-bar">
        <div class="tile-progress-fill" style="width: ${percent}%;"></div>
      </div>
    `;

    card.addEventListener("click", () => {
      selectedListId = cat.id;
      if (cat.id !== "all" && taskCategory) {
        taskCategory.value = cat.id;
        if (customCategoryGroup) customCategoryGroup.style.display = "none";
      }
      renderListTiles();
      renderTasksListOnly();
    });

    listTilesGrid.appendChild(card);
  });
}

// Render Task List Items for Selected Tile (Middle Panel)
function renderTasksListOnly() {
  const currentCatObj = getAllCategories().find((c) => c.id === selectedListId) || BASE_CATEGORIES[0];
  if (listHeading) listHeading.textContent = currentCatObj.name;
  if (currentListIcon) currentListIcon.textContent = currentCatObj.icon;

  // Update Inline Add Input placeholder to reflect current list
  if (inlineTaskTitleInput) {
    if (selectedListId === "all") {
      inlineTaskTitleInput.placeholder = `+ Add a new item to Personal list...`;
    } else {
      inlineTaskTitleInput.placeholder = `+ Add a new item to ${currentCatObj.name}...`;
    }
  }

  let categoryFiltered = selectedListId === "all" 
    ? tasks 
    : tasks.filter((task) => task.category === selectedListId);

  const total = categoryFiltered.length;
  const completed = categoryFiltered.filter((t) => t.completed).length;
  const active = total - completed;

  if (countAll) countAll.textContent = total;
  if (countActive) countActive.textContent = active;
  if (countCompleted) countCompleted.textContent = completed;
  if (listCountSubtitle) {
    listCountSubtitle.textContent = `${active} active, ${completed} completed`;
  }

  let filtered = categoryFiltered.filter((task) => {
    if (currentFilter === "active" && task.completed) return false;
    if (currentFilter === "completed" && !task.completed) return false;
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery)) return false;
    return true;
  });

  taskList.innerHTML = "";
  if (filtered.length === 0) {
    emptyState.style.display = "block";
    if (searchQuery) {
      emptyStateTitle.textContent = "No matching items";
      emptyStateDesc.textContent = `No tasks match "${searchQuery}" in ${currentCatObj.name}.`;
    } else if (currentFilter === "completed") {
      emptyStateTitle.textContent = "No completed items";
      emptyStateDesc.textContent = "Check off tasks in this list to see them here!";
    } else {
      emptyStateTitle.textContent = `No items in ${currentCatObj.name}`;
      emptyStateDesc.textContent = "Use the add bar above to add your first item to this list!";
    }
  } else {
    emptyState.style.display = "none";
    filtered.forEach((task) => {
      taskList.appendChild(createTaskElement(task));
    });
  }
}

// Create Task Element with Checkbox, Edit & Delete Buttons
function createTaskElement(task) {
  const li = document.createElement("li");
  li.className = `task-item ${task.completed ? "completed" : ""}`;
  li.dataset.id = task.id;

  const categoryObj = getAllCategories().find((c) => c.id === task.category) || {
    name: task.category,
    icon: "🏷️",
    badgeClass: "badge-other"
  };

  li.innerHTML = `
    <div class="task-left">
      <div class="custom-checkbox" onclick="toggleTaskStatus('${task.id}')" title="Mark Completed">
        ${task.completed ? '<i class="fa-solid fa-check"></i>' : ""}
      </div>
      <div class="task-details">
        <span class="task-title">${escapeHtml(task.title)}</span>
        <div class="task-meta">
          <span class="badge ${categoryObj.badgeClass}">${categoryObj.icon} ${escapeHtml(categoryObj.name)}</span>
          ${task.dueDate ? `<span class="badge badge-date"><i class="fa-regular fa-clock"></i> ${formatDate(task.dueDate)}</span>` : ""}
        </div>
      </div>
    </div>
    <div class="task-actions">
      <button class="action-btn edit-btn" title="Edit Task & Fix Spelling" onclick="openEditModal('${task.id}')">
        <i class="fa-solid fa-pen-to-square"></i>
      </button>
      <button class="action-btn delete-btn" title="Delete Task" onclick="deleteTask('${task.id}')">
        <i class="fa-regular fa-trash-can"></i>
      </button>
    </div>
  `;

  return li;
}

// Toggle Task Completed
window.toggleTaskStatus = function (id) {
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.completed = !task.completed;
    if (task.completed) playChimeSound();
    saveTasks();
    render();
  }
};

// Delete Task
window.deleteTask = function (id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  render();
};

// ==========================================================================
// Edit Task Modal Logic
// ==========================================================================
window.openEditModal = function (id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  editTaskId.value = task.id;
  editTaskTitle.value = task.title;
  editTaskCategory.value = task.category;
  editTaskDueDate.value = task.dueDate || "";

  if (editCustomCategoryGroup) editCustomCategoryGroup.style.display = "none";
  if (editCustomCategoryInput) editCustomCategoryInput.value = "";

  editTaskModal.style.display = "flex";
  editTaskTitle.focus();
};

function closeEditModal() {
  editTaskModal.style.display = "none";
}

function saveTaskEdits() {
  const id = editTaskId.value;
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  const newTitle = editTaskTitle.value.trim();
  if (!newTitle) return;

  let chosenCat = editTaskCategory.value;

  // Handle Custom Category creation if 'Other' was chosen in Edit Modal
  if (chosenCat === "Other") {
    const customName = editCustomCategoryInput ? editCustomCategoryInput.value.trim() : "";
    if (customName) {
      chosenCat = createOrGetCustomCategory(customName);
    } else {
      chosenCat = task.category;
    }
  }

  task.title = newTitle;
  task.category = chosenCat;
  task.dueDate = editTaskDueDate.value;

  saveTasks();
  closeEditModal();
  render();
}

// ==========================================================================
// Habits Logic
// ==========================================================================
function renderHabits() {
  habitsGrid.innerHTML = "";
  if (habitCountBadge) habitCountBadge.textContent = habits.length;
  if (habitsSummaryStats) habitsSummaryStats.textContent = `${habits.length} Active Daily Habits`;

  if (habits.length === 0) {
    habitsEmptyState.style.display = "block";
  } else {
    habitsEmptyState.style.display = "none";
    habits.forEach((habit) => {
      habitsGrid.appendChild(createHabitElement(habit));
    });
  }
}

function createHabitElement(habit) {
  const card = document.createElement("div");
  card.className = "habit-card";
  card.dataset.id = habit.id;

  const todayStr = getTodayDateStr();
  const isDoneToday = habit.lastCompletedDate === todayStr;

  card.innerHTML = `
    <div class="habit-card-top">
      <div class="habit-header-left">
        <div class="habit-avatar">${habit.icon || "🌱"}</div>
        <div class="habit-info">
          <h4>${escapeHtml(habit.title)}</h4>
          <span class="habit-frequency-tag">${habit.frequency}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="action-btn delete-btn" title="Delete Habit" onclick="deleteHabit('${habit.id}')">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </div>
    </div>

    <div class="habit-stats-row">
      <div class="habit-streak">
        <i class="fa-solid fa-fire"></i> ${habit.streak} ${habit.streak === 1 ? "Day" : "Days"}
      </div>
      
      <div class="habit-alarm-tag">
        <i class="fa-solid fa-bell"></i> ${formatTimeDisplay(habit.time)}
        <label class="switch" title="Toggle Alarm">
          <input type="checkbox" ${habit.alarmEnabled ? "checked" : ""} onchange="toggleHabitAlarm('${habit.id}', this.checked)">
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <button class="btn-checkin-habit ${isDoneToday ? "done-today" : ""}" onclick="checkInHabit('${habit.id}')" ${isDoneToday ? "disabled" : ""}>
      ${isDoneToday 
        ? '<i class="fa-solid fa-circle-check"></i> Completed Today!' 
        : '<i class="fa-regular fa-circle-check"></i> Check In Today'
      }
    </button>
  `;

  return card;
}

window.toggleHabitAlarm = function (id, enabled) {
  const habit = habits.find((h) => h.id === id);
  if (habit) {
    habit.alarmEnabled = enabled;
    saveHabits();
    updateNextAlarmWidget();
  }
};

window.checkInHabit = function (id) {
  const habit = habits.find((h) => h.id === id);
  if (!habit) return;

  const todayStr = getTodayDateStr();
  if (habit.lastCompletedDate !== todayStr) {
    habit.lastCompletedDate = todayStr;
    habit.streak = (habit.streak || 0) + 1;
    saveHabits();
    playChimeSound();
    render();
  }
};

window.deleteHabit = function (id) {
  if (confirm("Are you sure you want to remove this habit and its alarm?")) {
    habits = habits.filter((h) => h.id !== id);
    saveHabits();
    render();
  }
};

// ==========================================================================
// Alarm Clock Engine
// ==========================================================================
function startAlarmClockEngine() {
  setInterval(() => {
    checkAlarms();
  }, 5000);
  checkAlarms();
}

function checkAlarms() {
  const now = new Date();
  const currentHH = String(now.getHours()).padStart(2, "0");
  const currentMM = String(now.getMinutes()).padStart(2, "0");
  const currentHM = `${currentHH}:${currentMM}`;

  if (currentHM === lastTriggeredAlarmMinute) return;

  const triggered = habits.filter((h) => h.alarmEnabled && h.time === currentHM);

  if (triggered.length > 0) {
    lastTriggeredAlarmMinute = currentHM;
    triggerAlarm(triggered[0]);
  }
}

function triggerAlarm(habit) {
  activeAlarmHabit = habit;
  alarmModalTitle.textContent = `${habit.icon || "⏰"} Time for ${habit.title}!`;
  alarmModalTime.textContent = `Scheduled at ${formatTimeDisplay(habit.time)} • ${habit.frequency}`;
  
  alarmModal.style.display = "flex";
  startAlarmLoop();

  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(`⏰ Habit Alarm: ${habit.title}`, {
        body: `Time to stay consistent with your ${habit.title} habit!`,
        icon: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/png/512/bell.png"
      });
    } catch (e) {}
  }
}

function snoozeCurrentAlarm(minutes) {
  if (!activeAlarmHabit) return;
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutes);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  
  const snoozedHabit = { ...activeAlarmHabit, time: `${hh}:${mm}` };
  habits.push(snoozedHabit);
  saveHabits();
  render();
}

function closeAlarmModal() {
  stopAlarmLoop();
  alarmModal.style.display = "none";
  activeAlarmHabit = null;
}

function updateNextAlarmWidget() {
  const activeAlarms = habits.filter((h) => h.alarmEnabled);
  if (activeAlarms.length === 0) {
    nextAlarmLabel.textContent = "Next Alarm";
    nextAlarmText.textContent = "No active alarms set";
    return;
  }

  const now = new Date();
  const currentHM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  let upcoming = activeAlarms.slice().sort((a, b) => a.time.localeCompare(b.time));
  let next = upcoming.find((h) => h.time >= currentHM) || upcoming[0];

  nextAlarmLabel.textContent = `Next Alarm: ${formatTimeDisplay(next.time)}`;
  nextAlarmText.textContent = `${next.icon || "🌱"} ${next.title}`;
}

// Theme Handling
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("task_tracker_theme", newTheme);
  updateThemeIcon(newTheme);
}

function loadTheme() {
  const savedTheme = localStorage.getItem("task_tracker_theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
  if (!themeToggleBtn) return;
  themeToggleBtn.innerHTML = theme === "dark" 
    ? '<i class="fa-solid fa-sun" style="color: #f59e0b;"></i>' 
    : '<i class="fa-solid fa-moon"></i>';
}

// Helper Date & Time Functions
function getTodayDateStr() {
  return new Date().toISOString().split("T")[0];
}

function getYesterdayDateStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function formatTimeDisplay(timeStr) {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Start App when DOM is loaded
document.addEventListener("DOMContentLoaded", init);
