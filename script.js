// ============================================
// ZAIN LIVE - VOICE ROOM WITH WEBSOCKET
// ============================================

// ============================================
// WEBSOCKET CONFIGURATION
// ============================================

const WebSocketConfig = {
    // Change to your actual WebSocket server URL
    // Local: 'ws://localhost:8080'
    // Production: 'wss://your-domain.com/ws'
    url: 'ws://localhost:8080',
    reconnectAttempts: 5,
    reconnectDelay: 3000,
    messageTimeout: 30000,
    pingInterval: 30000,
};

// ============================================
// WEBSOCKET CONNECTION MANAGER
// ============================================

class WebSocketManager {
    constructor(config) {
        this.config = config;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.isConnected = false;
        this.messageQueue = [];
        this.listeners = new Map();
        this.pingTimer = null;
        this.messageHandlers = {};
        this.userId = this.generateUserId();
        this.username = `User${this.userId.substring(0, 5)}`;
        this.userAvatar = Math.floor(Math.random() * 70);
    }

    /**
     * Initialize WebSocket connection
     */
    connect() {
        try {
            console.log(`🔌 Connecting to WebSocket: ${this.config.url}`);
            this.ws = new WebSocket(this.config.url);

            this.ws.onopen = () => this.onOpen();
            this.ws.onmessage = (event) => this.onMessage(event);
            this.ws.onerror = (error) => this.onError(error);
            this.ws.onclose = () => this.onClose();
        } catch (error) {
            console.error('❌ WebSocket connection error:', error);
            this.updateConnectionStatus('error', 'Connection Failed');
            this.attemptReconnect();
        }
    }

    /**
     * Handle successful connection
     */
    onOpen() {
        console.log('✅ WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.updateConnectionStatus('connected', 'Connected');
        
        // Send user info to server
        this.send('user:join', {
            userId: this.userId,
            username: this.username,
            userAvatar: this.userAvatar,
            roomId: 'tech-talk-room',
        });

        // Flush message queue
        this.flushMessageQueue();

        // Start ping to keep connection alive
        this.startPing();

        // Emit custom event
        this.emit('connected');
    }

    /**
     * Handle incoming messages
     */
    onMessage(event) {
        try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        } catch (error) {
            console.error('❌ Message parse error:', error);
        }
    }

    /**
     * Handle message routing
     */
    handleMessage(data) {
        const { type, payload } = data;
        
        console.log(`📨 Received: ${type}`, payload);

        // Emit type-specific event
        this.emit(type, payload);

        // Call registered handler if exists
        if (this.messageHandlers[type]) {
            this.messageHandlers[type](payload);
        }

        // Also emit generic message event
        this.emit('message', data);
    }

    /**
     * Handle connection errors
     */
    onError(error) {
        console.error('❌ WebSocket error:', error);
        this.updateConnectionStatus('error', 'Connection Error');
    }

    /**
     * Handle connection close
     */
    onClose() {
        console.log('🔌 WebSocket disconnected');
        this.isConnected = false;
        this.stopPing();
        this.updateConnectionStatus('disconnected', 'Disconnected');
        this.attemptReconnect();
    }

