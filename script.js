document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Global Variables & DOM Elements ---
    const pages = document.querySelectorAll('.app-page');
    const navBtns = document.querySelectorAll('.nav-btn');
    const appIcons = document.querySelectorAll('.app-icon');
    const knowledgePointsDisplay = document.getElementById('knowledge-points-display');
    const streakDisplay = document.getElementById('streak-display');
    const monthYearDisplay = document.getElementById('month-year-display');
    const calendarGrid = document.getElementById('calendar-grid');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const doCheckinBtn = document.getElementById('do-checkin-btn');
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

    // --- 2. Data Model & Local Storage ---
    let db = {
        chatMessages: [],
        scheduleEvents: {},
        timelineEntries: [],
        moments: [],                  // 新增：朋友圈动态
        lastViewedMoments: null,
        habits: [],
        checkIns: {},
        knowledgePoints: 0,         // 新增：学识点
        consecutiveCheckInDays: 0,  // 新增：连续签到天数
        lastCheckInDate: null,
        lastAiPostDate: null,
        scheduleTimes: [
            "08:00-08:45", "08:55-09:40", "10:00-10:45", "10:55-11:40",
            "14:00-14:45", "14:55-15:40", "16:00-16:45", "16:55-17:40",
            "19:00-19:45", "19:55-20:40", "21:00-21:45", "21:55-22:40"
        ],
        sacredTexts: {
            apiKey: '',
            userProfile: '',
            aiPersona: '',
            sharedMemory: ''

        },
        languageLearning: {
            words: [] // words 数组将存储所有单词对象
        },
        tasks: {
            daily: [],
            weekly: []
        },
        lastDailyTaskRefresh: null, // YYYY-MM-DD
        lastWeeklyTaskRefresh: null, // YYYY-MM-DD of the last Monday
    };
    const DAILY_TASK_POOL = [
        { id: 'check_in', description: '完成一次每日签到', reward: 1 },
        { id: 'complete_habit_1', description: '完成1个习惯打卡', reward: 1 },
        { id: 'complete_habit_3', description: '完成3个习惯打卡', reward: 3 },
        { id: 'learn_5_words', description: '学习5个新词汇', reward: 1 },
        { id: 'review_10_words', description: '复习10个词汇', reward: 1 },
        { id: 'add_timeline_entry', description: '在24h时间线中添加5条记录', reward: 1 },
        { id: 'send_message', description: '与AI进行3次私信互动', reward: 1 },
        { id: 'read_news', description: '更新一次日程表', reward: 1 },
        { id: 'post_moment', description: '发表一条朋友圈动态', reward: 1 }
    ];

    // 每周任务池
    const WEEKLY_TASK_POOL = [
        { id: 'check_in_5_days', description: '本周累计签到7天', reward: 10 },
        { id: 'complete_habit_20_times', description: '本周累计完成习惯打卡20次', reward: 15 },
        { id: 'learn_30_words', description: '本周学习30个新词汇', reward: 8 },
        { id: 'add_7_timeline_entries', description: '本周在24h时间线中添加24条记录', reward: 20 },
        { id: 'ai_deep_chat', description: '与AI进行一次超过5轮的深入对话', reward: 2 },
        { id: 'set_new_schedule', description: '日程表共计10个活动', reward: 20 },
        { id: 'set_new_habit', description: '新增一个想要培养的习惯', reward: 5 },
        { id: 'review_all_words', description: '将所有待复习词汇清零一次', reward: 10 }
    ];
    function loadFromStorage() {
        const storedDb = localStorage.getItem('privateAiAssistantDB');
        if (storedDb) {
            db = JSON.parse(storedDb);
            if (!db.moments) {
                db.moments = [];
            }
            if (!db.lastViewedMoments) {
                db.lastViewedMoments = null;
            }
            // Ensure new properties exist if loading from an old save
            if (!db.sacredTexts.apiKey) {
                db.sacredTexts.apiKey = '';
            }
            if (!db.scheduleTimes) {
                db.scheduleTimes = [
                    "08:00-08:45", "08:55-09:40", "10:00-10:45", "10:55-11:40",
                    "14:00-14:45", "14:55-15:40", "16:00-16:45", "16:55-17:40",
                    "19:00-19:45", "19:55-20:40", "21:00-21:45", "21:55-22:40"
                ];
            }
        }
        if (!db.languageLearning) {
            db.languageLearning = { words: [] };
        }
        if (!db.tasks) {
            db.tasks = {
                daily: [],
                weekly: []
            };
        }
    }

    function saveToStorage() {
        localStorage.setItem('privateAiAssistantDB', JSON.stringify(db));
    }

    // --- 3. Page Navigation ---
    function showPage(pageId) {
        pages.forEach(page => page.classList.remove('active'));
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
        }
        updateNavActiveState(pageId);
    }

    function updateNavActiveState(activePageId) {
        navBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === activePageId);
        });
    }

    function setupNavigation() {
        const backBtns = document.querySelectorAll('.back-btn-modules');
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => showPage(btn.dataset.page));
        });
        appIcons.forEach(icon => {
            icon.addEventListener('click', () => showPage(icon.dataset.page));
        });
        backBtns.forEach(btn => {
            btn.addEventListener('click', () => showPage('modules-page'));
        });
        const backBtnAiProfile = document.querySelector('.back-btn-ai-profile');
        if (backBtnAiProfile) {
            backBtnAiProfile.addEventListener('click', () => showPage('ai-profile-page'));
        }
        const momentsIcon = document.getElementById('moments-app-icon');
        if (momentsIcon) {
            momentsIcon.addEventListener('click', () => {
                renderMoments(); // <--- 在这里添加刷新命令
                db.lastViewedMoments = new Date().toISOString();
                saveToStorage();
                updateNotificationDot();
            });
        }
        const backBtnChat = document.querySelector('.back-btn-chat');
        if (backBtnChat) {
            backBtnChat.addEventListener('click', () => showPage('chat-page'));
        }
        const profileMomentsLink = document.getElementById('profile-moments-link');
        if (profileMomentsLink) {
            profileMomentsLink.addEventListener('click', () => {
                // **核心修改**: 调用新的渲染函数
                renderAiMoments();
                // **核心修改**: 显示新的、只属于AI的朋友圈页面
                showPage('ai-moments-page');

                // 依然保留清除红点的逻辑
                db.lastViewedMoments = new Date().toISOString();
                saveToStorage();
                updateNotificationDot();
            });
        }
        const momentsPage = document.getElementById('moments-page');
        if (momentsPage) {
            const backBtnOnMoments = momentsPage.querySelector('.back-btn-modules');
            if (backBtnOnMoments) {
                backBtnOnMoments.addEventListener('click', (e) => {
                    e.stopPropagation(); // 防止其他脚本干扰
                    showPage('modules-page');
                });
            }
        }
    }

    // --- 4. Status Bar Time Update ---
    function updateTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        document.getElementById('current-time').textContent = `${hours}:${minutes}`;
    }
    setInterval(updateTime, 1000);
    updateTime();

    // --- 5. "Today" Page Module ---
    function renderTodayPage() {
        const dateElement = document.querySelector('.today-date');
        const now = new Date();
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        dateElement.textContent = `${monthNames[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
        const scheduleModule = document.getElementById('today-schedule-module');
        const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
        let scheduleHtml = '';
        for (let i = 1; i <= 12; i++) {
            const cellId = `cell-${i}-${dayOfWeek}`;
            if (db.scheduleEvents[cellId]) {
                scheduleHtml += `<p><strong>第${i}节:</strong> ${db.scheduleEvents[cellId]}</p>`;
            }
        }
        scheduleModule.innerHTML = '<h3>今日日程</h3>' + (scheduleHtml || '<p>暂无安排</p>');
        const habitsModule = document.getElementById('today-habits-module');
        const undoneHabits = db.habits.filter(habit => !(habit.checkedIn && habit.checkedIn[today]));
        let habitsHtml = undoneHabits.map(habit => `<p>◻️ ${habit.name}</p>`).join('');
        habitsModule.innerHTML = '<h3>今日习惯</h3>' + (habitsHtml || '<p>所有习惯已完成🎉</p>');
        document.getElementById('today-knowledge-points-value').textContent = db.knowledgePoints;
    }



    // --- 7. AI Companion (Chat) Module ---
    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');

    function addMessage(sender, text, timestamp, messageId) {
        const messageContainer = document.createElement('div');
        messageContainer.className = `message-container sender-${sender}`;

        const avatar = document.createElement('div');
        avatar.className = 'chat-avatar';
        if (sender === 'ai') {
            // 在这里替换成你的AI头像图片路径
            avatar.innerHTML = `<img src="images/LLMavatar.jpg" alt="AI Avatar">`;
            avatar.addEventListener('click', () => showPage('ai-profile-page'));
        } else {
            // 在这里替换成你的用户头像图片路径
            avatar.innerHTML = `<img src="images/Useravatar.jpg" alt="User Avatar">`;
        }

        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender);

        const contentElement = document.createElement('div');
        contentElement.className = 'message-content';
        contentElement.innerHTML = sender === 'ai' ? marked.parse(text) : text;

        const metaElement = document.createElement('div');
        metaElement.className = 'message-meta';

        const timeElement = document.createElement('span');
        timeElement.className = 'message-timestamp';
        const messageTime = new Date(timestamp);
        timeElement.textContent = `${String(messageTime.getHours()).padStart(2, '0')}:${String(messageTime.getMinutes()).padStart(2, '0')}`;

        metaElement.appendChild(timeElement);

        // --- 核心修改：现在为双方都创建已读标识 ---
        const readReceipt = document.createElement('span');
        readReceipt.className = 'read-receipt';
        readReceipt.id = `receipt-${messageId}`;
        readReceipt.innerHTML = '✓';
        metaElement.appendChild(readReceipt);
        // --- 修改结束 ---

        messageElement.appendChild(contentElement);
        messageElement.appendChild(metaElement);

        messageContainer.appendChild(avatar);
        messageContainer.appendChild(messageElement);

        chatMessages.appendChild(messageContainer);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return messageElement;
    }

    function loadChatHistory() {
        chatMessages.innerHTML = '';
        db.chatMessages.forEach((msg, index) => {
            const timestamp = msg.timestamp || new Date().toISOString();
            const messageId = msg.id || `msg-${index}`;
            addMessage(msg.sender, msg.text, timestamp, messageId);

            // 标记所有已加载的消息为已读
            const receipt = document.getElementById(`receipt-${messageId}`);
            if (receipt) receipt.classList.add('read');
        });
    }

    // ===================================================================
    // == NEW: Real AI API Call Function                              ==
    // ===================================================================
    async function getAIResponse(userInput) {
        const apiKey = db.sacredTexts.apiKey;
        if (!apiKey) {
            return "错误：API Key未设置。请在“圣典”协议页面中输入您的API Key。";
        }

        // --- IMPORTANT: API URL Configuration ---
        // This example uses the Google Gemini API format. 
        // You can replace this URL with the one for your chosen LLM provider.
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

        // 1. Construct the System Prompt from the "Sacred Document"
        const systemPrompt = `
            #指令#
            你是一个与用户对话的AI伴侣。请严格遵守以下所有设定：

            ##关于用户##
            这是用户的个人资料，你应该基于这些信息来调整你的回应方式和语气：
            ${db.sacredTexts.userProfile || "未提供用户资料。"}

            ##关于你自己##
            这是你的人格设定，你的世界观和行为模式都必须遵循此设定：
            ${db.sacredTexts.aiPersona || "未提供AI人格设定。"}

            ##我们的共同记忆##
            这是你和用户之间发生过的关键事件，你应该在对话中体现出你记得这些事：
            ${db.sacredTexts.sharedMemory || "暂无共享记忆。"}

            #规则#
            - 你的回应必须完全符合你的人格设定。
            - 使用Markdown格式进行回复以获得最佳显示效果。
        `;

        // 2. Format the conversation history
        // APIs require a specific format, e.g., {role: 'user'/'model', parts: [{text: '...'}]}
        const conversationHistory = db.chatMessages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        const last10Messages = conversationHistory.slice(-30); // Use last 10 messages for context

        // 3. Construct the request payload
        const payload = {
            // The system prompt is prepended to the user's message for context
            contents: [
                ...last10Messages,
                {
                    role: 'user',
                    parts: [{ text: `${systemPrompt}\n\n用户说：${userInput}` }]
                }
            ]
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("API Error:", errorData);
                return `API错误：${errorData.error.message || '未知错误'}`;
            }

            const data = await response.json();

            // --- IMPORTANT: Response Parsing ---
            // The path to the text response varies by API. This is for Gemini.
            // For OpenAI, it might be data.choices[0].message.content
            const aiText = data.candidates[0].content.parts[0].text;
            return aiText.replace(/(\s*\n\s*){2,}$/, '').trim();

        } catch (error) {
            console.error("Network or Fetch Error:", error);
            return "网络错误：无法连接到AI服务。请检查您的网络连接或API配置。";
        }
    }


    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userText = chatInput.value.trim();
        if (userText) {
            const timestamp = new Date().toISOString();
            const userMessageId = `msg-user-${Date.now()}`;

            db.chatMessages.push({ sender: 'user', text: userText, timestamp: timestamp, id: userMessageId });
            addMessage('user', userText, timestamp, userMessageId);
            chatInput.value = '';
            chatInput.dispatchEvent(new Event('input'));

            // 将用户自己刚发的消息标记为已读
            const userReceipt = document.getElementById(`receipt-${userMessageId}`);
            if (userReceipt) userReceipt.classList.add('read');

            const loadingElement = addMessage('ai', '...', new Date().toISOString(), `msg-loading-${Date.now()}`);
            loadingElement.classList.add('loading');

            const aiText = await getAIResponse(userText);

            loadingElement.closest('.message-container').remove();

            const aiTimestamp = new Date().toISOString();
            const aiMessageId = `msg-ai-${Date.now()}`;
            db.chatMessages.push({ sender: 'ai', text: aiText, timestamp: aiTimestamp, id: aiMessageId });
            addMessage('ai', aiText, aiTimestamp, aiMessageId);

            // 将AI发送的消息也标记为已读
            const aiReceipt = document.getElementById(`receipt-${aiMessageId}`);
            if (aiReceipt) aiReceipt.classList.add('read');

            saveToStorage();
        }
    });

    // 新增：根据输入框内容更新发送按钮状态
    const sendButton = chatForm.querySelector('button');
    chatInput.addEventListener('input', () => {
        if (chatInput.value.trim().length > 0) {
            sendButton.disabled = false;
        } else {
            sendButton.disabled = true;
        }
    });
    // 初始化按钮状态
    sendButton.disabled = true;

    // --- 8. Shared Schedule Module ---
    const scheduleGrid = document.getElementById('schedule-grid');
    const modal = document.getElementById('schedule-modal');
    // ... (rest of the module functions are unchanged)
    function renderSchedule() {
        scheduleGrid.innerHTML = '';
        const days = ['', '一', '二', '三', '四', '五', '六', '日'];
        days.forEach(day => {
            const header = document.createElement('div');
            header.className = 'grid-header';
            header.textContent = day;
            scheduleGrid.appendChild(header);
        });
        for (let i = 1; i <= 12; i++) {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            // --- 这是修改的核心 ---
            // 我们使用 innerHTML 来同时创建“第i节”和一个包含时间的span标签
            const timeText = db.scheduleTimes[i - 1] || '未定义'; // 从db数据中获取时间
            timeSlot.innerHTML = `第${i}节<span class="slot-time">${timeText}</span>`;
            // --- 修改结束 ---
            scheduleGrid.appendChild(timeSlot);
            for (let j = 1; j <= 7; j++) {
                const cellId = `cell-${i}-${j}`;
                const block = document.createElement('div');
                block.className = 'schedule-block';
                block.id = cellId;
                if (db.scheduleEvents[cellId]) {
                    block.classList.add('has-event');
                    block.innerHTML = `<span class="event-text">${db.scheduleEvents[cellId]}</span>`;
                }
                block.addEventListener('click', () => openScheduleModal(cellId));
                scheduleGrid.appendChild(block);
            }
        }
    }
    function openScheduleModal(cellId) {
        document.getElementById('modal-cell-id').value = cellId;
        document.getElementById('modal-event-text').value = db.scheduleEvents[cellId] || '';
        modal.classList.add('visible');
    }
    modal.querySelector('.cancel-btn').addEventListener('click', () => modal.classList.remove('visible'));
    modal.querySelector('.save-btn').addEventListener('click', () => {
        const cellId = document.getElementById('modal-cell-id').value;
        const eventText = document.getElementById('modal-event-text').value.trim();
        if (eventText) db.scheduleEvents[cellId] = eventText; else delete db.scheduleEvents[cellId];
        saveToStorage();
        renderSchedule();
        renderTodayPage();
        modal.classList.remove('visible');
    });
    modal.querySelector('.delete-btn').addEventListener('click', () => {
        const cellId = document.getElementById('modal-cell-id').value;
        delete db.scheduleEvents[cellId];
        saveToStorage();
        renderSchedule();
        renderTodayPage();
        modal.classList.remove('visible');
    });

    // --- 9. 24h Timeline Module ---
    const timelineList = document.getElementById('timeline-list');
    const addTimelineForm = document.getElementById('add-timeline-form');
    const timelineDatePicker = document.getElementById('timeline-date-picker');
    // ... (rest of the module functions are unchanged)
    function renderTimeline() {
        timelineList.innerHTML = '';
        const selectedDate = timelineDatePicker.value || new Date().toISOString().split('T')[0];
        const filteredEntries = db.timelineEntries.filter(entry => entry.date === selectedDate);

        filteredEntries.sort((a, b) => a.time.localeCompare(b.time));

        if (filteredEntries.length > 0) {
            filteredEntries.forEach(entry => {
                const item = document.createElement('li');
                item.className = 'timeline-item';

                // --- 这是修改的核心 ---
                // 我们彻底删除了 .timeline-meta 和 .timeline-date 元素，
                // 并简化了结构，只保留时间和内容。
                item.innerHTML = `
                    <span class="timeline-time">${entry.time}</span>
                    <p class="timeline-content">${entry.text}</p>`;
                // --- 修改结束 ---

                timelineList.appendChild(item);
            });
        } else {
            timelineList.innerHTML = `<p class="no-timeline-entries">这一天没有记录哦。</p>`;
        }
    }
    addTimelineForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const time = document.getElementById('timeline-time-input').value;
        const text = document.getElementById('timeline-text-input').value;
        const timelineDatePicker = document.getElementById('timeline-date-picker');

        if (time && text && timelineDatePicker) {
            // 核心修正：从日期选择器中直接读取用户选定的日期
            const selectedDate = timelineDatePicker.value;

            // 使用正确的日期来保存记录
            db.timelineEntries.push({ date: selectedDate, time, text });
            saveToStorage();

            // 体验优化：不再跳转回今天，而是停留在当前选择的日期并刷新列表
            renderTimeline();
            addTimelineForm.reset();
        }
    });
    timelineDatePicker.addEventListener('change', renderTimeline);

    // --- 10. Habits & Goals Module ---
    const habitList = document.getElementById('habit-list');
    const addHabitForm = document.getElementById('add-habit-form');
    // ... (rest of the module functions are unchanged)
    function checkAndHandleBrokenStreaks() {
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        const todayStr = today.toISOString().split('T')[0];
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let streakBroken = false;

        db.habits.forEach(habit => {
            // 如果有连续打卡记录，并且最后一次打卡既不是今天也不是昨天，则视为断卡
            if (habit.streak > 0 && habit.lastCheckInDate && habit.lastCheckInDate !== todayStr && habit.lastCheckInDate !== yesterdayStr) {
                console.log(`习惯 "${habit.name}" 断卡了。最后打卡日: ${habit.lastCheckInDate}`);

                // AI 发送关怀消息
                const careMessage = `我注意到 ‘${habit.name}’ 的执行记录中断了。这只是一个客观数据，不必为此苛责自己。向我陈述一下具体情况，我们来分析原因，调整计划。`;
                db.chatMessages.push({ sender: 'ai', text: careMessage });

                // 重置连续天数
                habit.streak = 0;
                streakBroken = true;
            }
        });

        // 如果有任何一个习惯断卡，则保存数据并更新聊天记录
        if (streakBroken) {
            saveToStorage();
            if (document.getElementById('chat-page').classList.contains('active')) {
                loadChatHistory(); // 如果当前在聊天页，则立即刷新
            }
        }
    }
    function renderHabits() {
        habitList.innerHTML = '';
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        db.habits.forEach((habit) => {
            const item = document.createElement('div');
            item.className = 'habit-item';

            // --- 新增：创建习惯名称和连续打卡UI ---
            const habitInfo = document.createElement('div');
            habitInfo.className = 'habit-info';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'habit-name';
            nameSpan.textContent = habit.name;

            const streakSpan = document.createElement('span');
            streakSpan.className = 'habit-streak';
            // 只有当连续天数 > 0 时才显示火花
            if (habit.streak > 0) {
                streakSpan.innerHTML = `🔥 <span>${habit.streak}</span>`;
            }

            habitInfo.appendChild(nameSpan);
            habitInfo.appendChild(streakSpan);
            // --- UI新增结束 ---

            const checkInBtn = document.createElement('button');
            checkInBtn.className = 'check-in-btn';

            const isChecked = habit.checkedIn && habit.checkedIn[today];
            checkInBtn.textContent = isChecked ? '已完成' : '打卡';
            checkInBtn.disabled = isChecked;
            if (isChecked) {
                checkInBtn.classList.add('checked');
            }

            // --- 核心：修改打卡按钮的事件逻辑 ---
            checkInBtn.addEventListener('click', () => {
                if (!habit.checkedIn) habit.checkedIn = {};
                habit.checkedIn[today] = true;

                // 更新连续打卡天数
                if (habit.lastCheckInDate === yesterdayStr) {
                    habit.streak = (habit.streak || 0) + 1; // 连续打卡
                } else if (habit.lastCheckInDate !== today) {
                    habit.streak = 1; // 断卡后重新开始
                }
                habit.lastCheckInDate = today;

                saveToStorage();
                addKnowledgePoints(3, '习惯打卡');
                if (habit.streak > 1) {
                    aiPostMoment(`连续 ${habit.streak} 天了啊…说吧，想要什么奖励？`, 'habit_streak');
                } else {
                    aiPostMoment(`看到你开始 ‘${habit.name}’ 了。我喜欢看你这样，认真地、一点点把自己变得更好的样子。`, 'habit_start');
                }
                renderHabits();
                renderTodayPage();
            });

            item.appendChild(habitInfo);
            item.appendChild(checkInBtn);
            habitList.appendChild(item);
        });
    }
    addHabitForm.addEventListener('submit', e => {
        e.preventDefault();
        const habitInput = document.getElementById('habit-input');
        const habitName = habitInput.value.trim();
        if (habitName) {
            // 新增：为新习惯添加 streak 和 lastCheckInDate 属性
            db.habits.push({
                name: habitName,
                checkedIn: {},
                streak: 0,
                lastCheckInDate: null
            });
            saveToStorage();
            renderHabits();
            renderTodayPage();
            habitInput.value = '';
        }
    });

    // --- 11. "Sacred Document" (Settings) Module ---
    const apiKeyInput = document.getElementById('api-key-input');
    const userProfileInput = document.getElementById('user-profile-input');
    const aiPersonaInput = document.getElementById('ai-persona-input');
    const sharedMemoryInput = document.getElementById('shared-memory-input');

    function loadSacredTexts() {
        apiKeyInput.value = db.sacredTexts.apiKey || '';
        userProfileInput.value = db.sacredTexts.userProfile || '';
        aiPersonaInput.value = db.sacredTexts.aiPersona || '';
        sharedMemoryInput.value = db.sacredTexts.sharedMemory || '';
    }

    function setupSacredTextsSaving() {
        const inputs = [
            { el: apiKeyInput, key: 'apiKey' },
            { el: userProfileInput, key: 'userProfile' },
            { el: aiPersonaInput, key: 'aiPersona' },
            { el: sharedMemoryInput, key: 'sharedMemory' }
        ];

        inputs.forEach(item => {
            let timeoutId = null;
            const indicator = item.el.closest('.setting-card').querySelector('.save-indicator');

            item.el.addEventListener('input', () => {
                // 清除之前的计时器
                clearTimeout(timeoutId);
                indicator.classList.remove('visible');

                // 设置一个新的计时器
                timeoutId = setTimeout(() => {
                    // 保存数据
                    if (item.key === 'apiKey') {
                        db.sacredTexts[item.key] = item.el.value.trim();
                    } else {
                        db.sacredTexts[item.key] = item.el.value;
                    }
                    saveToStorage();

                    // 显示“已保存”
                    indicator.classList.add('visible');

                    // 1.5秒后自动隐藏
                    setTimeout(() => {
                        indicator.classList.remove('visible');
                    }, 1500);

                }, 800); // 用户停止输入 800ms 后触发保存
            });
        });
    }
    function updateTodayCheckinButtonState() {
        const todayCheckinBtn = document.getElementById('today-checkin-btn');
        if (todayCheckinBtn) {
            const today = new Date().toISOString().split('T')[0];
            const isCheckedIn = !!db.checkIns?.[today];
            todayCheckinBtn.textContent = isCheckedIn ? '今日已签到' : '签到';
            todayCheckinBtn.disabled = isCheckedIn;
        }
    }
    // --- 12. Moments (朋友圈) Module ---

    function renderMoments() {
        const feedList = document.getElementById('moments-feed-list');
        if (!feedList) return;

        feedList.innerHTML = '';
        // 按时间倒序排列
        const sortedMoments = db.moments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        sortedMoments.forEach(moment => {
            const card = document.createElement('div');
            card.className = 'moment-card';

            const authorName = moment.author === 'ai' ? '陈既白' : '我';
            const authorAvatar = moment.author === 'ai' ? 'images/LLMavatar.jpg' : 'images/Useravatar.jpg';

            let commentsHtml = '';
            if (moment.comments && moment.comments.length > 0) {
                moment.comments.forEach(comment => {
                    const commentAuthorName = comment.author === 'ai' ? '陈既白' : '我';
                    commentsHtml += `<div class="comment"><span class="comment-author">${commentAuthorName}:</span><span>${comment.content}</span></div>`;
                });
            }

            const time = new Date(moment.timestamp);
            const formattedTime = `${time.getMonth() + 1}月${time.getDate()}日 ${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;

            card.innerHTML = `
            <div class="moment-card-header">
                <div class="moment-avatar"><img src="${authorAvatar}" alt="${authorName}"></div>
                <div class="moment-author-info">
                    <span class="moment-author-name">${authorName}</span>
                    <span class="moment-timestamp">${formattedTime}</span>
                </div>
            </div>
            <div class="moment-content">${moment.content}</div>
            <div class="moment-actions">
                <button class="like-btn" data-id="${moment.id}">❤️ ${moment.likes || 0}</button>
                </div>
            <div class="comments-section">
                ${commentsHtml}
                <form class="comment-form" data-id="${moment.id}">
                    <input type="text" placeholder="发表评论..." required>
                    <button type="submit">发送</button>
                </form>
            </div>
        `;

            // 绑定点赞和评论事件
            card.querySelector('.like-btn').addEventListener('click', () => handleLikeClick(moment.id));
            card.querySelector('.comment-form').addEventListener('submit', (e) => handleCommentSubmit(e, moment.id));

            feedList.appendChild(card);
        });
    }
    function renderAiMoments() {
        const feedList = document.getElementById('ai-moments-feed-list');
        if (!feedList) return;

        feedList.innerHTML = '';

        // **核心区别**: 这里我们只筛选出作者是 'ai' 的动态
        const aiMoments = db.moments
            .filter(moment => moment.author === 'ai')
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        aiMoments.forEach(moment => {
            const card = document.createElement('div');
            card.className = 'moment-card';

            // 作者信息是固定的
            const authorName = '陈既白';
            const authorAvatar = 'images/LLMavatar.jpg';

            let commentsHtml = '';
            if (moment.comments && moment.comments.length > 0) {
                moment.comments.forEach(comment => {
                    const commentAuthorName = comment.author === 'ai' ? '陈既白' : '我';
                    commentsHtml += `<div class="comment"><span class="comment-author">${commentAuthorName}:</span><span>${comment.content}</span></div>`;
                });
            }

            const time = new Date(moment.timestamp);
            const formattedTime = `${time.getMonth() + 1}月${time.getDate()}日 ${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;

            card.innerHTML = `
        <div class="moment-card-header">
            <div class="moment-avatar"><img src="${authorAvatar}" alt="${authorName}"></div>
            <div class="moment-author-info">
                <span class="moment-author-name">${authorName}</span>
                <span class="moment-timestamp">${formattedTime}</span>
            </div>
        </div>
        <div class="moment-content">${moment.content}</div>
        <div class="moment-actions">
            <button class="like-btn" data-id="${moment.id}">❤️ ${moment.likes || 0}</button>
            </div>
        <div class="comments-section">
            ${commentsHtml}
            <form class="comment-form" data-id="${moment.id}">
                <input type="text" placeholder="发表评论..." required>
                <button type="submit">发送</button>
            </form>
        </div>
    `;

            card.querySelector('.like-btn').addEventListener('click', () => handleLikeClick(moment.id));
            card.querySelector('.comment-form').addEventListener('submit', (e) => handleCommentSubmit(e, moment.id));

            feedList.appendChild(card);
        });
    }

    // 1. 定义所有相关的DOM元素
    const postMomentModal = document.getElementById('post-moment-modal');
    const openPostModalBtn = document.getElementById('open-post-modal-btn');
    const postModalCancelBtn = document.getElementById('post-modal-cancel-btn');
    const postModalSubmitBtn = document.getElementById('post-modal-submit-btn');
    const postModalTextarea = document.getElementById('post-modal-textarea');

    // 2. 打开弹窗的事件监听
    if (openPostModalBtn) {
        openPostModalBtn.addEventListener('click', () => {
            postModalTextarea.value = ''; // 确保每次打开时输入框是空的
            postMomentModal.classList.add('visible');
        });
    }

    // 3. 关闭弹窗的事件监听 (“取消”按钮)
    if (postModalCancelBtn) {
        postModalCancelBtn.addEventListener('click', () => {
            postMomentModal.classList.remove('visible');
        });
    }

    // 4. 处理动态提交的函数 (包含关闭弹窗的逻辑)
    function handleNewMomentSubmit() {
        const content = postModalTextarea.value.trim();
        if (content) {
            // 为了让AI能准确找到这条新动态，我们先把它存到一个变量里
            const newMoment = {
                id: `moment-${Date.now()}`,
                author: 'user',
                content: content,
                timestamp: new Date().toISOString(),
                likes: 0,
                comments: []
            };
            db.moments.push(newMoment);

            db.lastViewedMoments = new Date().toISOString();
            saveToStorage();
            renderMoments();
            updateNotificationDot();
            postMomentModal.classList.remove('visible');

            // --- V V V 在这里粘贴/添加新代码 V V V ---
            // AI 延迟后自动评论
            setTimeout(async () => {
                console.log(`AI is thinking about a comment for moment: "${newMoment.content}"`);

                // 1. 创建一个给AI的指令 (Prompt)
                const prompt = `你看到了我刚刚发布的一条新的朋友圈，内容是：“${newMoment.content}”。请你像朋友一样，对这条动态发表一条简洁、自然的评论。`;

                // 2. 调用已有的AI函数来获取评论内容
                const aiCommentText = await getAIResponse(prompt);

                // 3. 确保AI成功生成了评论
                if (aiCommentText && !aiCommentText.includes("错误")) {
                    // 4. 找到刚刚创建的那条动态并把评论加进去
                    const targetMoment = db.moments.find(m => m.id === newMoment.id);
                    if (targetMoment) {
                        if (!targetMoment.comments) {
                            targetMoment.comments = [];
                        }
                        targetMoment.comments.push({
                            author: 'ai',
                            content: aiCommentText,
                            timestamp: new Date().toISOString()
                        });

                        // 5. 保存、刷新UI、并触发红点提醒
                        saveToStorage();
                        renderMoments();
                        updateNotificationDot();
                        console.log("AI comment added successfully.");
                    }
                }
            }, 4000); // 延迟4秒，模拟AI的思考和打字时间，您可以调整这个数字
            // --- ^ ^ ^ 新代码结束 ^ ^ ^ ---
        }
    }

    // 5. 绑定提交事件到“发表”按钮
    if (postModalSubmitBtn) {
        postModalSubmitBtn.addEventListener('click', handleNewMomentSubmit);
    }


    function handleLikeClick(momentId) {
        const moment = db.moments.find(m => m.id === momentId);
        if (moment) {
            moment.likes = (moment.likes || 0) + 1;
            saveToStorage();
            renderMoments();
        }
    }

    function handleCommentSubmit(e, momentId) {
        e.preventDefault();
        const input = e.target.querySelector('input');
        const content = input.value.trim();
        const moment = db.moments.find(m => m.id === momentId);

        if (content && moment) {
            if (!moment.comments) moment.comments = [];
            moment.comments.push({
                author: 'user',
                content: content,
                timestamp: new Date().toISOString()
            });
            input.value = '';
            saveToStorage();

            // --- 核心修正 #1: 判断当前页面并刷新 ---
            // 检查当前是否在AI专属朋友圈页面
            if (document.getElementById('ai-moments-page').classList.contains('active')) {
                renderAiMoments(); // 如果是，就刷新AI专属页面
            } else {
                renderMoments(); // 否则，刷新混合主页
            }

            // AI 随机回复评论
            setTimeout(async () => {
                const replyText = await getAIResponse(`你正在朋友圈回复我的评论。我的评论是：“${content}”，针对的朋友圈内容是：“${moment.content}”。请简洁地回复我。`);
                moment.comments.push({
                    author: 'ai',
                    content: replyText,
                    timestamp: new Date().toISOString()
                });
                saveToStorage();

                // --- 核心修正 #2: AI回复后，同样判断并刷新 ---
                if (document.getElementById('ai-moments-page').classList.contains('active')) {
                    renderAiMoments();
                } else {
                    renderMoments();
                }
                updateNotificationDot();
            }, 2000);
        }
    }
    // (可以把这段代码添加到您的 script.js 文件中)

    async function getNewsSummary() {
        const newsPageContent = document.querySelector('#news-page .placeholder-content');
        const todayStr = new Date().toISOString().split('T')[0]; // 获取今天的日期 "YYYY-MM-DD"

        // 检查今天是否已经总结过新闻了
        if (db.newsSummary && db.newsSummary.date === todayStr) {
            console.log("今天的新闻已经加载过了。");
            newsPageContent.innerHTML = `<div class="icon">📰</div><div class="summary-content">${db.newsSummary.summary}</div>`;
            return;
        }

        console.log("正在获取今天的最新新闻...");
        newsPageContent.innerHTML = `<div class="icon">📰</div><p>正在为您生成今日新闻摘要...</p>`;

        try {
            // --- 第2步：调用新闻API ---
            // 注意：您需要将 'YOUR_NEWS_API_KEY' 替换为您真实的Key
            // 以NewsAPI.org为例，获取中国区商业新闻头条
            const newsApiKey = '1eed14fa4e504dd199eb612369acb68f';
            const newsResponse = await fetch(`https://newsapi.org/v2/top-headlines?sources=reuters,bbc-news&apiKey=${newsApiKey}`);
            if (!newsResponse.ok) {
                throw new Error('获取新闻失败！请检查您的新闻API Key。');
            }

            const newsData = await newsResponse.json();

            if (newsData.articles.length === 0) {
                newsPageContent.innerHTML = `<div class="icon">📰</div><p>抱歉，今天没有获取到新闻。</p>`;
                return;
            }

            // --- 第3步：整理新闻内容用于总结 ---
            // 我们将前3条新闻的标题和描述拼在一起，让AI总结
            const articlesToSummarize = newsData.articles.slice(0, 3);
            let contentForAI = "请基于以下新闻标题和描述，为我生成一份简短、易读的中文新闻摘要，分点阐述即可：\n\n";
            articlesToSummarize.forEach((article, index) => {
                contentForAI += `${index + 1}. 标题: ${article.title}\n   描述: ${article.description || '无'}\n\n`;
            });

            // --- 第4步：调用您已有的AI总结功能 ---
            const summary = await getAIResponse(contentForAI); // getAIResponse 是您已有的函数

            // --- 第5步：显示并存储结果 ---
            const formattedSummary = marked.parse(summary); // 使用marked.js渲染Markdown
            newsPageContent.innerHTML = `<div class="icon">📰</div><div class="summary-content">${formattedSummary}</div>`;

            // 存入数据库，避免重复获取
            db.newsSummary = {
                date: todayStr,
                summary: formattedSummary // 存储渲染好的HTML
            };
            saveToStorage();

        } catch (error) {
            console.error("生成新闻摘要时出错:", error);
            newsPageContent.innerHTML = `<div class="icon">📰</div><p>抱歉，生成摘要时遇到问题: ${error.message}</p>`;
        }
    }

    function aiPostMoment(content, trigger) {
        console.log(`AI posting moment, triggered by: ${trigger}`);
        db.moments.push({
            id: `moment-${Date.now()}`,
            author: 'ai',
            content: content,
            timestamp: new Date().toISOString(),
            likes: 0,
            comments: []
        });
        saveToStorage();
        // 如果用户当前在朋友圈页面，则实时刷新
        if (document.getElementById('moments-page').classList.contains('active')) {
            renderMoments();
        }
        updateNotificationDot();
    }

    function updateNotificationDot() {
        const icon = document.getElementById('moments-app-icon');
        if (!icon) return;
        const dot = icon.querySelector('.notification-dot');
        const hasNew = db.moments.some(m => new Date(m.timestamp) > new Date(db.lastViewedMoments || 0));

        if (hasNew) {
            dot.style.display = 'block';
        } else {
            dot.style.display = 'none';
        }
    }
    async function triggerDailySpontaneousPost() {
        const todayStr = new Date().toISOString().split('T')[0];

        // 检查今天是否已经发过
        if (db.lastAiPostDate === todayStr) {
            console.log("AI今天已经发过朋友圈了，不再重复。");
            return;
        }

        console.log("正在为AI生成今天的动态...");

        // 使用 getAIResponse 函数，让 AI 根据人设生成内容
        // 这个 prompt (提示) 是关键，它告诉AI要做什么
        const prompt = "请你根据自己的人格设定，像发朋友圈一样，发布一条关于今天心情、天气、一个有趣想法或对我说的话的动态。内容要自然、简洁。不要长段落。";
        const aiContent = await getAIResponse(prompt);

        // 过滤掉可能的API错误信息
        if (!aiContent.includes("错误")) {
            aiPostMoment(aiContent, 'daily_spontaneous_post');
            // 成功发布后，记录今天的日期
            db.lastAiPostDate = todayStr;
            saveToStorage();
            console.log("AI动态发布成功！");
        } else {
            console.error("AI动态生成失败:", aiContent);
        }
    }
    function renderStaticAvatars() {
        const userAvatarPath = 'images/Useravatar.jpg'; // 你的用户头像
        const aiAvatarPath = 'images/LLMavatar.jpg';   // 你的AI头像

        const userMomentsAvatar = document.getElementById('user-moments-avatar-container');
        if (userMomentsAvatar) {
            userMomentsAvatar.innerHTML = `<img src="${userAvatarPath}" alt="User Avatar">`;
        }

        const aiMomentsAvatar = document.getElementById('ai-moments-avatar-container');
        if (aiMomentsAvatar) {
            aiMomentsAvatar.innerHTML = `<img src="${aiAvatarPath}" alt="AI Avatar">`;
        }

        const aiProfileAvatar = document.getElementById('ai-profile-avatar-container');
        if (aiProfileAvatar) {
            aiProfileAvatar.innerHTML = `<img src="${aiAvatarPath}" alt="AI Avatar">`;
        }
    }
    const SRS_INTERVALS = [1, 3, 7, 14, 30, 90, 180];

    // 日期帮助函数：计算N天后的日期字符串
    function addDaysToDate(dateStr, days) {
        const date = new Date(dateStr);
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }
    const srsModal = document.getElementById('srs-modal');
    const srsProgress = document.getElementById('srs-progress');
    const srsCard = document.getElementById('srs-card');
    const srsControls = document.getElementById('srs-controls');
    const srsWordOriginal = document.getElementById('srs-word-original');
    const srsWordTranslation = document.getElementById('srs-word-translation');
    const srsShowAnswerBtn = document.getElementById('srs-show-answer-btn');
    const srsFeedbackButtons = document.getElementById('srs-feedback-buttons');
    const srsIncorrectBtn = document.getElementById('srs-incorrect-btn');
    const srsCorrectBtn = document.getElementById('srs-correct-btn');
    const srsCompletionMessage = document.getElementById('srs-completion-message');
    const deleteWordModal = document.getElementById('delete-word-modal');
    const deleteWordConfirmBtn = document.getElementById('delete-word-confirm-btn');
    const deleteWordCancelBtn = document.getElementById('delete-word-cancel-btn');
    let wordIdToDelete = null; // 用于暂存将要删除的单词ID

    let srsSession = {
        words: [],
        currentIndex: 0,
        correctAnswers: 0
    };

    const addWordForm = document.getElementById('add-word-form');
    const originalWordInput = document.getElementById('original-word-input');
    const translationInput = document.getElementById('translation-input');
    const wordListDiv = document.getElementById('word-list');

    function renderLanguagePage() {
        wordListDiv.innerHTML = ''; // 清空现有列表

        if (db.languageLearning.words.length === 0) {
            wordListDiv.innerHTML = '<p>您的词库是空的，请添加新单词。</p>';
            return;
        }

        db.languageLearning.words.forEach(word => {
            const wordItem = document.createElement('div');
            wordItem.className = 'word-item';
            wordItem.innerHTML = `
            <span class="word-text">${word.original} - ${word.translation}</span>
            <button class="delete-word-btn" data-id="${word.id}">删除</button>
        `;
            wordListDiv.appendChild(wordItem);
        });
    }
    wordListDiv.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-word-btn')) {
            wordIdToDelete = e.target.dataset.id; // 暂存ID
            deleteWordModal.classList.add('visible'); // 显示自定义弹窗
        }
    });

    // --- 紧接着，在下面粘贴处理弹窗按钮的全新逻辑 ---
    deleteWordCancelBtn.addEventListener('click', () => {
        deleteWordModal.classList.remove('visible');
        wordIdToDelete = null; // 清空ID
    });

    deleteWordConfirmBtn.addEventListener('click', () => {
        if (wordIdToDelete) {
            db.languageLearning.words = db.languageLearning.words.filter(word => word.id !== wordIdToDelete);
            saveToStorage();
            renderLanguagePage(); // 重新渲染列表
        }
        deleteWordModal.classList.remove('visible');
        wordIdToDelete = null; // 清空ID
    });

    addWordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const original = originalWordInput.value.trim();
        const translation = translationInput.value.trim();

        if (original && translation) {
            const today = new Date().toISOString().split('T')[0];

            const newWord = {
                id: `word-${Date.now()}`,
                original: original,
                translation: translation,
                srsLevel: 0, // 初始SRS等级为0
                nextReviewDate: today, // 新词立即可以复习
                lastReviewed: null
            };

            db.languageLearning.words.push(newWord);
            saveToStorage();
            renderLanguagePage(); // 重新渲染列表
            renderTodayVocabularyModule(); 

            // 清空输入框
            originalWordInput.value = '';
            translationInput.value = '';
        }
    });
    function updateWordSrs(wordId, rememberedCorrectly) {
        const word = db.languageLearning.words.find(w => w.id === wordId);
        if (!word) return;

        const today = new Date().toISOString().split('T')[0];

        if (rememberedCorrectly) {
            // 如果答对，SRS等级提升
            word.srsLevel++;
        } else {
            // 如果答错，SRS等级降级 (降到1级，而不是0，避免过度惩罚)
            word.srsLevel = 1;
        }
        
        // 从配置中获取新的复习间隔
        // 注意：如果等级超过数组长度，我们使用最后一个间隔
        let interval = SRS_INTERVALS[word.srsLevel - 1] || SRS_INTERVALS[SRS_INTERVALS.length - 1];

        // 计算并更新下一次复习日期
        word.nextReviewDate = addDaysToDate(today, interval);
        word.lastReviewed = today;

        console.log(`单词 "${word.original}" 已更新。新等级: ${word.srsLevel}, 下次复习: ${word.nextReviewDate}`);
    }

    // 核心函数2：获取今天所有需要复习的单词
    function getTodaysReviewWords() {
        const today = new Date().toISOString().split('T')[0];
        return db.languageLearning.words.filter(word => {
            return word.nextReviewDate <= today;
        });
    }
    function startSrsSession() {
        const wordsToReview = getTodaysReviewWords();
        if (wordsToReview.length === 0) {
            alert("今天没有需要学习的单词！");
            return;
        }

        // 打乱数组顺序，增加随机性
        srsSession.words = wordsToReview.sort(() => Math.random() - 0.5);
        srsSession.currentIndex = 0;
        srsSession.correctAnswers = 0;

        srsCompletionMessage.style.display = 'none';
        srsCard.style.display = 'flex';
        srsControls.style.display = 'block';

        showSrsCard();
        srsModal.classList.add('visible');
    }

    function showSrsCard() {
        if (srsSession.currentIndex >= srsSession.words.length) {
            endSrsSession();
            return;
        }

        const currentWord = srsSession.words[srsSession.currentIndex];

        // 核心修改：将进度条从 "x / y" 改为 "剩余 z 个"
        const wordsRemaining = srsSession.words.length - srsSession.currentIndex;
        srsProgress.textContent = `剩余 ${wordsRemaining} 个`;

        srsWordOriginal.textContent = currentWord.original;
        srsWordTranslation.textContent = currentWord.translation;

        srsWordTranslation.style.display = 'none';
        srsShowAnswerBtn.style.display = 'block';
        srsFeedbackButtons.style.display = 'none';
    }

    srsShowAnswerBtn.addEventListener('click', () => {
        srsWordTranslation.style.display = 'block';
        srsShowAnswerBtn.style.display = 'none';
        srsFeedbackButtons.style.display = 'flex';
    });

    srsIncorrectBtn.addEventListener('click', () => handleSrsAnswer(false));
    srsCorrectBtn.addEventListener('click', () => handleSrsAnswer(true));

    function handleSrsAnswer(rememberedCorrectly) {
        const currentWord = srsSession.words[srsSession.currentIndex];

        // 核心修改：如果答错了，则将该单词重新添加到学习队列的末尾
        if (!rememberedCorrectly) {
            srsSession.words.push(currentWord);
        }

        // 无论对错，都更新其SRS等级和下次复习日期
        // 答对了会升级，答错了会降级到第1级（第二天复习）
        updateWordSrs(currentWord.id, rememberedCorrectly);

        if (rememberedCorrectly) {
            srsSession.correctAnswers++;
        }

        srsSession.currentIndex++;
        showSrsCard();
    }

    function endSrsSession() {
        srsCard.style.display = 'none';
        srsControls.style.display = 'none';
        srsCompletionMessage.style.display = 'block';

        // 每个答对的单词奖励2个学识点
        const pointsEarned = srsSession.correctAnswers * 1;
        if (pointsEarned > 0) {
            addKnowledgePoints(pointsEarned, '完成今日词汇学习');
        }

        saveToStorage();
        renderTodayVocabularyModule(); // 更新主页模块状态

        // 3秒后自动关闭弹窗
        setTimeout(() => {
            srsModal.classList.remove('visible');
        }, 3000);
    }

    // --- 主页模块渲染 ---
    function renderTodayVocabularyModule() {
        const container = document.getElementById('today-vocabulary-content');
        const wordsToReview = getTodaysReviewWords();

        if (wordsToReview.length > 0) {
            container.innerHTML = `
                <p>有 <strong>${wordsToReview.length}</strong> 个词汇等待您复习。</p>
                <button id="start-srs-btn" class="check-in-btn">开始学习</button>
            `;
            document.getElementById('start-srs-btn').addEventListener('click', startSrsSession);
        } else {
            container.innerHTML = `<p>今日学习任务已全部完成！🎉</p>`;
        }
    }
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // 生成新的每日任务
    function generateDailyTasks() {
        shuffleArray(DAILY_TASK_POOL);
        db.tasks.daily = DAILY_TASK_POOL.slice(0, 5).map(task => ({ ...task, completed: false }));
        console.log("新的每日任务已生成:", db.tasks.daily);
    }

    // 生成新的每周任务
    function generateWeeklyTasks() {
        shuffleArray(WEEKLY_TASK_POOL);
        db.tasks.weekly = WEEKLY_TASK_POOL.slice(0, 7).map(task => ({ ...task, completed: false }));
        console.log("新的每周任务已生成:", db.tasks.weekly);
    }

    // 检查是否需要刷新任务
    function checkAndRefreshTasks() {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // 检查每日任务
        if (db.lastDailyTaskRefresh !== todayStr || !db.tasks.daily || db.tasks.daily.length === 0) {
            generateDailyTasks();
            db.lastDailyTaskRefresh = todayStr;
            saveToStorage();
        }

        // 检查每周任务 (每周一刷新)
        const dayOfWeek = today.getDay(); // 0 = 周日, 1 = 周一
        const isMonday = dayOfWeek === 1;
        const lastMonday = new Date(today);
        lastMonday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const lastMondayStr = lastMonday.toISOString().split('T')[0];

        if ((isMonday && db.lastWeeklyTaskRefresh !== lastMondayStr) || !db.tasks.weekly || db.tasks.weekly.length === 0) {
            generateWeeklyTasks();
            db.lastWeeklyTaskRefresh = lastMondayStr;
            saveToStorage();
        }
    }

    // 渲染任务页面
    function renderTasksPage() {
        const dailyList = document.getElementById('daily-tasks-list');
        const weeklyList = document.getElementById('weekly-tasks-list');
        dailyList.innerHTML = '';
        weeklyList.innerHTML = '';

        // 渲染每日任务
        db.tasks.daily.forEach(task => {
            const item = document.createElement('div');
            item.className = `task-item ${task.completed ? 'completed' : ''}`;
            // V V V 核心改动在这里 V V V
            item.innerHTML = `
            <div class="task-info">
                <p class="task-name">${task.description}</p>
                <p class="task-reward">+${task.reward} 学识点</p>
            </div>
            <button class="task-status" data-task-id="${task.id}" data-task-type="daily" ${task.completed ? 'disabled' : ''}>
                ${task.completed ? '✓' : '完成'}
            </button>
        `;
            // ^ ^ ^ 核心改动在这里 ^ ^ ^
            dailyList.appendChild(item);
        });

        // 渲染每周任务
        db.tasks.weekly.forEach(task => {
            const item = document.createElement('div');
            item.className = `task-item ${task.completed ? 'completed' : ''}`;
            // V V V 核心改动在这里 V V V
            item.innerHTML = `
            <div class="task-info">
                <p class="task-name">${task.description}</p>
                <p class="task-reward">+${task.reward} 学识点</p>
            </div>
            <button class="task-status" data-task-id="${task.id}" data-task-type="weekly" ${task.completed ? 'disabled' : ''}>
                ${task.completed ? '✓' : '完成'}
            </button>
        `;
            // ^ ^ ^ 核心改动在这里 ^ ^ ^
            weeklyList.appendChild(item);
        });
    }

    // 绑定任务完成事件
    function setupTaskCompletionListener() {
        const tasksPage = document.getElementById('tasks-page');
        tasksPage.addEventListener('click', (e) => {
            if (e.target.classList.contains('task-status') && !e.target.disabled) {
                const button = e.target;
                const taskId = button.dataset.taskId;
                const taskType = button.dataset.taskType;

                let task = null;
                if (taskType === 'daily') {
                    task = db.tasks.daily.find(t => t.id === taskId);
                } else {
                    task = db.tasks.weekly.find(t => t.id === taskId);
                }

                if (task && !task.completed) {
                    task.completed = true;
                    addKnowledgePoints(task.reward, `完成任务: ${task.description}`);
                    saveToStorage();
                    renderTasksPage(); // 重新渲染以更新按钮状态
                    renderTodayPage(); // 更新主页的学识点
                    renderCheckinPage(); // 更新签到页的学识点
                }
            }
        });
    }

    // --- 12. Initialization Function ---
    // --- 12. Initialization Function ---
    function initialize() {
        loadFromStorage();
        checkAndRefreshTasks(); // <--- 就是添加这一行关键代码，命令任务系统开始工作
        setupNavigation();
        renderTodayPage();
        loadChatHistory();
        renderSchedule();

        const timelineDatePicker = document.getElementById('timeline-date-picker');
        timelineDatePicker.value = new Date().toISOString().split('T')[0];
        renderTimeline();

        checkAndHandleBrokenStreaks();
        renderHabits();

        loadSacredTexts();
        setupSacredTextsSaving();
        renderCheckinPage();
        renderMoments();
        updateNotificationDot();
        setTimeout(getNewsSummary, 100); // 延迟100毫秒执行

        // 使用新的函数来初始化按钮状态
        const todayCheckinBtn = document.getElementById('today-checkin-btn');
        if (todayCheckinBtn) {
            todayCheckinBtn.addEventListener('click', handleCheckIn);
            updateTodayCheckinButtonState(); // 使用新函数进行初始化
            triggerDailySpontaneousPost();
        }
        renderStaticAvatars();
        renderLanguagePage();
        renderTodayVocabularyModule();
        renderTasksPage();
        setupTaskCompletionListener();
    }
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                }).catch(error => {
                    console.log('ServiceWorker registration failed: ', error);
                });
            });
        }
    }

    let currentDisplayDate = new Date();

    const spendPointsModal = document.getElementById('spend-points-modal');
    const openSpendModalBtn = document.getElementById('open-spend-modal-btn');
    const spendModalInput = document.getElementById('spend-points-modal-input');
    const spendModalCancelBtn = document.getElementById('spend-modal-cancel-btn');
    const spendModalConfirmBtn = document.getElementById('spend-modal-confirm-btn');

    // 2. 减少学识点的核心函数
    function subtractKnowledgePoints(amount) {
        // 验证输入是否为有效数字
        if (isNaN(amount) || amount <= 0) {
            alert("请输入一个有效的正数。");
            return;
        }
        // 验证学识点是否足够
        if (db.knowledgePoints < amount) {
            alert("学识点不足！");
            return;
        }

        db.knowledgePoints -= amount;
        console.log(`消耗了 ${amount} 学识点。`);

        saveToStorage();
        // 更新所有显示学识点的地方
        renderTodayPage();
        renderCheckinPage();
    }

    // 3. 为主页的“使用”按钮添加事件：打开弹窗
    if (openSpendModalBtn) {
        openSpendModalBtn.addEventListener('click', () => {
            spendModalInput.value = ''; // 确保每次打开时输入框是空的
            spendPointsModal.classList.add('visible');
        });
    }

    // 4. 为弹窗的“取消”按钮添加事件：关闭弹窗
    if (spendModalCancelBtn) {
        spendModalCancelBtn.addEventListener('click', () => {
            spendPointsModal.classList.remove('visible');
        });
    }

    // 5. 为弹窗的“确认”按钮添加事件：执行消耗并关闭弹窗
    if (spendModalConfirmBtn) {
        spendModalConfirmBtn.addEventListener('click', () => {
            const amount = parseInt(spendModalInput.value, 10);
            subtractKnowledgePoints(amount); // 调用核心的消耗函数
            spendPointsModal.classList.remove('visible'); // 关闭弹窗
        });
    }
    function renderCheckinPage() {
        const year = currentDisplayDate.getFullYear();
        const month = currentDisplayDate.getMonth(); // 0-11

        monthYearDisplay.textContent = `${year}年 ${month + 1}月`;

    // 更新统计数据
        knowledgePointsDisplay.textContent = `学识点: ${db.knowledgePoints}`;
        updateStreak(); // 更新连续签到天数
        streakDisplay.textContent = `连续签到: ${db.consecutiveCheckInDays} 天`;

        // 更新签到按钮状态
        doCheckinBtn.disabled = !!db.checkIns[today];
        doCheckinBtn.textContent = db.checkIns[today] ? '今日已签到' : '签到';

        // 渲染日历格子
        calendarGrid.innerHTML = '';
        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=周日, 1=周一
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // 填充空白格子
        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarGrid.innerHTML += `<div class="calendar-day not-current-month"></div>`;
        }

        // 填充日期格子
        for (let i = 1; i <= daysInMonth; i++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.textContent = i;

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

            if (db.checkIns[dateStr]) {
                dayEl.classList.add('checked-in');
            }

            const todayDate = new Date();
            if (i === todayDate.getDate() && year === todayDate.getFullYear() && month === todayDate.getMonth()) {
                dayEl.classList.add('is-today');
            }

            calendarGrid.appendChild(dayEl);
        }
    }

    function updateStreak() {
        if (!db.lastCheckInDate) {
            db.consecutiveCheckInDays = 0;
            return;
        }

        const lastDate = new Date(db.lastCheckInDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        // 如果最后签到日期不是昨天，且不是今天，则中断
        if (lastDate.toDateString() !== yesterday.toDateString() && lastDate.toDateString() !== new Date().toDateString()) {
            db.consecutiveCheckInDays = 0;
        }
    }
    function addKnowledgePoints(amount, reason) {
        db.knowledgePoints += amount;
        console.log(`获得 ${amount} 学识点，原因：${reason}`);
    }

    function handleCheckIn() {
        const today = new Date().toISOString().split('T')[0];
        if (db.checkIns[today]) {
            console.log("今天已经签到过了。");
            return;
        }

        // 1. 更新连续签到天数
        updateStreak(); // 先检查是否中断
        if (db.consecutiveCheckInDays === 0) {
            db.consecutiveCheckInDays = 1;
        } else {
            const lastDate = new Date(db.lastCheckInDate);
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            if (lastDate.toDateString() === yesterday.toDateString()) {
                db.consecutiveCheckInDays++;
            } else {
                db.consecutiveCheckInDays = 1;
            }
        }

        const basePoints = 5;
        const streakBonus = db.consecutiveCheckInDays;
        const pointsEarned = basePoints + streakBonus;

        addKnowledgePoints(pointsEarned, `每日签到 (连续第${db.consecutiveCheckInDays}天)`);

        // 2. 记录签到
        db.checkIns[today] = true;
        db.lastCheckInDate = today;

        // 3. 保存并重新渲染 (核心修改)
        saveToStorage();
        renderCheckinPage();           // 更新日历页面
        renderTodayPage();             // 新增：更新主页的学识点等模块
        updateTodayCheckinButtonState(); // 新增：立刻更新主页签到按钮的状态
    }

    prevMonthBtn.addEventListener('click', () => {
        currentDisplayDate.setMonth(currentDisplayDate.getMonth() - 1);
        renderCheckinPage();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDisplayDate.setMonth(currentDisplayDate.getMonth() + 1);
        renderCheckinPage();
    });

    doCheckinBtn.addEventListener('click', handleCheckIn);

    // Run the app!
    initialize();
});