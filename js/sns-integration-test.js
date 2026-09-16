/**
 * SNS Workbench Integration Test Suite
 * Useful for debugging and verifying the backend connection
 * 
 * Add this script to any page for testing:
 * <script src="js/sns-integration-test.js"></script>
 */

window.SNSIntegrationTest = {
  /**
   * Run health check and display status
   */
  async testHealthCheck() {
    console.log('🔍 Running SNS Workbench Health Check...');
    try {
      const status = await window.learnivoAPI.checkStatus();
      console.group('✅ Health Check Results');
      console.log('Status:', status.status);
      console.log('Mode:', status.mode);
      console.log('Endpoint Type:', status.endpointType);
      console.log('Active Endpoint:', status.endpoint);
      console.groupEnd();
      return status;
    } catch (err) {
      console.error('❌ Health check failed:', err);
    }
  },

  /**
   * Test sending a question to the SNS Workbench
   */
  async testSendQuestion() {
    console.log('📤 Testing SNS Question Submission...');
    try {
      const response = await window.learnivoAPI.sendSubjectChatQuestion({
        question: 'What is the quadratic formula?',
        subject: 'Mathematics',
        topic: 'Quadratic Equations',
        studentId: 'TEST-001',
        studentName: 'Test Student',
        level: 'Intermediate'
      });

      console.group('✅ Question Response');
      console.log('Success:', response.success);
      console.log('Mode:', response.mode);
      console.log('Endpoint:', response.endpoint);
      console.log('Reply Text:', response.reply.text);
      if (response.reply.videoUrl) {
        console.log('Video URL:', response.reply.videoUrl);
        console.log('Video Title:', response.reply.title);
      }
      console.log('Raw Response:', response.rawResponse);
      console.groupEnd();
      return response;
    } catch (err) {
      console.error('❌ Question submission failed:', err);
    }
  },

  /**
   * Test multiple subjects and topics
   */
  async testMultipleSubjects() {
    console.log('🧪 Testing Multiple Subjects...');
    const subjects = [
      { subject: 'Mathematics', topic: 'Quadratic Equations', question: 'How do I solve quadratic equations?' },
      { subject: 'Physics', topic: 'Newton\'s Laws', question: 'Explain Newton\'s first law of motion' },
      { subject: 'Chemistry', topic: 'Chemical Bonding', question: 'What is a covalent bond?' }
    ];

    const results = [];
    for (const test of subjects) {
      try {
        console.log(`\n📨 Testing: ${test.subject} - ${test.topic}`);
        const response = await window.learnivoAPI.sendSubjectChatQuestion({
          question: test.question,
          subject: test.subject,
          topic: test.topic,
          studentId: 'TEST-001',
          studentName: 'Test Student'
        });
        results.push({
          subject: test.subject,
          success: response.success,
          endpoint: response.endpoint,
          hasReply: !!response.reply
        });
        console.log(`✅ Response received (${response.mode})`);
      } catch (err) {
        console.error(`❌ Failed for ${test.subject}:`, err.message);
      }
    }

    console.group('📊 Test Summary');
    console.table(results);
    console.groupEnd();
    return results;
  },

  /**
   * Test offline fallback
   */
  async testOfflineFallback() {
    console.log('🔌 Testing Offline Fallback...');
    try {
      // Simulate offline by temporarily changing endpoints
      const originalEndpoint = window.learnivoAPI.activeEndpoint;
      
      const response = await window.learnivoAPI.sendSubjectChatQuestion({
        question: 'Test offline fallback',
        subject: 'Mathematics',
        topic: 'General',
        studentId: 'TEST-OFFLINE',
        studentName: 'Offline Tester'
      });

      console.group('📡 Offline Fallback Test');
      console.log('Mode:', response.mode);
      console.log('Reply Generated:', !!response.reply.text);
      console.log('Reply Preview:', response.reply.text?.substring(0, 100) + '...');
      console.groupEnd();
      return response;
    } catch (err) {
      console.error('❌ Offline test failed:', err);
    }
  },

  /**
   * Display connection status badge
   */
  async displayStatusBadge(containerId = 'sns-status-badge') {
    const container = document.getElementById(containerId) || document.body;
    const status = await this.testHealthCheck();
    
    const badgeHTML = `
      <div style="margin: 1rem; padding: 1rem; border-radius: 8px; ${
        status.status === 'connected' 
          ? 'background: #D1FAE5; border: 2px solid #10B981; color: #065F46;' 
          : 'background: #FEE2E2; border: 2px solid #EF4444; color: #7F1D1D;'
      }">
        <strong>SNS Workbench Status:</strong> ${status.status.toUpperCase()}<br>
        <small>Mode: ${status.mode} | Type: ${status.endpointType}</small><br>
        ${status.endpoint ? `<small>Endpoint: ${status.endpoint.substring(0, 60)}...</small>` : ''}
      </div>
    `;
    
    if (typeof container === 'string') {
      container = document.getElementById(container);
    }
    
    if (container) {
      container.innerHTML = badgeHTML;
    }
  },

  /**
   * Run comprehensive test suite
   */
  async runFullTestSuite() {
    console.clear();
    console.log('🚀 Starting SNS Workbench Integration Test Suite\n');
    console.log('=' .repeat(60));

    try {
      // Test 1: Health Check
      console.log('\n[TEST 1] Health Check');
      const healthCheck = await this.testHealthCheck();

      // Test 2: Single Question
      if (healthCheck.status === 'connected') {
        console.log('\n[TEST 2] Question Submission');
        await this.testSendQuestion();
      } else {
        console.warn('⚠️ Skipping question test (offline mode)');
      }

      // Test 3: Multiple Subjects
      console.log('\n[TEST 3] Multiple Subjects');
      await this.testMultipleSubjects();

      // Test 4: Offline Fallback
      console.log('\n[TEST 4] Offline Fallback');
      await this.testOfflineFallback();

      // Display status
      console.log('\n' + '='.repeat(60));
      console.log('✅ Test Suite Complete');
      console.log('Check console output above for detailed results');

    } catch (err) {
      console.error('❌ Test suite error:', err);
    }
  },

  /**
   * Create an interactive test panel in the page
   */
  createTestPanel() {
    const panel = document.createElement('div');
    panel.id = 'sns-test-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #1F2937;
      color: #F3F4F6;
      padding: 1.5rem;
      border-radius: 12px;
      font-family: monospace;
      font-size: 12px;
      z-index: 9999;
      max-width: 400px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);
      max-height: 400px;
      overflow-y: auto;
    `;

    panel.innerHTML = `
      <div style="margin-bottom: 1rem; border-bottom: 1px solid #4B5563; padding-bottom: 1rem;">
        <h4 style="margin: 0 0 0.5rem 0; color: #10B981;">SNS Integration Test</h4>
        <div id="sns-status-display" style="font-size: 11px; color: #D1D5DB;"></div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 0.5rem;">
        <button onclick="window.SNSIntegrationTest.testHealthCheck()" style="padding: 0.5rem; background: #6366F1; color: white; border: none; border-radius: 4px; cursor: pointer;">
          ✓ Health Check
        </button>
        <button onclick="window.SNSIntegrationTest.testSendQuestion()" style="padding: 0.5rem; background: #8B5CF6; color: white; border: none; border-radius: 4px; cursor: pointer;">
          ✉️ Send Question
        </button>
        <button onclick="window.SNSIntegrationTest.testMultipleSubjects()" style="padding: 0.5rem; background: #EC4899; color: white; border: none; border-radius: 4px; cursor: pointer;">
          📚 Multiple Subjects
        </button>
        <button onclick="window.SNSIntegrationTest.runFullTestSuite()" style="padding: 0.5rem; background: #10B981; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
          ▶ Run Full Suite
        </button>
      </div>
    `;

    document.body.appendChild(panel);

    // Update status display
    this.testHealthCheck().then(status => {
      const display = document.getElementById('sns-status-display');
      if (display) {
        display.innerHTML = `
          Status: <strong style="color: ${status.status === 'connected' ? '#10B981' : '#EF4444'}">${status.status}</strong><br>
          Mode: ${status.mode}<br>
          Type: ${status.endpointType}
        `;
      }
    });
  }
};

// Auto-initialize test panel on page load if debug mode is enabled
if (window.location.search.includes('sns-debug') || localStorage.getItem('sns_debug')) {
  document.addEventListener('DOMContentLoaded', () => {
    window.SNSIntegrationTest.createTestPanel();
    window.SNSIntegrationTest.runFullTestSuite();
  });
}