    /**
     * Send message to server
     */
    send(type, payload = {}) {
        const message = {
            type,
            payload,
            timestamp: Date.now(),
        };

        if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
            console.log(`📤 Sent: ${type}`, payload);
        } else {
            console.warn(`⚠️ WebSocket not ready, queueing message: ${type}`);
            this.messageQueue.push(message);
            this.updateConnectionStatus('connecting', 'Reconnecting...');
        }
    }

    /**
     * Flush queued messages
     */
    flushMessageQueue() {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            this.ws.send(JSON.stringify(message));
            console.log(`📤 Flushed: ${message.type}`);
        }
    }

    /**
     * Register message handler
     */
    on(type, callback) {
        this.messageHandlers[type] = callback;
    }

    /**
     * Emit custom events
     */
    emit(eventName, data) {
        const event = new CustomEvent(`ws:${eventName}`, { detail: data });
        document.dispatchEvent(event);
    }

    /**
     * Keep connection alive with ping
     */
    startPing() {
        this.pingTimer = setInterval(() => {
            this.send('ping', { userId: this.userId });
        }, this.config.pingInterval);
    }

    stopPing() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }

    /**
     * Attempt to reconnect
     */
    attemptReconnect() {
        if (this.reconnectAttempts < this.config.reconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.config.reconnectDelay * this.reconnectAttempts;
            console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
            
            setTimeout(() => {
                this.updateConnectionStatus('connecting', 'Reconnecting...');
                this.connect();
            }, delay);
        } else {
            console.error('❌ Max reconnection attempts reached');
            this.updateConnectionStatus('error', 'Connection Lost');
        }
    }

    /**
     * Update UI connection status
     */
    updateConnectionStatus(state, text) {
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');
        const chatStatus = document.getElementById('chatStatus');
        const chatConnectionStatus = document.getElementById('chatConnectionStatus');

        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${state}`;
        }
        if (statusText) {
            statusText.textContent = text;
        }

        // Update chat status
        if (chatStatus) {
            const icon = state === 'connected' ? 'fa-circle' : 'fa-circle-notch';
            const cssClass = state === 'connected' ? '' : 'reconnecting';
            chatStatus.innerHTML = `<i class="fas ${icon} ${cssClass}"></i> ${state === 'connected' ? 'Live' : 'Reconnecting'}`;
        }

        // Show reconnection warning
        if (chatConnectionStatus) {
            chatConnectionStatus.style.display = state !== 'connected' ? 'flex' : 'none';
        }

        // Debug log
        this.debugLog(`Status: ${state} - ${text}`);
    }

    /**
     * Generate unique user ID
     */
    generateUserId() {
        return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Debug console logging
     */
    debugLog(message) {
        const debugOutput = document.getElementById('debugOutput');
        if (debugOutput) {
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = document.createElement('div');
            logEntry.className = 'debug-entry';
            logEntry.textContent = `[${timestamp}] ${message}`;
            debugOutput.insertBefore(logEntry, debugOutput.firstChild);
            
            // Keep only last 20 entries
            while (debugOutput.children.length > 20) {
                debugOutput.removeChild(debugOutput.lastChild);
            }
        }
    }

    /**
     * Close connection gracefully
     */
    disconnect() {
        this.stopPing();
        if (this.ws) {
            this.ws.close();
        }
    }
}

// ============================================
// STATE MANAGEMENT
// ============================================

const AppState = {
    isMicOn: false,
    isHandRaised: false,
    chatOpen: false,
    handRaisedCount: 0,
    giftCount: 0,
    lastGift: '💎',
    unreadMessages: 3,
};

// ============================================
// GLOBAL WEBSOCKET INSTANCE
// ============================================

let ws = null;

// ============================================
// DOM ELEMENTS
// ============================================

const Elements = {
    // Buttons
    micBtn: document.getElementById('micBtn'),
    handBtn: document.getElementById('handBtn'),
    chatBtn: document.getElementById('chatBtn'),
    giftBtn: document.getElementById('giftBtn'),
    leaveBtn: document.getElementById('leaveBtn'),
    backBtn: document.getElementById('backBtn'),
    moreBtn: document.getElementById('moreBtn'),
    
    // Chat
    chatOverlay: document.getElementById('chatOverlay'),
    closeChatBtn: document.getElementById('closeChatBtn'),
    chatInput: document.getElementById('chatInput'),
    sendChatBtn: document.getElementById('sendChatBtn'),
    chatMessages: document.getElementById('chatMessages'),
    
    // Gift Popup
    emojiPopup: document.getElementById('emojiPopup'),
    closeEmojiBtn: document.getElementById('closeEmojiBtn'),
    emojiButtons: document.querySelectorAll('.emoji-btn'),
    
    // Indicators
    handRaisedIndicator: document.getElementById('handRaisedIndicator'),
    handRaisedCount: document.getElementById('handRaisedCount'),
    giftIndicator: document.getElementById('giftIndicator'),
    giftCount: document.getElementById('giftCount'),
    lastGiftDisplay: document.getElementById('lastGift'),
    
    // Connection Status
    statusIndicator: document.getElementById('statusIndicator'),
    statusText: document.getElementById('statusText'),
    chatStatus: document.getElementById('chatStatus'),
    
    // Other
    chatBadge: document.getElementById('chatBadge'),
    toastContainer: document.getElementById('toastContainer'),
    listenersGrid: document.getElementById('listenersGrid'),
    debugToggle: document.getElementById('debugToggle'),
    debugConsole: document.getElementById('debugConsole'),
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize WebSocket
    ws = new WebSocketManager(WebSocketConfig);
    ws.connect();

    // Setup event listeners
    initializeEventListeners();
    setupWebSocketHandlers();
    setupCustomEventListeners();
    
    generateListenerAvatars();
    updateUI();

    // Enable debug console in development (disable in production)
    setupDebugConsole();

    console.log('✅ Zain Live Voice Room initialized with WebSocket');
});

// ============================================
// WEBSOCKET MESSAGE HANDLERS
// ============================================

function setupWebSocketHandlers() {
    // Listen for chat messages
    ws.on('chat:message', (payload) => {
        addRemoteMessage(payload);
    });

    // Listen for hand raise events
    ws.on('action:handRaise', (payload) => {
        handleRemoteHandRaise(payload);
    });

    // Listen for gift events
    ws.on('action:gift', (payload) => {
        handleRemoteGift(payload);
    });

    // Listen for user status changes
    ws.on('user:statusChange', (payload) => {
        handleUserStatusChange(payload);
    });

    // Listen for listener count updates
    ws.on('room:listenerUpdate', (payload) => {
        updateListenerCount(payload);
    });

    // Listen for microphone state changes from other users
    ws.on('user:micToggle', (payload) => {
        handleRemoteMicToggle(payload);
    });

    // Connection events
    document.addEventListener('ws:connected', () => {
        console.log('🎉 WebSocket connection established');
        showToast('Connected to room', 'success');
    });

    document.addEventListener('ws:message', (e) => {
        ws.debugLog(`Message received: ${e.detail.type}`);
    });
}

// ============================================
// CUSTOM EVENT LISTENERS
// ============================================

function setupCustomEventListeners() {
    // Listen for pong response
    ws.on('pong', (payload) => {
        console.log('💓 Pong received - connection active');
    });

    // Listen for room announcements
    ws.on('room:announcement', (payload) => {
        showToast(payload.message, 'info');
    });

    // Listen for error messages
    ws.on('error', (payload) => {
        console.error('🔴 Server error:', payload);
        showToast(payload.message || 'An error occurred', 'error');
    });
}

// ============================================
// REMOTE MESSAGE HANDLERS
// ============================================

function addRemoteMessage(data) {
    const { userId, username, userAvatar, text, timestamp } = data;
    
    if (!AppState.chatOpen) {
        AppState.unreadMessages++;
        updateChatBadge();
    }

    const messageGroup = document.createElement('div');
    messageGroup.className = 'message-group';
    messageGroup.innerHTML = `
        <div class="message-item">
            <img src="https://i.pravatar.cc/150?img=${userAvatar}" alt="${username}" class="message-avatar">
            <div class="message-content">
                <span class="message-author">${escapeHtml(username)}</span>
                <p class="message-text">${escapeHtml(text)}</p>
                <span class="message-time">${formatTime(timestamp)}</span>
            </div>
        </div>
    `;

    Elements.chatMessages.appendChild(messageGroup);
    Elements.chatMessages.scrollTop = Elements.chatMessages.scrollHeight;

    console.log(`💬 Message from ${username}: ${text}`);
}

function handleRemoteHandRaise(data) {
    const { userId, username } = data;
    AppState.handRaisedCount++;
    Elements.handRaisedCount.textContent = AppState.handRaisedCount;
    Elements.handRaisedIndicator.style.display = 'flex';
    showToast(`${username} raised their hand!`, 'info');
}

function handleRemoteGift(data) {
    const { userId, username, emoji } = data;
    AppState.giftCount++;
    AppState.lastGift = emoji;

    Elements.lastGiftDisplay.textContent = emoji;
    Elements.giftCount.textContent = AppState.giftCount;
    Elements.giftIndicator.style.display = 'flex';

    createFloatingGift(emoji);
    showToast(`${username} sent ${emoji}!`, 'success');
}

function handleUserStatusChange(data) {
    const { userId, username, status } = data;
    console.log(`👤 ${username} is now ${status}`);
}

function handleRemoteMicToggle(data) {
    const { userId, username, micOn } = data;
    console.log(`🎤 ${username} turned mic ${micOn ? 'ON' : 'OFF'}`);
}

function updateListenerCount(data) {
    const { count } = data;
    const listenerCountEl = document.getElementById('listenerCount');
    if (listenerCountEl) {
        listenerCountEl.textContent = formatNumber(count);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function initializeEventListeners() {
    // Bottom Navigation
    Elements.micBtn.addEventListener('click', toggleMicrophone);
    Elements.handBtn.addEventListener('click', toggleHandRaise);
    Elements.chatBtn.addEventListener('click', toggleChat);
    Elements.giftBtn.addEventListener('click', toggleGiftPopup);
    Elements.leaveBtn.addEventListener('click', leaveRoom);
    
    // Header
    Elements.backBtn.addEventListener('click', leaveRoom);
    Elements.moreBtn.addEventListener('click', showMoreOptions);
    
    // Chat
    Elements.closeChatBtn.addEventListener('click', closeChat);
    Elements.sendChatBtn.addEventListener('click', sendMessage);
    Elements.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Gift/Emoji
    Elements.closeEmojiBtn.addEventListener('click', closeGiftPopup);
    Elements.emojiButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            sendGift(e.currentTarget.dataset.emoji);
        });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // Debug toggle
    if (Elements.debugToggle) {
        Elements.debugToggle.addEventListener('click', toggleDebugConsole);
    }
}

// ============================================
// MICROPHONE TOGGLE
// ============================================

function toggleMicrophone() {
    AppState.isMicOn = !AppState.isMicOn;
    Elements.micBtn.classList.toggle('active');
    
    createRipple(Elements.micBtn);

    // Send to server
    ws.send('action:micToggle', {
        micOn: AppState.isMicOn,
    });
    
    if (AppState.isMicOn) {
        showToast('Microphone enabled', 'success');
    } else {
        showToast('Microphone disabled', 'warning');
    }
    
    updateUI();
}

// ============================================
// HAND RAISE TOGGLE
// ============================================

function toggleHandRaise() {
    AppState.isHandRaised = !AppState.isHandRaised;
    Elements.handBtn.classList.toggle('active');
    
    // Send to server
    ws.send('action:handRaise', {
        raised: AppState.isHandRaised,
    });

    if (AppState.isHandRaised) {
        AppState.handRaisedCount++;
        Elements.handRaisedCount.textContent = AppState.handRaisedCount;
        Elements.handRaisedIndicator.style.display = 'flex';
        showToast('Hand raised! Waiting for host approval', 'info');
    } else {
        showToast('Hand lowered', 'info');
    }
    
    updateUI();
}

// ============================================
// CHAT FUNCTIONALITY
// ============================================

function toggleChat() {
    AppState.chatOpen = !AppState.chatOpen;
    Elements.chatOverlay.classList.toggle('active');
    Elements.chatBtn.classList.toggle('active');
    
    if (AppState.chatOpen) {
        Elements.chatInput.focus();
        AppState.unreadMessages = 0;
        updateChatBadge();
    }
}

function closeChat() {
    AppState.chatOpen = false;
    Elements.chatOverlay.classList.remove('active');
    Elements.chatBtn.classList.remove('active');
}

function sendMessage() {
    const message = Elements.chatInput.value.trim();
    
    if (!message || !ws.isConnected) {
        if (!ws.isConnected) {
            showToast('Not connected to room', 'error');
        }
        return;
    }
    
    // Send message via WebSocket
    ws.send('chat:message', {
        text: message,
        username: ws.username,
        userAvatar: ws.userAvatar,
    });

    // Add to local chat immediately for better UX
    const messageGroup = document.createElement('div');
    messageGroup.className = 'message-group';
    messageGroup.innerHTML = `
        <div class="message-item">
            <img src="https://i.pravatar.cc/150?img=${ws.userAvatar}" alt="You" class="message-avatar">
            <div class="message-content">
                <span class="message-author">You</span>
                <p class="message-text">${escapeHtml(message)}</p>
                <span class="message-time">${getCurrentTime()}</span>
            </div>
        </div>
    `;
    
    Elements.chatMessages.appendChild(messageGroup);
    Elements.chatMessages.scrollTop = Elements.chatMessages.scrollHeight;
    
    Elements.chatInput.value = '';
    
    console.log('📤 Message sent:', message);
}

function updateChatBadge() {
    if (AppState.unreadMessages > 0) {
        Elements.chatBadge.textContent = AppState.unreadMessages;
        Elements.chatBadge.style.display = 'flex';
    } else {
        Elements.chatBadge.style.display = 'none';
    }
}

// ============================================
// GIFT/EMOJI FUNCTIONALITY
// ============================================

function toggleGiftPopup() {
    Elements.emojiPopup.classList.toggle('active');
}

function closeGiftPopup() {
    Elements.emojiPopup.classList.remove('active');
}

function sendGift(emoji) {
    AppState.giftCount++;
    AppState.lastGift = emoji;
    
    // Send via WebSocket
    ws.send('action:gift', {
        emoji: emoji,
        username: ws.username,
        userAvatar: ws.userAvatar,
    });

    Elements.lastGiftDisplay.textContent = emoji;
    Elements.giftCount.textContent = AppState.giftCount;
    Elements.giftIndicator.style.display = 'flex';
    
    createFloatingGift(emoji);
    closeGiftPopup();
    showToast(`Sent ${emoji} gift!`, 'success');
    
    Elements.giftIndicator.style.animation = 'none';
    setTimeout(() => {
        Elements.giftIndicator.style.animation = '';
    }, 10);
}

function createFloatingGift(emoji) {
    const gift = document.createElement('div');
    gift.textContent = emoji;
    gift.style.cssText = `
        position: fixed;
        font-size: 3rem;
        pointer-events: none;
        z-index: 100;
        left: ${Math.random() * window.innerWidth}px;
        top: ${window.innerHeight}px;
        opacity: 1;
    `;
    
    document.body.appendChild(gift);
    
    let top = window.innerHeight;
    let opacity = 1;
    const animation = setInterval(() => {
        top -= 3;
        opacity -= 0.02;
        gift.style.top = top + 'px';
        gift.style.opacity = opacity;
        
        if (opacity <= 0) {
            clearInterval(animation);
            document.body.removeChild(gift);
        }
    }, 20);
}

// ============================================
// LEAVE ROOM
// ============================================

function leaveRoom() {
    const confirmed = confirm('Are you sure you want to leave this room?');
    
    if (confirmed) {
        showToast('Leaving room...', 'info');

        // Send leave event to server
        ws.send('user:leave', {
            username: ws.username,
        });

        // Disconnect WebSocket
        setTimeout(() => {
            ws.disconnect();
            showToast('Left room', 'success');
            console.log('🚪 User left the room');
        }, 500);
    }
}

// ============================================
// MORE OPTIONS
// ============================================

function showMoreOptions() {
    const options = ['Share Room', 'Report', 'Block', 'Settings'];
    const choice = prompt(`${options.join('\n')}\n\nEnter number (1-${options.length})`);
    
    if (choice && choice >= 1 && choice <= options.length) {
        const selected = options[choice - 1];
        ws.send('user:action', {
            action: selected,
        });
        showToast(`${selected} selected`, 'info');
    }
}

// ============================================
// LISTENER AVATARS GENERATION
// ============================================

function generateListenerAvatars() {
    const listenerCount = 12;
    let html = '';
    
    for (let i = 0; i < listenerCount; i++) {
        html += `
            <img 
                src="https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}" 
                alt="Listener ${i + 1}" 
                class="listener-avatar"
                title="Listener ${i + 1}"
            >
        `;
    }
    
    Elements.listenersGrid.innerHTML = html;
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

function handleKeyboardShortcuts(e) {
    if (e.ctrlKey || e.metaKey) return;
    
    switch (e.key.toLowerCase()) {
        case 'm':
            if (!isInputActive()) toggleMicrophone();
            break;
        case 'h':
            if (!isInputActive()) toggleHandRaise();
            break;
        case 'c':
            if (!isInputActive()) toggleChat();
            break;
        case 'g':
            if (!isInputActive()) toggleGiftPopup();
            break;
        case 'escape':
            if (AppState.chatOpen) closeChat();
            if (Elements.emojiPopup.classList.contains('active')) closeGiftPopup();
            break;
    }
}

function isInputActive() {
    return document.activeElement === Elements.chatInput;
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        warning: 'fa-exclamation-circle',
        error: 'fa-times-circle',
        info: 'fa-info-circle',
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
    `;
    
    Elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 300ms';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatTime(timestamp) {
    if (!timestamp) return getCurrentTime();
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function createRipple(element) {
    const ripple = document.createElement('span');
    ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
    `;
    
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
    
    return ripple;
}

// ============================================
// UI UPDATE
// ============================================

function updateUI() {
    if (AppState.isMicOn) {
        Elements.micBtn.classList.add('active');
    } else {
        Elements.micBtn.classList.remove('active');
    }
    
    if (AppState.isHandRaised) {
        Elements.handBtn.classList.add('active');
    } else {
        Elements.handBtn.classList.remove('active');
    }
}

// ============================================
// DEBUG CONSOLE
// ============================================

function setupDebugConsole() {
    // Uncomment the next line in development to show debug console
    // Elements.debugConsole.style.display = 'block';
}

function toggleDebugConsole() {
    Elements.debugConsole.style.display = 
        Elements.debugConsole.style.display === 'none' ? 'block' : 'none';
}

// ============================================
// CLEANUP ON PAGE UNLOAD
// ============================================

window.addEventListener('beforeunload', () => {
    if (ws && ws.isConnected) {
        ws.send('user:leave', {
            username: ws.username,
        });
        ws.disconnect();
    }
});

// Add ripple animation to CSS if not already present
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

console.log('✅ Zain Live Voice Room with WebSocket initialized successfully!');