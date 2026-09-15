/* ==========================================================================
   LEARNIVO — Subject AI Chat Controller with Supabase Persistence
   Powered by SNS Agent Workbench Webhook & Supabase Database Tables:
   - public.chat_conversations
   - public.chat_messages
   ========================================================================== */

let currentSelectedSubject = 'Mathematics';
let currentSelectedTopic = 'Quadratic Equations';
let activeConversationId = null;

document.addEventListener('DOMContentLoaded', () => {
  initSubjectChatPage();
  initFloatingAIDrawer();
});

/**
 * Initialize main Subject AI Chat view & Supabase conversation history
 */
async function initSubjectChatPage() {
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input-field');
  const subjectContainer = document.getElementById('subject-chips-container');
  const quickQuestionsContainer = document.getElementById('quick-questions-chips');

  if (!chatMessages || !chatForm) return;

  // Render Subject Chips from enrolled student courses
  renderSubjectChips(subjectContainer, quickQuestionsContainer);

  // Load existing conversation or initialize welcoming state
  await loadInitialConversationForSubject(currentSelectedSubject);

  // Handle Form Submission
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';
    await processUserQuestion(text, chatMessages, quickQuestionsContainer);
  });
}

/**
 * Render subject selector chips based on student profile courses
 */
function renderSubjectChips(subjectContainer, quickQuestionsContainer) {
  if (!subjectContainer) return;

  const student = typeof getStoredStudent === 'function' ? getStoredStudent() : { courses: [] };
  const courses = student.courses || window.DEFAULT_COURSES || [];

  if (courses.length > 0 && !courses.find(c => c.name === currentSelectedSubject)) {
    currentSelectedSubject = courses[0].name;
    const units = courses[0].units || [];
    currentSelectedTopic = units.length > 0 ? units[0].name : 'General Concepts';
  }

  subjectContainer.innerHTML = courses.map(course => `
    <div class="subject-chip ${course.name === currentSelectedSubject ? 'active' : ''}" onclick="selectChatSubject('${escapeHtml(course.name)}')">
      ${getSubjectIcon(course.name)} ${escapeHtml(course.name)}
    </div>
  `).join('');

  renderQuickQuestions(quickQuestionsContainer);
}

function getSubjectIcon(sub) {
  const s = (sub || '').toLowerCase();
  if (s.includes('math') || s.includes('mat') || s.includes('alg')) return '∑';
  if (s.includes('geom')) return '△';
  if (s.includes('trig')) return '∿';
  if (s.includes('calc')) return '∫';
  if (s.includes('physic') || s.includes('phy')) return '⚛️';
  if (s.includes('chem')) return '🧪';
  if (s.includes('comp') || s.includes('code') || s.includes('cs')) return '💻';
  if (s.includes('bio')) return '🧬';
  return '📖';
}

/**
 * Switch active subject tab
 */
async function selectChatSubject(sub) {
  currentSelectedSubject = sub;
  const student = typeof getStoredStudent === 'function' ? getStoredStudent() : { courses: [] };
  const course = (student.courses || []).find(c => c.name === sub);

  if (course && course.units && course.units.length > 0) {
    currentSelectedTopic = course.units[0].name;
  } else {
    currentSelectedTopic = 'General Concepts';
  }

  const subjectContainer = document.getElementById('subject-chips-container');
  const quickQuestionsContainer = document.getElementById('quick-questions-chips');
  renderSubjectChips(subjectContainer, quickQuestionsContainer);

  const topicBadge = document.getElementById('active-topic-badge');
  if (topicBadge) {
    topicBadge.textContent = `${currentSelectedSubject} • ${currentSelectedTopic}`;
  }

  showToast(`Switched to ${sub}`, 'info');

  // Load subject-specific conversation from Supabase
  await loadInitialConversationForSubject(sub);
}

/**
 * Load the most recent conversation for a subject from Supabase or start fresh
 */
async function loadInitialConversationForSubject(subject) {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;

  if (window.learnivoSupabase) {
    const convs = await window.learnivoSupabase.loadUserConversations(subject);
    if (convs && convs.length > 0) {
      const activeConv = convs[0];
      activeConversationId = activeConv.id;
      await renderConversationById(activeConv.id, activeConv.title);
      return;
    }
  }

  // Fallback / Initial blank state for new subject
  activeConversationId = null;
  chatMessages.innerHTML = '';
  addAIMessageToChat(
    `### 👋 Welcome to Learnivo Subject AI Tutor!\n\nAsk me any question about **${escapeHtml(currentSelectedSubject)} (${escapeHtml(currentSelectedTopic)})** or pick a question below.\n\n*Conversations are permanently saved to Supabase.*`,
    chatMessages,
    true
  );
}

/**
 * Render quick suggested questions
 */
