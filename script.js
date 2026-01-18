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
    const appContainer = document.querySelector('.app-container');
    const taskListElement = document.getElementById('main-task-list');
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

        // Init Layout
        const savedMode = localStorage.getItem('displayMode') || 'both';
        updateLayout(savedMode);

        // Check initial state
        checkAllTasksCompleted();

        // Init Visibility
        const showNumber = localStorage.getItem('showNumber') !== 'false';
        const showTime = localStorage.getItem('showTime') !== 'false';
        const showMemo = localStorage.getItem('showMemo') !== 'false';
        const showCheck = localStorage.getItem('showCheck') !== 'false';
        updateVisibilityClasses(showNumber, showTime, showMemo, showCheck);

        handleResize(); // Initial scale
    }

    // --- Auto Scaling Logic ---
    function handleResize() {
        if (!appContainer) return;

        const baseWidth = 1024;
        const padding = 20;

        const windowWidth = document.documentElement.clientWidth || window.innerWidth;
        // We only care about width scaling to fit mobile screens. 
        // Height scrolling is acceptable/expected on mobile for long lists.

        // Calculate Scale
        const availableWidth = windowWidth - (padding * 2);
        let scale = availableWidth / baseWidth;

        // Cap at 1.0 (Desktop)
        if (scale > 1) scale = 1;

        // Apply Scale
        // CSS handles centering via margin: auto and transform-origin: top center
        appContainer.style.transform = `scale(${scale})`;

        // Adjust height of body/container if scaled to avoid massive whitespace at bottom
        // (optional, but good for UX)
        if (scale < 1) {
            // When scaled down, the visual height is much smaller than the layout height.
            // We can adjust negative margin-bottom to pull footer up? 
            // Or just let it be. Simpler is better for stability.
            appContainer.style.height = 'auto';
            document.body.style.width = '100%';
            document.body.style.overflowX = 'hidden';
        } else {
            document.body.style.overflowX = 'hidden';
        }
    }
    window.addEventListener('resize', handleResize);


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
                checkAllTasksCompleted();
            });

            taskListElement.appendChild(clone);
        });
    }

    function getRandomColor(index) {
        const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#22d3ee', '#818cf8', '#c084fc'];
        return colors[index % colors.length];
    }

    // --- Settings Logic ---
    // --- Settings UI Elements ---
    const displayModeRadios = document.getElementsByName('display-mode');
    const toggleShowNumber = document.getElementById('toggle-show-number');
    const toggleShowTime = document.getElementById('toggle-show-time');
    const toggleShowMemo = document.getElementById('toggle-show-memo');
    const toggleShowCheck = document.getElementById('toggle-show-check');

    function openSettings() {
        // Load current state into settings
        resultTimerInput.value = timerDuration;

        // Load Display Mode
        const currentMode = localStorage.getItem('displayMode') || 'both';
        for (const radio of displayModeRadios) {
            radio.checked = (radio.value === currentMode);
        }

        // Load Visibility Options
        toggleShowNumber.checked = localStorage.getItem('showNumber') !== 'false';
        toggleShowTime.checked = localStorage.getItem('showTime') !== 'false';
        toggleShowMemo.checked = localStorage.getItem('showMemo') !== 'false';
        toggleShowCheck.checked = localStorage.getItem('showCheck') !== 'false';

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
        // Update Display Mode
        let selectedMode = 'both';
        for (const radio of displayModeRadios) {
            if (radio.checked) {
                selectedMode = radio.value;
                break;
            }
        }
        localStorage.setItem('displayMode', selectedMode);
        updateLayout(selectedMode);

        // Update Visibility Settings
        const showNumber = toggleShowNumber.checked;
        const showTime = toggleShowTime.checked;
        const showMemo = toggleShowMemo.checked;
        const showCheck = toggleShowCheck.checked;

        localStorage.setItem('showNumber', showNumber);
        localStorage.setItem('showTime', showTime);
        localStorage.setItem('showMemo', showMemo);
        localStorage.setItem('showCheck', showCheck);
        updateVisibilityClasses(showNumber, showTime, showMemo, showCheck);

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

    function toggleTask(id) {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.done = !task.done;
            saveTasks();
            renderMainTasks();
            checkAllTasksCompleted();
        }
    }

    // --- Task Completion System ---
    const taskCompleteOverlay = document.getElementById('task-complete-overlay');
    const taskResetBtn = document.getElementById('task-reset-btn');

    taskResetBtn.addEventListener('click', () => {
        resetAllTasks();
    });

    function checkAllTasksCompleted() {
        if (tasks.length === 0) return;

        const allDone = tasks.every(t => t.done);
        if (allDone) {
            playSound('completion');
            taskCompleteOverlay.style.display = 'flex';
        } else {
            taskCompleteOverlay.style.display = 'none';
        }
    }

    function resetAllTasks() {
        tasks.forEach(t => t.done = false);
        saveTasks();
        renderMainTasks();
        taskCompleteOverlay.style.display = 'none';
    }

    // --- Layout Management ---
    function updateLayout(mode) {
        // mode: 'both', 'timer', 'tasks'
        appContainer.classList.remove('mode-both', 'mode-timer', 'mode-tasks');
        appContainer.classList.add(`mode-${mode}`);
    }

    function updateVisibilityClasses(showNumber, showTime, showMemo, showCheck) {
        if (!showNumber) appContainer.classList.add('hide-numbers');
        else appContainer.classList.remove('hide-numbers');

        if (!showTime) appContainer.classList.add('hide-times');
        else appContainer.classList.remove('hide-times');

        if (!showMemo) appContainer.classList.add('hide-memo');
        else appContainer.classList.remove('hide-memo');

        if (!showCheck) appContainer.classList.add('hide-checks');
        else appContainer.classList.remove('hide-checks');
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
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const now = ctx.currentTime;

        if (type === 'alarm') {
            // Alarm / Time Up
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.1);

            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

            osc.start();
            osc.stop(now + 1.5);
        } else if (type === 'completion') {
            // Victory / Completion Sound (Major Triad)
            const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + (i * 0.1)); // Staggered start

                gain.gain.setValueAtTime(0, now + (i * 0.1));
                gain.gain.linearRampToValueAtTime(0.3, now + (i * 0.1) + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, now + (i * 0.1) + 2.0);

                osc.start(now + (i * 0.1));
                osc.stop(now + (i * 0.1) + 2.0);
            });
        }
    }

    // Start
    init();
});
