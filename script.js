document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const iconOptions = [
        '🥣', '🅰️', '✏️', '🔍', '🎹', '🌺', '🧹', '⭐',
        '🏃', '🛀', '💤', '🎮', '📺', '🏫', '🐶', '🐱',
        '🍔', '🎨', '🚲', '🎵', '🎒', '🌞', '📝', '🆕'
    ];

    // --- State ---
    let tasks = loadTasks();
    let timerDuration = parseInt(localStorage.getItem('timerDuration')) || 35; // Minutes

    // --- DOM Elements ---
    const taskListElement = document.getElementById('task-list');
    const taskTemplate = document.getElementById('task-item-template');

    // Timer Elements
    const timerText = document.getElementById('timer-text');
    const timerProgress = document.getElementById('timer-progress');
    const startBtn = document.getElementById('start-btn');
    const resetBtn = document.getElementById('reset-btn');
    const timerSettingsBtn = document.getElementById('timer-settings-btn');

    // Time Up Overlay Elements
    const timeUpOverlay = document.getElementById('time-up-overlay');
    const timeUpButtons = document.getElementById('time-up-buttons');
    const timeUpResetBtn = document.getElementById('time-up-reset-btn');
    const timeUpExtendBtn = document.getElementById('time-up-extend-btn');
    const timeUpExtendForm = document.getElementById('time-up-extend-form');
    const timeUpExtendInput = document.getElementById('extend-minutes');
    const startExtensionBtn = document.getElementById('time-up-start-extension-btn');

    // Settings Elements
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const resultTimerInput = document.getElementById('setting-timer-min');
    const settingsTaskList = document.getElementById('settings-task-list');
    const addSettingTaskBtn = document.getElementById('setting-add-task-btn');
    const settingsTaskRowTemplate = document.getElementById('settings-task-row-template');

    // --- Initialization ---
    function init() {
        renderMainTasks();
        resetTimerSystem();
        setupEventListeners();
    }

    function setupEventListeners() {
        // Modal toggles
        timerSettingsBtn.addEventListener('click', openSettings);
        closeSettingsBtn.addEventListener('click', () => settingsModal.close());

        // Close modal when clicking outside
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) settingsModal.close();
        });

        // Settings actions
        addSettingTaskBtn.addEventListener('click', () => addSettingsTaskRow());
        saveSettingsBtn.addEventListener('click', saveSettings);

        // Time Up Actions
        timeUpResetBtn.addEventListener('click', () => {
            hideTimeUp();
            resetTimerSystem();
        });

        timeUpExtendBtn.addEventListener('click', () => {
            timeUpButtons.style.display = 'none';
            timeUpExtendForm.style.display = 'flex';
        });

        startExtensionBtn.addEventListener('click', () => {
            const extMins = parseInt(timeUpExtendInput.value);
            if (extMins > 0) {
                hideTimeUp();
                // Start with new duration
                maxTime = extMins * 60;
                timeLeft = maxTime;
                updateDisplay(timeLeft);
                startTimer();
            }
        });
    }

    // --- Loading & Saving Data ---
    function loadTasks() {
        const stored = localStorage.getItem('scheduleTasks');
        if (stored) return JSON.parse(stored);
        return [
            { id: 1, time: '7:30~8:15', icon: '🥣', text: '起床、身だしなみ、朝ごはん', done: true, type: 'text' },
            { id: 2, time: '8:35~9:20', icon: '🅰️', text: '外遊び', done: false, type: 'text' },
            { id: 3, time: '9:40~10:25', icon: '✏️', text: '宿題、読書、工作', done: false, type: 'text' },
            { id: 4, time: '10:45~12:00', icon: '🔍', text: '家の手伝い', done: false, type: 'text' },
            { id: 5, time: '14:00~15:30', icon: '🎹', text: '楽器の練習', done: false, type: 'text' },
            { id: 6, time: '15:30~17:30', icon: '🌺', text: '家族の時間', done: false, type: 'text' },
            { id: 7, time: '17:30~19:00', icon: '🧹', text: '運動・休憩', done: false, type: 'text' },
            { id: 8, time: '20:00~21:00', icon: '⭐', text: '明日の準備', done: false, type: 'text' },
        ];
    }

    function saveTasks() {
        localStorage.setItem('scheduleTasks', JSON.stringify(tasks));
    }

    function createEmptyTask() {
        return {
            id: Date.now(),
            time: '00:00',
            icon: '🆕',
            text: '新しいタスク',
            done: false,
            type: 'text', // 'text' or 'image'
            imageSrc: ''
        };
    }

    // --- Main View Logic ---
    function renderMainTasks() {
        taskListElement.innerHTML = '';
        tasks.forEach((task, index) => {
            const clone = taskTemplate.content.cloneNode(true);

            // Populate Data
            clone.querySelector('.task-number').textContent = index + 1;
            clone.querySelector('.task-number').style.webkitTextStroke = `1px ${getRandomColor(index)}`;
            clone.querySelector('.task-time').textContent = task.time;
            clone.querySelector('.task-icon').textContent = task.icon;

            const payloadContainer = clone.querySelector('.task-payload');

            if (task.type === 'image' && task.imageSrc) {
                // Image Mode
                const img = document.createElement('img');
                img.src = task.imageSrc;
                img.alt = task.text || 'Task Image';
                img.className = 'task-image';
                payloadContainer.appendChild(img);
            } else {
                // Text Mode
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'task-input';
                input.value = task.text || '';
                // Since this is the main view, allowing edit here updates text mode only
                input.addEventListener('change', (e) => {
                    task.text = e.target.value;
                    saveTasks();
                });
                payloadContainer.appendChild(input);
            }

            const checkbox = clone.querySelector('.task-checkbox');
            checkbox.checked = task.done;
            checkbox.addEventListener('change', (e) => {
                task.done = e.target.checked;
                if (e.target.checked) playSound('success');
                saveTasks();
            });

            taskListElement.appendChild(clone);
        });
    }

    function getRandomColor(index) {
        const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#22d3ee', '#818cf8', '#c084fc'];
        return colors[index % colors.length];
    }

    // --- Settings Logic ---
    function openSettings() {
        // Load current state into settings
        resultTimerInput.value = timerDuration;

        // Render tasks in settings
        settingsTaskList.innerHTML = '';
        tasks.forEach(task => addSettingsTaskRow(task));

        settingsModal.showModal();
    }

    function addSettingsTaskRow(task = null) {
        const isNew = !task;
        if (isNew) task = createEmptyTask();

        const clone = settingsTaskRowTemplate.content.cloneNode(true);
        const row = clone.querySelector('.settings-task-row');

        // Elements
        const timeInput = row.querySelector('.setting-time');
        const iconSelect = row.querySelector('.setting-icon-select'); // Changed from input to select
        const typeSelect = row.querySelector('.setting-type-select');
        const textInput = row.querySelector('.setting-text');
        const imageContainer = row.querySelector('.setting-image-container');
        const imageInput = row.querySelector('.setting-image-input');
        const imagePreview = row.querySelector('.setting-image-preview');
        const delBtn = row.querySelector('.delete-btn');

        // Populate Icon Options
        iconOptions.forEach(icon => {
            const option = document.createElement('option');
            option.value = icon;
            option.textContent = icon;
            iconSelect.appendChild(option);
        });

        // Initial Values
        timeInput.value = task.time;
        iconSelect.value = task.icon; // Select matches value
        if (!iconOptions.includes(task.icon)) {
            // If the current icon isn't in our list (e.g. from previous free-text), add it temporarily
            const option = document.createElement('option');
            option.value = task.icon;
            option.textContent = task.icon;
            iconSelect.appendChild(option);
            iconSelect.value = task.icon;
        }

        typeSelect.value = task.type || 'text';
        textInput.value = task.text || '';

        // Store state on the DOM element for saving later
        row.dataset.imageSrc = task.imageSrc || '';

        if (task.imageSrc) {
            imagePreview.style.backgroundImage = `url(${task.imageSrc})`;
        }

        // Visibility Toggle Function
        const updateVisibility = () => {
            if (typeSelect.value === 'text') {
                textInput.style.display = 'block';
                imageContainer.style.display = 'none';
            } else {
                textInput.style.display = 'none';
                imageContainer.style.display = 'flex';
            }
        };
        updateVisibility();

        // Event Listeners
        typeSelect.addEventListener('change', updateVisibility);

        // Image Upload Handler
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (evt) {
                    const base64 = evt.target.result;
                    row.dataset.imageSrc = base64;
                    imagePreview.style.backgroundImage = `url(${base64})`;
                };
                reader.readAsDataURL(file);
            }
        });

        delBtn.addEventListener('click', () => {
            row.remove();
        });

        settingsTaskList.appendChild(row);
    }

    function saveSettings() {
        // Update Timer
        const newDuration = parseInt(resultTimerInput.value);
        if (newDuration > 0 && newDuration !== timerDuration) {
            timerDuration = newDuration;
            localStorage.setItem('timerDuration', timerDuration);
            resetTimerSystem();
        }

        // Update Tasks
        const newTasks = [];
        const rows = settingsTaskList.querySelectorAll('.settings-task-row');
        rows.forEach((row, index) => {
            const existingTask = tasks[index] || {};

            // Reconstruct task object
            newTasks.push({
                id: existingTask.id || Date.now() + index,
                time: row.querySelector('.setting-time').value,
                icon: row.querySelector('.setting-icon-select').value, // Get from select
                type: row.querySelector('.setting-type-select').value,
                text: row.querySelector('.setting-text').value,
                imageSrc: row.dataset.imageSrc,
                done: existingTask.done || false
            });
        });

        tasks = newTasks;
        saveTasks();
        renderMainTasks();
        settingsModal.close();
    }

    // --- Timer System ---
    let timerInterval;
    let timeLeft;
    let maxTime; // in seconds
    let isRunning = false;

    // SVG Circumference
    const circumference = 2 * Math.PI * 45;

    function resetTimerSystem() {
        pauseTimer();
        hideTimeUp();
        maxTime = timerDuration * 60;
        timeLeft = maxTime;

        // Reset SVG
        timerProgress.style.strokeDasharray = `${circumference} ${circumference}`;
        timerProgress.style.strokeDashoffset = 0; // Full circle

        updateDisplay(timeLeft);
    }

    function showTimeUp() {
        timeUpOverlay.style.display = 'flex';
        timeUpButtons.style.display = 'flex';
        timeUpExtendForm.style.display = 'none';
    }

    function hideTimeUp() {
        timeUpOverlay.style.display = 'none';
        timeUpButtons.style.display = 'flex';
        timeUpExtendForm.style.display = 'none';
    }

    function updateDisplay(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        timerText.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        // Update Circle
        // Note: strokeDashoffset=0 is full, =circumference is empty
        const offset = circumference - (seconds / maxTime) * circumference;
        timerProgress.style.strokeDashoffset = offset;
    }

    function startTimer() {
        if (isRunning) return;
        isRunning = true;
        startBtn.textContent = '⏸';
        hideTimeUp(); // Ensure overlay is hidden if restarting

        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateDisplay(timeLeft);
            } else {
                clearInterval(timerInterval);
                isRunning = false;
                startBtn.textContent = '▶';
                playSound('alarm');
                showTimeUp(); // Trigger overlay
            }
        }, 1000);
    }

    function pauseTimer() {
        clearInterval(timerInterval);
        isRunning = false;
        startBtn.textContent = '▶';
    }

    startBtn.addEventListener('click', () => {
        if (isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    });

    resetBtn.addEventListener('click', resetTimerSystem);

    // --- Memo Autosave ---
    const memoArea = document.getElementById('memo-area');
    memoArea.value = localStorage.getItem('memoContent') || '';
    memoArea.addEventListener('input', (e) => {
        localStorage.setItem('memoContent', e.target.value);
    });

    // --- Helpers ---
    function playSound(type) {
        if (type === 'alarm') {
            // Simple Bell Sound using Oscillator
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
            osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.1); // Octave up chirp

            gain.gain.setValueAtTime(0.5, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);

            osc.start();
            osc.stop(ctx.currentTime + 1.5);
        } else {
            // Keep success click silent or small beep if needed, skipping for now
        }
    }

    // Start
    init();
});