function renderQuickQuestions(container) {
  if (!container) return;

  const student = typeof getStoredStudent === 'function' ? getStoredStudent() : { courses: [] };
  const course = (student.courses || []).find(c => c.name === currentSelectedSubject);

  let questions = [];
  if (course && course.units) {
    course.units.forEach(u => {
      (u.topics || []).forEach(t => {
        questions.push(`Explain ${t} with step-by-step example`);
      });
    });
  }

  if (questions.length === 0) {
    questions = [
      `What are the core concepts of ${currentSelectedSubject}?`,
      `Explain the fundamental formulas in ${currentSelectedSubject}`,
      `How do I solve practice problems step-by-step?`
    ];
  }

  container.innerHTML = questions.slice(0, 4).map(q => `
    <button type="button" class="quick-chip" onclick="askQuickQuestion('${escapeHtml(q)}')">${escapeHtml(q)}</button>
  `).join('');
}

async function askQuickQuestion(questionText) {
  const chatMessages = document.getElementById('chat-messages');
  const quickQuestionsContainer = document.getElementById('quick-questions-chips');
  if (!chatMessages) return;

  await processUserQuestion(questionText, chatMessages, quickQuestionsContainer);
}

/**
 * Core Orchestrator: User Question -> Supabase Save -> AI Webhook -> Supabase Save -> Render UI
 */
async function processUserQuestion(questionText, chatMessages, quickQuestionsContainer) {
  const student = typeof getStoredStudent === 'function' ? getStoredStudent() : { id: 'S001', name: 'Alex Morgan' };
  const supabaseService = window.learnivoSupabase;

  // 1. Get authenticated user
  const currentUser = supabaseService ? await supabaseService.getCurrentUser() : { id: student.uuid || 'S001' };

  // 2. If no active conversation, create a new row in chat_conversations
  if (!activeConversationId && supabaseService) {
    const newConv = await supabaseService.createConversation(
      currentSelectedSubject,
      currentSelectedTopic,
      questionText
    );
    if (newConv && newConv.id) {
      activeConversationId = newConv.id;
    }
  }

  // 3. Save User message into chat_messages
  if (activeConversationId && supabaseService) {
    await supabaseService.saveMessage({
      conversationId: activeConversationId,
      userId: currentUser.id,
      role: 'user',
      content: questionText,
      subject: currentSelectedSubject,
      topic: currentSelectedTopic
    });
  }

  // 4. Render User Message in UI
  addUserMessageToChat(questionText, chatMessages);

  // 5. Display Typing Indicator
  const typingElem = showTypingIndicator(chatMessages);

  // 6. Send request to AI Backend (SNS Agent Workbench Webhook)
  const payload = {
    question: questionText,
    subject: currentSelectedSubject,
    topic: currentSelectedTopic,
    studentId: student.id || 'S001',
    studentName: student.name || 'Alex Morgan',
    level: student.grade || 'Grade 11'
  };

  let aiReplyText = '';
  let replyObj = null;

  try {
    const res = await window.learnivoAPI.sendSubjectChatQuestion(payload);
    removeTypingIndicator(typingElem);
    replyObj = res.reply;
    aiReplyText = typeof replyObj === 'object' && replyObj !== null ? replyObj.text : String(replyObj || '');
  } catch (err) {
    console.error('AI Webhook error, generating fallback answer:', err);
    removeTypingIndicator(typingElem);
    replyObj = window.learnivoAPI.generateLocalSubjectAnswer(payload);
    aiReplyText = typeof replyObj === 'object' && replyObj !== null ? replyObj.text : String(replyObj || '');
  }

  // 7. Save AI response into chat_messages
  if (activeConversationId && supabaseService) {
    await supabaseService.saveMessage({
      conversationId: activeConversationId,
      userId: currentUser.id,
      role: 'assistant',
      content: aiReplyText,
      subject: currentSelectedSubject,
      topic: currentSelectedTopic
    });
  }

  // 8. Render AI Message in UI
  addAIMessageToChat(replyObj, chatMessages);
}

/**
 * Append User Message to UI
 */
function addUserMessageToChat(text, container) {
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const student = typeof getStoredStudent === 'function' ? getStoredStudent() : { name: 'Alex Morgan' };
  const initials = student.name ? student.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'AM';

  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-message user-message';
  msgDiv.innerHTML = `
    <div class="message-avatar">${escapeHtml(initials)}</div>
    <div class="message-bubble">
      <div>${escapeHtml(text)}</div>
      <div class="message-meta">
        <span>${timeStr}</span>
      </div>
    </div>
  `;
  container.appendChild(msgDiv);
  scrollToBottom(container);
}

/**
 * Append AI Message to UI
 */
