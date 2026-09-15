/* ==========================================================================
   LEARNIVO — Subject AI Chat Controller (Powered by SNS Agent Workbench POST Webhook)
   Primary Webhook: https://api.agents.snsihub.ai/webhook/4a662d25-cbee-4e03-8afb-ecb929b27719
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initSubjectChatPage();
  initFloatingAIDrawer();
});

let currentSelectedSubject = 'Algebra';
let currentSelectedTopic = 'Quadratic Equations';

// Subject & Quick Questions mapping
const SUBJECT_TOPICS = {
  'Algebra': [
    { name: 'Quadratic Equations', questions: ['What is the quadratic formula?', 'How to solve by factoring?', 'Explain the discriminant'] },
    { name: 'Linear Systems', questions: ['How to solve 2x2 linear system?', 'What is elimination method?', 'Graphing linear functions'] },
    { name: 'Polynomials', questions: ['How to factor polynomials?', 'What is synthetic division?', 'Polynomial roots theorem'] }
  ],
  'Geometry': [
    { name: 'Angle Bisectors', questions: ['What is an angle bisector theorem?', 'Constructing angle bisectors', 'Incenter of triangle'] },
    { name: 'Pythagorean Theorem', questions: ['Explain a² + b² = c²', 'What are Pythagorean triples?', '3D distance formula'] }
  ],
  'Trigonometry': [
    { name: 'Trig Identities', questions: ['Explain sin²θ + cos²θ = 1', 'How to prove trig identities?', 'Double angle formulas'] }
  ],
  'Calculus': [
    { name: 'Derivatives', questions: ['What is the derivative of sin(x)?', 'Explain the power rule', 'What is chain rule?'] },
    { name: 'Limits Intro', questions: ['What is L’Hôpital’s rule?', 'How to evaluate 0/0 limit?', 'Continuous functions'] }
  ],
  'Statistics': [
    { name: 'Standard Deviation', questions: ['How to calculate standard deviation?', 'Variance vs Standard Deviation', 'Normal distribution z-score'] }
  ]
};

function initSubjectChatPage() {
  const chatMessages = document.getElementById('chat-messages');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input-field');
  const subjectContainer = document.getElementById('subject-chips-container');
  const quickQuestionsContainer = document.getElementById('quick-questions-chips');

  if (!chatMessages || !chatForm) return;

  // Render Subject Chips
  renderSubjectChips(subjectContainer, quickQuestionsContainer);

  // Send Message Event
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';
    await processUserQuestion(text, chatMessages, quickQuestionsContainer);
  });

  // Initial Welcome Message
  if (chatMessages.children.length === 0) {
    addAIMessageToChat(
      `### 👋 Welcome to Learnivo Subject AI Tutor!\n\nAsk me any question about **${currentSelectedSubject} (${currentSelectedTopic})** or select a different subject above.\n\n*All questions are processed via SNS Agent Workbench.*`,
      chatMessages
    );
  }
}

function renderSubjectChips(subjectContainer, quickQuestionsContainer) {
  if (!subjectContainer) return;

  const student = getStoredStudent();
  const courses = student.courses || window.DEFAULT_COURSES;
  
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

function selectChatSubject(sub) {
  currentSelectedSubject = sub;
  const student = getStoredStudent();
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

  showToast(`Switched subject to ${sub}`, 'info');
}

function renderQuickQuestions(container) {
  if (!container) return;

  const student = getStoredStudent();
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

  container.innerHTML = questions.slice(0, 5).map(q => `
    <button class="quick-chip" onclick="askQuickQuestion('${escapeHtml(q)}')">${escapeHtml(q)}</button>
  `).join('');
}

async function askQuickQuestion(questionText) {
  const chatMessages = document.getElementById('chat-messages');
  const quickQuestionsContainer = document.getElementById('quick-questions-chips');
  if (!chatMessages) return;

  await processUserQuestion(questionText, chatMessages, quickQuestionsContainer);
}

async function processUserQuestion(questionText, chatMessages, quickQuestionsContainer) {
  // 1. Append User Message
  addUserMessageToChat(questionText, chatMessages);

  // 2. Show Typing Indicator
  const typingElem = showTypingIndicator(chatMessages);

  // 3. Prepare Payload for SNS Agent Workbench POST Webhook
  const student = getStoredStudent();
  const payload = {
    question: questionText,
    subject: currentSelectedSubject,
    topic: currentSelectedTopic,
    studentId: student.id || 'S001',
    studentName: student.name || 'Alex Morgan',
    level: student.level || 'Intermediate'
  };

  try {
    // 4. Send POST request via window.learnivoAPI
    const res = await window.learnivoAPI.sendSubjectChatQuestion(payload);

    // Remove typing indicator
    removeTypingIndicator(typingElem);

    // 5. Render AI Response
    addAIMessageToChat(res.reply, chatMessages);

  } catch (err) {
    console.error('Error sending chat question:', err);
    removeTypingIndicator(typingElem);

    const fallbackReply = window.learnivoAPI.generateLocalSubjectAnswer(payload);
    addAIMessageToChat(fallbackReply, chatMessages);
  }
}

function addUserMessageToChat(text, container, skipSave = false) {
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-message user-message';
  msgDiv.innerHTML = `
    <div class="message-avatar">AM</div>
    <div class="message-bubble">
      <div>${escapeHtml(text)}</div>
      <div class="message-meta">
        <span>${timeStr}</span>
      </div>
    </div>
  `;
  container.appendChild(msgDiv);
  scrollToBottom(container);

  // Save to Supabase DB & LocalStorage
  if (!skipSave && window.learnivoSupabase && typeof window.learnivoSupabase.saveChatMessage === 'function') {
    const student = getStoredStudent();
    window.learnivoSupabase.saveChatMessage({
      studentId: student.id || 'S001',
      sender: 'user',
      text: text,
      subject: currentSelectedSubject,
      topic: currentSelectedTopic
    });
  }
}

function addAIMessageToChat(replyData, container, skipSave = false) {
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const msgId = `msg-${Date.now()}`;

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

  // Extract video ID from URL or text content if embed URL exists inside markdown text
  if (!videoId && (videoUrl || textContent)) {
    const stringToSearch = videoUrl || textContent;
    const match = stringToSearch.match(/(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) {
      videoId = match[1];
      if (!videoUrl) videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    }
  }

  let formattedHTML = parseMarkdownToHTML(textContent);

  // Render Recommended Learning Resource Card if video URL or Video ID is returned by Webhook
  if (videoUrl || videoId) {
    const displayTitle = videoTitle || 'Recommended Learning Video';
    const finalWatchUrl = videoUrl || `https://www.youtube.com/watch?v=${videoId}`;

    formattedHTML += `
      <div class="recommended-resource-card">
        <div class="resource-card-header">
          <span class="resource-icon">🎥</span>
          <span>Recommended Learning Resource</span>
        </div>
        
        <div class="resource-card-body">
          <h4 class="resource-title">${escapeHtml(displayTitle)}</h4>
          
          ${videoId ? `
          <div class="resource-video-wrapper">
            <iframe 
              src="https://www.youtube.com/embed/${videoId}?rel=0" 
              title="${escapeHtml(displayTitle)}" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen>
            </iframe>
          </div>
          ` : `
          <div class="resource-thumbnail-box">
            <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="${escapeHtml(displayTitle)}" class="resource-thumbnail-img" onerror="this.style.display='none'">
          </div>
          `}
        </div>

        <div class="resource-card-footer">
          <a href="${finalWatchUrl}" target="_blank" rel="noopener noreferrer" class="btn-watch-youtube">
            <span>▶</span> Watch on YouTube
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
      <div class="message-meta">
        <span>SNS Agent Workbench • ${timeStr}</span>
        <div class="message-actions">
          <button class="msg-action-btn" onclick="copyMessageText('${msgId}')" title="Copy response">📋 Copy</button>
          <button class="msg-action-btn" onclick="speakMessageText('${msgId}')" title="Listen response">🔊 Speak</button>
        </div>
      </div>
    </div>
  `;
  container.appendChild(msgDiv);
  scrollToBottom(container);

  // Save to Supabase DB & LocalStorage
  if (!skipSave && window.learnivoSupabase && typeof window.learnivoSupabase.saveChatMessage === 'function') {
    const student = getStoredStudent();
    window.learnivoSupabase.saveChatMessage({
      studentId: student.id || 'S001',
      sender: 'ai',
      text: textContent,
      title: videoTitle,
      videoUrl: videoUrl,
      videoId: videoId,
      subject: currentSelectedSubject,
      topic: currentSelectedTopic
    });
  }
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

  let html = text
    .replace(/^### (.*$)/gim, '<h3 style="font-size: 1.15rem; margin-top: 0.5rem; margin-bottom: 0.5rem;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="font-size: 1.3rem; margin-top: 0.6rem; margin-bottom: 0.6rem;">$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\$\$(.*?)\$\$/gs, '<div style="background: var(--bg-tertiary); padding: 0.5rem 1rem; border-radius: 8px; margin: 0.5rem 0; font-family: var(--font-number); font-weight: 700; color: var(--primary-purple); font-size: 1.05rem;">$$ $1 $$</div>')
    .replace(/\$(.*?)\$/g, '<code style="background: var(--bg-purple-light); color: var(--primary-purple); padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 600;">$1</code>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/- (.*$)/gim, '• $1<br>');

  return html;
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
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ==========================================================================
   FLOATING QUICK AI DRAWER INTEGRATION
   ========================================================================== */
