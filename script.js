// ============================================
// ZAIN LIVE - VOICE ROOM UI LOGIC
// ============================================

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
    
    // Other
    chatBadge: document.getElementById('chatBadge'),
    toastContainer: document.getElementById('toastContainer'),
    listenersGrid: document.getElementById('listenersGrid'),
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    generateListenerAvatars();
    updateUI();
});

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
}

// ============================================
// MICROPHONE TOGGLE
// ============================================

function toggleMicrophone() {
    AppState.isMicOn = !AppState.isMicOn;
    Elements.micBtn.classList.toggle('active');
    
    // Add visual feedback with animation
    const ripple = createRipple(Elements.micBtn);
    
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
    
    if (AppState.isHandRaised) {
        AppState.handRaisedCount++;
        Elements.handRaisedCount.textContent = AppState.handRaisedCount;
        Elements.handRaisedIndicator.style.display = 'flex';
        showToast('Hand raised! Waiting for host approval', 'info');
        
        // Simulate host approval after 3 seconds
        setTimeout(() => {
            if (AppState.isHandRaised) {
                showToast('You\'ve been invited to speak!', 'success');
            }
        }, 3000);
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
        // Clear unread badge when chat is opened
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
    
    if (!message) return;
    
    // Create message element
    const messageGroup = document.createElement('div');
    messageGroup.className = 'message-group';
    messageGroup.innerHTML = `
        <div class="message-item">
            <img src="https://i.pravatar.cc/150?img=100" alt="You" class="message-avatar">
            <div class="message-content">
                <span class="message-author">You</span>
                <p class="message-text">${escapeHtml(message)}</p>
                <span class="message-time">${getCurrentTime()}</span>
            </div>
        </div>
    `;
    
    // Add message to chat
    Elements.chatMessages.appendChild(messageGroup);
    Elements.chatMessages.scrollTop = Elements.chatMessages.scrollHeight;
    
    // Clear input
    Elements.chatInput.value = '';
    
    showToast('Message sent!', 'success');
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
    
    // Update display
    Elements.lastGiftDisplay.textContent = emoji;
    Elements.giftCount.textContent = AppState.giftCount;
    Elements.giftIndicator.style.display = 'flex';
    
    // Create floating animation
    createFloatingGift(emoji);
    
    closeGiftPopup();
    showToast(`Sent ${emoji} gift!`, 'success');
    
    // Trigger animation on indicator
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
    
    // Animate floating up
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
        
        setTimeout(() => {
            // Simulate navigation
            console.log('User left the room');
            showToast('Left room', 'success');
        }, 1000);
    }
}

// ============================================
// MORE OPTIONS
// ============================================

function showMoreOptions() {
    const options = ['Share Room', 'Report', 'Block', 'Settings', 'Cancel'];
    const selected = confirm(`${options.slice(0, -1).join('\n')}\n\nSelect an option`);
    
    if (selected) {
        showToast('Option selected', 'info');
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
    
    // Auto remove after 3 seconds
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
    // Update button states
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
// ADVANCED FEATURES (Expandable)
// ============================================

// Simulate incoming messages
function simulateIncomingMessage() {
    const messages = [
        'This is so interesting! 🎉',
        'Great insights, thanks for sharing!',
        'Can you elaborate on that?',
        'Totally agree with you!',
        'Looking forward to the next session 👍',
    ];
    
    const users = [
        { name: 'Alex Chen', img: 3 },
        { name: 'Lisa Park', img: 7 },
        { name: 'David Brown', img: 15 },
        { name: 'Emma Stone', img: 20 },
    ];
    
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    if (AppState.chatOpen) {
        const messageGroup = document.createElement('div');
        messageGroup.className = 'message-group';
        messageGroup.innerHTML = `
            <div class="message-item">
                <img src="https://i.pravatar.cc/150?img=${randomUser.img}" alt="${randomUser.name}" class="message-avatar">
                <div class="message-content">
                    <span class="message-author">${randomUser.name}</span>
                    <p class="message-text">${randomMessage}</p>
                    <span class="message-time">${getCurrentTime()}</span>
                </div>
            </div>
        `;
        
        Elements.chatMessages.appendChild(messageGroup);
        Elements.chatMessages.scrollTop = Elements.chatMessages.scrollHeight;
    } else {
        AppState.unreadMessages++;
        updateChatBadge();
    }
}

// Simulate hand raises
function simulateHandRaise() {
    const handRaises = Math.floor(Math.random() * 3) + 1;
    AppState.handRaisedCount += handRaises;
    Elements.handRaisedCount.textContent = AppState.handRaisedCount;
    Elements.handRaisedIndicator.style.display = 'flex';
    showToast(`${handRaises} new hand raise(s) request!`, 'info');
}

// Optional: Set up periodic events for demo
function setupDemoEvents() {
    // Simulate incoming messages every 5 seconds
    setInterval(simulateIncomingMessage, 5000);
    
    // Simulate hand raises every 8 seconds
    setInterval(simulateHandRaise, 8000);
}

// Uncomment to enable demo events
// setupDemoEvents();

// ============================================
// ANIMATION SETUP
// ============================================

// Add ripple animation to CSS dynamically if not present
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

console.log('✅ Zain Live Voice Room UI initialized successfully!');