function addAIMessageToChat(replyData, container) {
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const msgId = `msg-${Date.now()}-${Math.floor(Math.random()*1000)}`;

  let textContent = '';
  let videoTitle = '';
  let videoUrl = '';
  let videoId = '';

  if (typeof replyData === 'object' && replyData !== null) {
    textContent = replyData.text || '';
    videoTitle = replyData.title || '';
    videoUrl = replyData.videoUrl || replyData.url || '';
    videoId = replyData.videoId || '';
  } else {
    textContent = String(replyData || '');
  }

  if (!videoId && (videoUrl || textContent)) {
    const stringToSearch = videoUrl || textContent;
    const match = stringToSearch.match(/(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) {
      videoId = match[1];
      if (!videoUrl) videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    }
  }

  let formattedHTML = parseMarkdownToHTML(textContent);

  if (videoUrl || videoId) {
    const displayTitle = videoTitle || 'Recommended Learning Video';
    const finalWatchUrl = videoUrl || `https://www.youtube.com/watch?v=${videoId}`;

    formattedHTML += `
      <div class="recommended-resource-card" style="margin-top: 0.8rem; background: #FAF9FF; border: 1px solid #E2DDF5; border-radius: 12px; padding: 0.85rem;">
        <div style="font-weight: 700; font-size: 0.88rem; color: #6D3FEA; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.4rem;">
          <span>🎥</span> <span>Recommended Learning Resource</span>
        </div>
        <h4 style="font-size: 0.95rem; margin: 0 0 0.5rem 0; color: #1A1638;">${escapeHtml(displayTitle)}</h4>
        ${videoId ? `
        <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; margin-bottom: 0.5rem;">
          <iframe 
            src="https://www.youtube.com/embed/${videoId}?rel=0" 
            title="${escapeHtml(displayTitle)}" 
            style="position: absolute; top:0; left:0; width:100%; height:100%; border:0;" 
            allowfullscreen>
          </iframe>
        </div>
        ` : ''}
        <div>
          <a href="${finalWatchUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="font-size: 0.78rem;">
            ▶ Watch on YouTube
          </a>
        </div>
      </div>
    `;
  }

  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-message ai-message';
  msgDiv.innerHTML = `
    <div class="message-avatar">✨</div>
    <div class="message-bubble" id="${msgId}">
      <div class="markdown-body">${formattedHTML}</div>
      <div class="message-meta" style="margin-top: 0.4rem; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 0.75rem; color: #6B7280;">SNS Agent Workbench • ${timeStr}</span>
        <div style="display: flex; gap: 0.3rem;">
          <button type="button" class="msg-action-btn" onclick="copyMessageText('${msgId}')" title="Copy response">📋 Copy</button>
          <button type="button" class="msg-action-btn" onclick="speakMessageText('${msgId}')" title="Listen response">🔊 Speak</button>
        </div>
      </div>
    </div>
  `;
  container.appendChild(msgDiv);
  scrollToBottom(container);
}

/**
 * RESET CHAT BUTTON ACTION:
 * Starts a new conversation session WITHOUT deleting old conversations from Supabase!
 */
async function resetSubjectChat() {
  activeConversationId = null;
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;

  chatMessages.innerHTML = '';
  addAIMessageToChat(
    `### 🔄 New Chat Session Started\n\nAsk any question about **${escapeHtml(currentSelectedSubject)}** to start a new discussion.\n\n*Your previous conversations remain safely saved in Supabase history.*`,
    chatMessages
  );

  showToast('Started new chat conversation', 'success');
}

/**
 * Render all messages of a specific conversation from Supabase database
 */
async function renderConversationById(conversationId, convTitle = '') {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages || !window.learnivoSupabase) return;

  chatMessages.innerHTML = '';

  const messages = await window.learnivoSupabase.loadConversationMessages(conversationId);

  if (messages && messages.length > 0) {
    messages.forEach(msg => {
      if (msg.role === 'user') {
        addUserMessageToChat(msg.content, chatMessages);
      } else {
        addAIMessageToChat(msg.content, chatMessages);
      }
    });
  } else {
    addAIMessageToChat(
      `### 💬 ${escapeHtml(convTitle || currentSelectedSubject)}\n\nContinuing conversation from Supabase...`,
      chatMessages
    );
  }
}

/**
 * CONVERSATION HISTORY POPOVER CONTROLLER:
 * Allows user to inspect and open previous stored conversations
 */
async function toggleChatHistoryPopover() {
  const popover = document.getElementById('chat-history-popover');
  if (!popover) return;

  if (popover.style.display === 'none' || !popover.style.display) {
    popover.style.display = 'block';
    await renderChatHistoryList();
  } else {
    popover.style.display = 'none';
  }
}