function initFloatingAIDrawer() {
  const drawer = document.getElementById('floating-ai-drawer');
  const triggerBtn = document.getElementById('floating-ai-trigger-btn');
  const closeBtn = document.getElementById('close-drawer-btn');
  const drawerForm = document.getElementById('drawer-chat-form');
  const drawerInput = document.getElementById('drawer-chat-input');
  const drawerMessages = document.getElementById('drawer-chat-messages');

  if (!triggerBtn || !drawer) return;

  triggerBtn.addEventListener('click', () => {
    drawer.classList.toggle('open');
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      drawer.classList.remove('open');
    });
  }

  if (drawerForm && drawerInput && drawerMessages) {
    drawerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const question = drawerInput.value.trim();
      if (!question) return;

      drawerInput.value = '';

      // User Message in Drawer
      const userDiv = document.createElement('div');
      userDiv.className = 'chat-message user-message';
      userDiv.innerHTML = `
        <div class="message-bubble" style="padding: 0.75rem 1rem; font-size: 0.88rem;">${escapeHtml(question)}</div>
      `;
      drawerMessages.appendChild(userDiv);
      drawerMessages.scrollTop = drawerMessages.scrollHeight;

      // Typing Indicator
      const typingDiv = document.createElement('div');
      typingDiv.className = 'chat-message ai-message';
      typingDiv.innerHTML = `
        <div class="message-bubble" style="padding: 0.75rem 1rem;">
          <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
        </div>
      `;
      drawerMessages.appendChild(typingDiv);
      drawerMessages.scrollTop = drawerMessages.scrollHeight;

      const student = getStoredStudent();
      const payload = {
        question,
        subject: currentSelectedSubject,
        topic: currentSelectedTopic,
        studentId: student.id || 'S001',
        studentName: student.name || 'Alex Morgan'
      };

      try {
        const res = await window.learnivoAPI.sendSubjectChatQuestion(payload);
        typingDiv.remove();

        addAIMessageToChat(res.reply, drawerMessages);
      } catch (err) {
        typingDiv.remove();
        addAIMessageToChat(window.learnivoAPI.generateLocalSubjectAnswer(payload), drawerMessages);
      }
    });
  }
}
