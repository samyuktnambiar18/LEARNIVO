# SNS Workbench Adaptive Learning Integration Guide

## Production Webhook Configuration

Your LEARNIVO frontend is now connected to the SNS Workbench production backend.

### Primary Production Endpoint
```
https://api.agents.snsihub.ai/webhook/adaptive-learning
```

### Backup/Test Endpoint
```
https://api.agents.snsihub.ai/webhook-test/adaptive-learning
```

### Legacy Endpoints (Fallback)
```
Production: https://api.agents.snsihub.ai/webhook/4a662d25-cbee-4e03-8afb-ecb929b27719
Test:       https://api.agents.snsihub.ai/webhook-test/4a662d25-cbee-4e03-8afb-ecb929b27719
```

## How It Works

### 1. Endpoint Resolution
The system automatically checks endpoints in this priority order:
- **Production Adaptive Learning** ← Primary endpoint
- **Test Adaptive Learning** ← Fallback
- **Legacy Production** ← Legacy support
- **Legacy Test** ← Final fallback
- **Local Offline Engine** ← Last resort

### 2. Request Flow
```
Frontend (JS) → POST Request → SNS Webhook (Adaptive Learning)
   ↓
   Question Payload: {
     message: "user question",
     subject: "Mathematics",
     topic: "Quadratic Equations",
     student_id: "S001",
     student_name: "Alex Morgan",
     timestamp: "ISO datetime"
   }
```

### 3. Response Parsing
The service intelligently extracts:
- **Text explanations** - from response.text or response.explanation
- **Video URLs** - YouTube videos recommended by SNS Agent
- **Video titles** - metadata for the recommended resource

## Usage Examples

### Subject Chat Request
```javascript
const response = await window.learnivoAPI.sendSubjectChatQuestion({
  question: "How do I solve quadratic equations?",
  subject: "Mathematics",
  topic: "Quadratic Equations",
  studentId: "S001",
  studentName: "Alex Morgan",
  level: "Intermediate"
});

console.log(response.reply.text);      // AI explanation
console.log(response.reply.videoUrl);  // Recommended YouTube video
console.log(response.endpoint);        // Which endpoint was used
```

### Health Check
```javascript
const status = await window.learnivoAPI.checkStatus();
console.log(status.status);        // 'connected' | 'offline'
console.log(status.endpoint);      // Active endpoint URL
console.log(status.mode);          // 'production' | 'test-mode' | 'offline'
console.log(status.endpointType);  // 'production' | 'test' | 'legacy' | 'none'
```

## Fallback Behavior

If the SNS Workbench backend is unreachable:
1. Service tries all endpoints in sequence with 12-second timeouts
2. Returns offline response with local AI-generated explanation
3. Provides curriculum-aligned YouTube video fallback
4. Generates contextual math/science answers based on subject & topic

## Integration Points

### Chat Interface
- **Location**: `pages/chat.html`
- **Script**: `js/chat.js`
- Uses `window.learnivoAPI.sendSubjectChatQuestion()`

### Practice Module
- **Location**: `pages/practice.html`
- **Script**: `js/practice.js`
- Can request adaptive questions from SNS Workbench

### Learning Module
- **Location**: `pages/learning.html`
- **Script**: `js/learning.js`
- Fetches subject resources & recommendations

### Dashboard Status Badge
- **Display**: Backend connection status indicator
- **Refresh**: Auto-updates every session load
- Shows active endpoint & connection mode

## Troubleshooting

### No Response
1. Check browser console for network errors
2. Verify endpoint accessibility: `curl https://api.agents.snsihub.ai/webhook/adaptive-learning`
3. Check request payload format matches SNS Agent expectations

### Slow Responses
- Primary endpoint timeout: 12 seconds
- Falls back to test/legacy automatically
- Check network latency & SNS service status

### Empty Responses
- Service generates local fallback explanations
- Checks for video metadata in response
- Returns curriculum-aligned resources as backup

## Configuration

To modify endpoints, edit:
```
File: js/api.js
Config Object: LEARNIVO_API_CONFIG
```

### Available Configuration
```javascript
const LEARNIVO_API_CONFIG = {
  chatWebhook: 'production-url',
  chatTestWebhook: 'test-url',
  legacyChatWebhook: 'legacy-production-url',
  legacyChatTestWebhook: 'legacy-test-url',
  timeoutMs: 12000  // Timeout in milliseconds
};
```

## Response Format

### Success Response
```javascript
{
  success: true,
  endpoint: "https://api.agents.snsihub.ai/webhook/adaptive-learning",
  mode: "production",
  reply: {
    text: "Detailed explanation...",
    title: "Video title",
    videoUrl: "https://youtube.com/watch?v=...",
    videoId: "fKAAbXPEATu",
    raw: { /* full SNS response */ }
  },
  rawResponse: { /* full backend response */ }
}
```

### Offline Response
```javascript
{
  success: false,
  endpoint: null,
  mode: "offline",
  error: "SNS Agent Workbench offline",
  reply: {
    text: "Local generated explanation..."
  }
}
```

## Testing the Integration

### In Browser Console
```javascript
// Test connection
await window.learnivoAPI.checkStatus();

// Send test question
const result = await window.learnivoAPI.sendSubjectChatQuestion({
  question: "What is algebra?",
  subject: "Mathematics",
  topic: "Introduction to Algebra"
});

console.log(result);
```

### In HTML Page
```html
<div id="backend-status-container"></div>

<script>
  await window.initBackendStatusBadge('backend-status-container');
</script>
```

---

**Last Updated**: September 16, 2026  
**Endpoint**: https://api.agents.snsihub.ai/webhook/adaptive-learning  
**Status**: ✅ Production Connected