async function renderChatHistoryList() {
  const listContainer = document.getElementById('chat-history-list');
  if (!listContainer || !window.learnivoSupabase) return;

  listContainer.innerHTML = '<span style="font-size: 0.8rem; color: #6B7280; padding: 0.5rem;">Loading history...</span>';

  const conversations = await window.learnivoSupabase.loadUserConversations();

  if (!conversations || conversations.length === 0) {
    listContainer.innerHTML = '<span style="font-size: 0.8rem; color: #6B7280; padding: 0.5rem;">No previous conversations found. Start chatting!</span>';
    return;
  }

  listContainer.innerHTML = conversations.map(c => {
    const isAct = c.id === activeConversationId;
    const dateStr = formatDateLabel(c.updated_at || c.created_at);
    return `
      <div 
        onclick="selectHistoryConversation('${escapeHtml(c.id)}', '${escapeHtml(c.subject)}')" 
        style="padding: 0.5rem 0.6rem; border-radius: 8px; background: ${isAct ? '#EFEAFB' : '#FAF9FF'}; border: 1px solid ${isAct ? '#6D3FEA' : '#E2DDF5'}; cursor: pointer; transition: all 0.2s ease;"
      >
        <div style="font-weight: 700; font-size: 0.84rem; color: #1A1638; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${escapeHtml(c.title || 'Conversation')}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.25rem;">
          <span style="font-size: 0.72rem; background: #EFEAFB; color: #6D3FEA; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 600;">
            ${escapeHtml(c.subject || 'General')}
          </span>
          <span style="font-size: 0.7rem; color: #6B7280;">${dateStr}</span>
        </div>
      </div>
    `;
  }).join('');
}

async function selectHistoryConversation(convId, subject) {
  activeConversationId = convId;
  if (subject && subject !== currentSelectedSubject) {
    currentSelectedSubject = subject;
    const subjectContainer = document.getElementById('subject-chips-container');
    const quickQuestionsContainer = document.getElementById('quick-questions-chips');
    renderSubjectChips(subjectContainer, quickQuestionsContainer);
  }

  toggleChatHistoryPopover();
  showToast('Loaded conversation from Supabase', 'info');
  await renderConversationById(convId);
}

function formatDateLabel(isoString) {
  if (!isoString) return 'Today';
  const d = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function showTypingIndicator(container) {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'chat-message ai-message typing-container-msg';
  typingDiv.innerHTML = `
    <div class="message-avatar">✨</div>
    <div class="message-bubble">
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  container.appendChild(typingDiv);
  scrollToBottom(container);
  return typingDiv;
}

function removeTypingIndicator(elem) {
  if (elem && elem.parentNode) {
    elem.parentNode.removeChild(elem);
  }
}

function scrollToBottom(container) {
  container.scrollTop = container.scrollHeight;
}

function parseMarkdownToHTML(text) {
  if (!text) return '';
  return text
    .replace(/^### (.*$)/gim, '<h3 style="font-size: 1.15rem; margin-top: 0.5rem; margin-bottom: 0.5rem;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="font-size: 1.3rem; margin-top: 0.6rem; margin-bottom: 0.6rem;">$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\$\$(.*?)\$\$/gs, '<div style="background: #FAF9FF; padding: 0.5rem 1rem; border-radius: 8px; margin: 0.5rem 0; font-family: var(--font-number); font-weight: 700; color: #6D3FEA; font-size: 1.05rem;">$$ $1 $$</div>')
    .replace(/\$(.*?)\$/g, '<code style="background: #EFEAFB; color: #6D3FEA; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 600;">$1</code>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/- (.*$)/gim, '• $1<br>');
}

function copyMessageText(msgId) {
  const elem = document.getElementById(msgId);
  if (!elem) return;
  const text = elem.querySelector('.markdown-body').innerText;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy', 'error');
  });
}

function speakMessageText(msgId) {
  const elem = document.getElementById(msgId);
  if (!elem) return;
  const text = elem.querySelector('.markdown-body').innerText;
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
    showToast('Reading response out loud...', 'info');
  } else {
    showToast('Speech synthesis not supported in browser', 'error');
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* Floating AI Drawer */
function initFloatingAIDrawer() {
  const drawer = document.getElementById('floating-ai-drawer');
  const triggerBtn = document.getElementById('floating-ai-trigger-btn');
  const closeBtn = document.getElementById('close-drawer-btn');
  if (!triggerBtn || !drawer) return;

  triggerBtn.addEventListener('click', () => drawer.classList.toggle('open'));
  if (closeBtn) closeBtn.addEventListener('click', () => drawer.classList.remove('open'));
}

// Expose functions globally for UI buttons
window.resetSubjectChat = resetSubjectChat;
window.toggleChatHistoryPopover = toggleChatHistoryPopover;
window.selectHistoryConversation = selectHistoryConversation;
window.selectChatSubject = selectChatSubject;
window.askQuickQuestion = askQuickQuestion;
window.copyMessageText = copyMessageText;
window.speakMessageText = speakMessageText;
