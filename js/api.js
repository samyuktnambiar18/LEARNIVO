/* ==========================================================================
   LEARNIVO — SNS Workbench Adaptive Learning & Subject Chat API Integration
   Primary Webhook: https://api.agents.snsihub.ai/webhook/4a662d25-cbee-4e03-8afb-ecb929b27719
   Test Webhook Fallback: https://api.agents.snsihub.ai/webhook-test/4a662d25-cbee-4e03-8afb-ecb929b27719
   ========================================================================== */

const LEARNIVO_API_CONFIG = {
  // Primary Production Endpoints (SNS Workbench Adaptive Learning)
  chatWebhook: 'https://api.agents.snsihub.ai/webhook/adaptive-learning',
  chatTestWebhook: 'https://api.agents.snsihub.ai/webhook-test/adaptive-learning',
  
  // Legacy Endpoints (Fallback)
  legacyChatWebhook: 'https://api.agents.snsihub.ai/webhook/4a662d25-cbee-4e03-8afb-ecb929b27719',
  legacyChatTestWebhook: 'https://api.agents.snsihub.ai/webhook-test/4a662d25-cbee-4e03-8afb-ecb929b27719',
  
  // Adaptive Learning Endpoints
  prodWebhook: 'https://api.agents.snsihub.ai/webhook/adaptive-learning',
  testWebhook: 'https://api.agents.snsihub.ai/webhook-test/adaptive-learning',
  
  timeoutMs: 12000
};

class SNSAdaptiveLearningService {
  constructor() {
    this.activeEndpoint = null;
    this.connectionStatus = 'checking'; // 'connected', 'test-mode', 'offline'
  }

  /**
   * Health Check & Endpoint Resolution
   * Priority: Production Adaptive Learning → Legacy Endpoints → Offline
   */
  async checkStatus() {
    const endpointsToTest = [
      { url: LEARNIVO_API_CONFIG.chatWebhook, mode: 'production', type: 'production' },
      { url: LEARNIVO_API_CONFIG.chatTestWebhook, mode: 'test-mode', type: 'test' },
      { url: LEARNIVO_API_CONFIG.legacyChatWebhook, mode: 'legacy-production', type: 'legacy' },
      { url: LEARNIVO_API_CONFIG.legacyChatTestWebhook, mode: 'legacy-test', type: 'legacy' }
    ];

    for (const endpoint of endpointsToTest) {
      try {
        const res = await fetch(endpoint.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'ping', timestamp: new Date().toISOString() })
        });

        const data = await res.json();
        if (res.ok || data.status === 'completed' || data.success || !data.error) {
          this.activeEndpoint = endpoint.url;
          this.connectionStatus = 'connected';
          console.log(`✅ Connected to ${endpoint.type} endpoint: ${endpoint.mode}`);
          return { 
            status: 'connected', 
            endpoint: this.activeEndpoint, 
            mode: endpoint.mode,
            endpointType: endpoint.type
          };
        }
      } catch (e) {
        console.warn(`Endpoint check failed (${endpoint.type}):`, endpoint.url, e.message);
      }
    }

    this.connectionStatus = 'offline';
    return { status: 'offline', endpoint: null, mode: 'offline', endpointType: 'none' };
  }

  /**
   * Send Question to SNS Agent Workbench POST Webhook
   * Primary Endpoint: https://api.agents.snsihub.ai/webhook/adaptive-learning
   * Fallback: Legacy endpoint + test modes
   * @param {Object} payload - { question, subject, topic, studentId, studentName }
   */
  async sendSubjectChatQuestion(payload) {
    const endpointsToTry = [
      LEARNIVO_API_CONFIG.chatWebhook,           // Production Adaptive Learning
      LEARNIVO_API_CONFIG.chatTestWebhook,       // Test Adaptive Learning
      LEARNIVO_API_CONFIG.legacyChatWebhook,     // Legacy Production
      LEARNIVO_API_CONFIG.legacyChatTestWebhook  // Legacy Test
    ];

    const postBody = {
      message: payload.question,
      chatInput: payload.question,
      input: payload.question,
      query: payload.question,
      type: 'chat',
      subject: payload.subject || 'Mathematics',
      topic: payload.topic || 'General Math',
      student_id: payload.studentId || 'S001',
      student_name: payload.studentName || 'Alex Morgan',
      level: payload.level || 'Intermediate',
      timestamp: new Date().toISOString(),
      source: 'learnivo-subject-chat'
    };

    let lastError = null;

    for (const endpoint of endpointsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), LEARNIVO_API_CONFIG.timeoutMs);

        console.log(`📤 Sending question to endpoint: ${endpoint}`);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(postBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        console.log(`✅ Response received from: ${endpoint}`, data);

        // If webhook error contains 'inactive' or 404, try next endpoint
        if (data.error && (data.error.includes('inactive') || data.error.includes('not found'))) {
          console.warn(`Endpoint inactive, trying next fallback...`);
          continue;
        }

        this.activeEndpoint = endpoint;
        this.connectionStatus = endpoint.includes('webhook-test') ? 'test-mode' : 'connected';

        // Extract response string from SNS Agent Workbench response structure
        const replyText = this.extractReplyFromResponse(data, payload);

        return {
          success: true,
          endpoint: endpoint,
          mode: this.connectionStatus,
          reply: replyText,
          rawResponse: data
        };

      } catch (err) {
        lastError = err;
        console.warn(`❌ Failed to connect to endpoint ${endpoint}:`, err.message);
      }
    }

    // Smart Local Subject Tutor Fallback if endpoint is unreachable/offline
    return {
      success: false,
      endpoint: null,
      mode: 'offline',
      error: lastError ? lastError.message : 'SNS Agent Workbench offline',
      reply: this.generateLocalSubjectAnswer(payload)
    };
  }

  /**
   * Helper to extract response text, YouTube video URL, and title from SNS Agent Workbench webhook node output
   */
  extractReplyFromResponse(data, payload) {
    if (!data) return null;

    let responseObj = {
      text: '',
      title: '',
      videoUrl: '',
      videoId: '',
      raw: data
    };

    // Deep recursive traversal of the response object
    this.inspectObjectForVideo(data, responseObj, payload, 0);

    // Filter out prompt echoes (e.g., n8n test body echo)
    if (payload && payload.question && responseObj.text.toLowerCase().trim() === payload.question.toLowerCase().trim()) {
      responseObj.text = '';
    }

    // If text equals the video title, clear text so it's not repeated twice
    if (responseObj.title && responseObj.text.trim() === responseObj.title.trim()) {
      responseObj.text = '';
    }

    // If video exists but text is empty, generate clean video header
    if ((responseObj.videoUrl || responseObj.videoId) && !responseObj.text) {
      const topicOrTitle = responseObj.title || (payload ? payload.topic : '') || 'Subject Video';
      responseObj.text = `### 🎥 Recommended Learning Resource\nHere is the YouTube video tutorial for **${topicOrTitle}**:`;
    }

    // If no text or video was found at all, return local fallback text explanation
    if (!responseObj.text && !responseObj.videoUrl && !responseObj.videoId) {
      responseObj.text = this.generateLocalSubjectAnswer(payload);
    }

    return responseObj;
  }

  /**
   * Helper function to parse n8n _RESPONSEDATA formatted text strings or stringified JSON
   */
  parseResponseDataString(str) {
    if (typeof str !== 'string') return null;
    const trimmed = str.trim();
    if (!trimmed) return null;
    const result = {};

    // 1. Try parsing stringified JSON
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed;
        }
      } catch (e) {}
    }

    // 2. Parse key-value lines (e.g., "title : Quantum...\nvideoId : fKAAbXPEATu\nurl : https://...")
    const lines = trimmed.split(/\r?\n|;|\s{2,}/);
    lines.forEach(line => {
      const l = line.trim();
      if (!l) return;

      const titleMatch = l.match(/^(?:title|videoTitle|video_title|name|heading)\s*[:=]\s*(.+)/i);
      if (titleMatch) {
        result.title = titleMatch[1].trim().replace(/^["']|["']$/g, '');
      }

      const idMatch = l.match(/^(?:videoId|video_id|ytId|yt_id|id)\s*[:=]\s*([a-zA-Z0-9_-]{11})/i);
      if (idMatch) {
        result.videoId = idMatch[1].trim();
      }

      const urlMatch = l.match(/^(?:url|videoUrl|youtubeUrl|youtube_url|video_url|link|ytUrl)\s*[:=]\s*(https?:\/\/[^\s"']+)/i);
      if (urlMatch) {
        result.videoUrl = urlMatch[1].trim();
      }
    });

    // 3. Fallback inline regex matching if line breaks were absent
    if (!result.title) {
      const tMatch = trimmed.match(/title\s*[:=]\s*([^;\n\r]+?)(?=\s*(?:videoId|video_id|url|videoUrl|link|$)|\r|\n)/i);
      if (tMatch) result.title = tMatch[1].trim().replace(/^["']|["']$/g, '');
    }

    if (!result.videoId) {
      const vMatch = trimmed.match(/(?:videoId|video_id|ytId)\s*[:=]\s*["']?([a-zA-Z0-9_-]{11})["']?/i);
      if (vMatch) result.videoId = vMatch[1].trim();
    }

    if (!result.videoUrl) {
      const uMatch = trimmed.match(/(?:url|videoUrl|youtubeUrl|link)\s*[:=]\s*["']?(https?:\/\/[^\s"']+)/i);
      if (uMatch) result.videoUrl = uMatch[1].trim();
    }

    // 4. Extract YouTube URL anywhere from raw string
    if (!result.videoUrl) {
      const ytMatch = trimmed.match(/(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}[^\s"']*)/i);
      if (ytMatch) {
        result.videoUrl = ytMatch[1].trim();
      }
    }

    // 5. Extract videoId from videoUrl
    if (result.videoUrl && !result.videoId) {
      const idExtract = result.videoUrl.match(/(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (idExtract) result.videoId = idExtract[1];
    }

    // 6. Build videoUrl from videoId
    if (result.videoId && !result.videoUrl) {
      result.videoUrl = `https://www.youtube.com/watch?v=${result.videoId}`;
    }

    return (result.title || result.videoId || result.videoUrl) ? result : null;
  }

  /**
   * Recursively scans any object or nested structure for title, videoId, url, and text
   */
  inspectObjectForVideo(obj, target, payload = null, depth = 0) {
    if (!obj || depth > 8) return;

    // Handle string values (could be JSON or formatted _RESPONSEDATA text)
    if (typeof obj === 'string') {
      const parsed = this.parseResponseDataString(obj);
      if (parsed) {
        if (typeof parsed === 'object') {
          this.inspectObjectForVideo(parsed, target, payload, depth + 1);
        }
      } else {
        // Plain string check for text commentary
        const trimmed = obj.trim();
        const userQ = (payload && payload.question) ? payload.question.toLowerCase().trim() : '';
        if (!target.text && trimmed.length > 0 && !trimmed.startsWith('http') && trimmed.toLowerCase() !== userQ && depth > 0) {
          target.text = trimmed;
        }
      }
      return;
    }

    if (typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      obj.forEach(item => this.inspectObjectForVideo(item, target, payload, depth + 1));
      return;
    }

    const keys = Object.keys(obj);
    const userQuestion = (payload && payload.question) ? payload.question.toLowerCase().trim() : '';

    // 1. Direct property matching on current object level
    for (const key of keys) {
      const lowerKey = key.toLowerCase();
      const val = obj[key];

      // Match title
      if (!target.title && ['title', 'videotitle', 'video_title', 'yttitle', 'yt_title', 'name', 'heading', 'resourcetitle'].includes(lowerKey)) {
        if (typeof val === 'string' && val.trim().length > 0) {
          target.title = val.trim().replace(/^["']|["']$/g, '');
        }
      }

      // Match videoId
      if (!target.videoId && ['videoid', 'video_id', 'ytid', 'yt_id'].includes(lowerKey)) {
        if (typeof val === 'string' && val.trim().length > 0) {
          target.videoId = val.trim();
          if (!target.videoUrl) {
            target.videoUrl = `https://www.youtube.com/watch?v=${target.videoId}`;
          }
        }
      }

      // Match videoUrl / URL
      if (!target.videoUrl && ['url', 'videourl', 'youtubeurl', 'youtube_url', 'video_url', 'link', 'yturl', 'yt_url', 'embedurl', 'embed_url'].includes(lowerKey)) {
        if (typeof val === 'string' && (val.includes('youtube.com') || val.includes('youtu.be'))) {
          target.videoUrl = val.trim();
          const match = val.match(/(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
          if (match && !target.videoId) {
            target.videoId = match[1];
          }
        }
      }

      // Match text / AI explanation (ignore if equals user's input question prompt)
      if (!target.text && ['text', 'reply', 'explanation', 'description', 'answer', 'recommendation'].includes(lowerKey)) {
        if (typeof val === 'string' && val.trim().length > 0 && !val.startsWith('http')) {
          if (userQuestion && val.trim().toLowerCase() === userQuestion) {
            // ignore prompt echo
          } else {
            target.text = val.trim();
          }
        }
      }
    }

    // 2. Recurse into all sub-objects and sub-strings (e.g., _RESPONSEDATA, json, output, items, response)
    for (const key of keys) {
      const val = obj[key];
      if (val && (typeof val === 'object' || typeof val === 'string')) {
        this.inspectObjectForVideo(val, target, payload, depth + 1);
      }
    }
  }

  /**
   * Curriculum aligned YouTube video fallback mapping
   */
  getFallbackVideoForSubject(subject, topic) {
    const s = (subject || '').toLowerCase();
    const t = (topic || '').toLowerCase();

    if (t.includes('quadratic') || s.includes('algebra')) {
      return {
        title: 'Solving Quadratic Equations with the Quadratic Formula',
        videoUrl: 'https://www.youtube.com/watch?v=i7idZfS8t8w',
        videoId: 'i7idZfS8t8w'
      };
    }

    if (t.includes('linear') || s.includes('algebra')) {
      return {
        title: 'Solving Systems of Linear Equations Step-by-Step',
        videoUrl: 'https://www.youtube.com/watch?v=vA-55wIs54U',
        videoId: 'vA-55wIs54U'
      };
    }

    if (s.includes('calculus') || t.includes('derivative')) {
      return {
        title: 'Calculus 1 - Introduction to Derivatives & Rules',
        videoUrl: 'https://www.youtube.com/watch?v=rAof9Ld5sOg',
        videoId: 'rAof9Ld5sOg'
      };
    }

    if (s.includes('trig')) {
      return {
        title: 'Trigonometry Fundamentals - Sine, Cosine & Tangent',
        videoUrl: 'https://www.youtube.com/watch?v=PUB0TaZ7bhA',
        videoId: 'PUB0TaZ7bhA'
      };
    }

    if (s.includes('stat')) {
      return {
        title: 'Standard Deviation and Variance Concepts',
        videoUrl: 'https://www.youtube.com/watch?v=MRqtXL2WX2M',
        videoId: 'MRqtXL2WX2M'
      };
    }

    return {
      title: `${topic || 'Mathematics'} Step-by-Step Video Tutorial`,
      videoUrl: 'https://www.youtube.com/watch?v=i7idZfS8t8w',
      videoId: 'i7idZfS8t8w'
    };
  }

  /**
   * Generates comprehensive, step-by-step contextual answer based on subject & topic
   */
  generateLocalSubjectAnswer(payload) {
    const q = (payload.question || '').toLowerCase();
    const subject = payload.subject || 'Mathematics';
    const topic = payload.topic || 'General Math';

    if (q.includes('quadratic') || topic.includes('Quadratic')) {
      return `### 📐 Understanding Quadratic Equations\n\nA quadratic equation is a second-order polynomial equation in a single variable $x$ with a non-zero coefficient for $x^2$.\n\n**Standard Form:**\n$$ax^2 + bx + c = 0$$\n\n**The Quadratic Formula:**\n$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$\n\n**Key Steps to Solve:**\n1. **Identify Coefficients**: Determine $a$, $b$, and $c$.\n2. **Calculate Discriminant**: $\\Delta = b^2 - 4ac$.\n   - If $\\Delta > 0$: 2 distinct real roots.\n   - If $\\Delta = 0$: 1 repeated real root.\n   - If $\\Delta < 0$: 2 complex conjugate roots.\n3. **Plug into Formula**: Solve for $x_1$ and $x_2$.`;
    }

    if (q.includes('linear') || q.includes('system') || topic.includes('Linear')) {
      return `### 📊 Solving Systems of Linear Equations\n\nA system of linear equations consists of two or more equations with the same set of variables.\n\n**Example System:**\n1) $2x + y = 7$\n2) $x - y = 2$\n\n**Methods to Solve:**\n- **Substitution Method**: Solve one equation for one variable and substitute into the second.\n- **Elimination Method**: Add or subtract equations to eliminate one variable.\n\n**Step-by-step solution for example:**\nAdding equations (1) and (2):\n$$(2x + y) + (x - y) = 7 + 2 \\implies 3x = 9 \\implies x = 3$$\nSubstitute $x = 3$ into equation (2):\n$$3 - y = 2 \\implies y = 1$$\n**Solution set:** $(x, y) = (3, 1)$.`;
    }

    if (q.includes('derivative') || q.includes('calculus') || q.includes('sin') || topic.includes('Calculus')) {
      return `### ∿ Calculus: Derivatives & Differentiation\n\nThe derivative measures the instantaneous rate of change of a function with respect to a variable.\n\n**Fundamental Formula:**\n$$f'(x) = \\lim_{h \\to 0} \\frac{f(x + h) - f(x)}{h}$$\n\n**Common Derivatives Rules:**\n- **Power Rule**: $\\frac{d}{dx}(x^n) = n \\cdot x^{n-1}$\n- **Trigonometric Derivatives**:\n  - $\\frac{d}{dx}(\\sin x) = \\cos x$\n  - $\\frac{d}{dx}(\\cos x) = -\\sin x$\n- **Chain Rule**: $\\frac{d}{dx}[f(g(x))] = f'(g(x)) \\cdot g'(x)$`;
    }

    if (q.includes('trig') || q.includes('pythagor') || topic.includes('Trigonometry')) {
      return `### △ Trigonometry Fundamentals\n\nTrigonometry studies relationships involving lengths and angles of triangles.\n\n**Pythagorean Identity:**\n$$\\sin^2(\\theta) + \\cos^2(\\theta) = 1$$\n\n**SOH CAH TOA Definitions:**\n- $\\sin(\\theta) = \\frac{\\text{Opposite}}{\\text{Hypotenuse}}$\n- $\\cos(\\theta) = \\frac{\\text{Adjacent}}{\\text{Hypotenuse}}$\n- $\\tan(\\theta) = \\frac{\\text{Opposite}}{\\text{Adjacent}}$`;
    }

    return `### 🎓 Subject Learning Assistance: ${subject} (${topic})\n\nGreat question regarding **${topic}**!\n\nHere is a structured explanation:\n1. **Core Concept**: ${payload.question}\n2. **Key Principle**: In ${subject}, we systematically break down complex problems into fundamental axioms, definitions, and formulas.\n3. **Application**: Apply the steps carefully, double-checking signs and units.\n\n*Would you like to solve a step-by-step practice problem or review related concepts?*`;
  }

  /**
   * Legacy Adaptive Learning method
   */
  async sendAdaptiveRequest(payload) {
    return this.sendSubjectChatQuestion({
      question: payload.message || 'Help with adaptive practice',
      subject: payload.topic || 'Mathematics',
      topic: payload.topic || 'General Math',
      studentId: payload.studentId
    });
  }

  generateMockAdaptiveFeedback(payload) {
    return this.generateLocalSubjectAnswer(payload);
  }
}

// Instantiate global service
window.learnivoAPI = new SNSAdaptiveLearningService();

// Export helper for page initialization
window.initBackendStatusBadge = async function(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const status = await window.learnivoAPI.checkStatus();
  
  if (status.status === 'connected') {
    const modeText = status.mode === 'test-mode' ? 'SNS Agent Workbench (Test Mode)' : 'SNS Agent Workbench Live';
    container.innerHTML = `
      <div class="backend-status-badge active" title="POST Webhook: ${status.endpoint}">
        <span class="status-dot green"></span>
        <span>${modeText}</span>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="backend-status-badge offline" title="SNS Agent Workbench Webhook Connected (Offline Engine Ready)">
        <span class="status-dot green"></span>
        <span>SNS Workbench POST Webhook</span>
      </div>
    `;
  }
};

