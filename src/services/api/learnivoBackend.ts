import { MagicViewResult, MagicViewData } from '../../types';

const MASTER_WEBHOOK_URL =
  import.meta.env.VITE_LEARNIVO_MASTER_WEBHOOK_URL ||
  'https://api.agents.snsihub.ai/webhook/learnivo-magic-view';

export const learnivoBackend = {
  /**
   * Generates a structured Magic View visual explanation specification from the backend.
   */
  generateMagicView: async (
    message: string,
    userId: string,
    sessionId: string
  ): Promise<MagicViewResult> => {
    if (!message || !message.trim()) {
      throw new Error('Message is required for Magic View.');
    }

    try {
      const response = await fetch(MASTER_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'magic_view',
          user_id: userId,
          session_id: sessionId,
          message: message.trim(),
        }),
      });

      if (!response.ok) {
        console.warn(`Magic View webhook returned HTTP status ${response.status}`);
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      let rawData: any;

      if (contentType && contentType.includes('application/json')) {
        rawData = await response.json();
      } else {
        const text = await response.text();
        try {
          rawData = JSON.parse(text);
        } catch {
          rawData = { text };
        }
      }

      return normalizeMagicViewResponse(rawData, message);
    } catch (error) {
      console.error('Magic View API error:', error);
      throw error;
    }
  },
};

/**
  Normalizes raw backend response into clean MagicViewResult contract
 */
function normalizeMagicViewResponse(raw: any, queryMessage: string): MagicViewResult {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid Magic View payload received from server');
  }

  // Handle case where server response has data property or is root object
  const dataObj = raw.data || raw;

  const title = dataObj.title || dataObj.concept || `Visualizing: ${queryMessage}`;
  const concept = dataObj.concept || queryMessage;
  const visual_type = dataObj.visual_type || dataObj.visualType || 'process';
  const summary = dataObj.summary || dataObj.overview || dataObj.description || '';
  const key_takeaway = dataObj.key_takeaway || dataObj.keyTakeaway || dataObj.takeaway || '';

  // Steps
  const rawSteps = dataObj.steps || dataObj.process_steps || [];
  const steps = Array.isArray(rawSteps)
    ? rawSteps.map((s: any, idx: number) => ({
        step_number: s.step_number || s.step || idx + 1,
        title: s.title || `Step ${idx + 1}`,
        description: s.description || s.explanation || (typeof s === 'string' ? s : ''),
        active_elements: Array.isArray(s.active_elements)
          ? s.active_elements
          : Array.isArray(s.targets)
          ? s.targets
          : [],
        highlight_color: s.highlight_color || s.color || '#C7FF4A',
      }))
    : [];

  // Elements
  const rawElements = dataObj.elements || dataObj.nodes || dataObj.components || [];
  const elements = Array.isArray(rawElements)
    ? rawElements.map((e: any, idx: number) => ({
        id: String(e.id || `elem_${idx + 1}`),
        label: String(e.label || e.name || e.text || `Node ${idx + 1}`),
        type: String(e.type || 'box'),
        position: e.position && typeof e.position === 'object' ? { x: Number(e.position.x || 0), y: Number(e.position.y || 0) } : undefined,
        value: e.value !== undefined ? String(e.value) : undefined,
        color: e.color || e.highlight_color,
        state: e.state || 'normal',
        details: e.details || e.description,
      }))
    : [];

  // Connections
  const rawConnections = dataObj.connections || dataObj.edges || dataObj.arrows || [];
  const connections = Array.isArray(rawConnections)
    ? rawConnections.map((c: any) => ({
        from: String(c.from || c.source || ''),
        to: String(c.to || c.target || ''),
        label: c.label || c.text || '',
        type: c.type || 'arrow',
        color: c.color,
      })).filter((c: any) => Boolean(c.from && c.to))
    : [];

  // Animations
  const rawAnimations = dataObj.animations || [];
  const animations = Array.isArray(rawAnimations)
    ? rawAnimations.map((a: any, idx: number) => ({
        step: a.step || idx + 1,
        action: a.action || 'highlight',
        target_ids: Array.isArray(a.target_ids) ? a.target_ids : Array.isArray(a.targets) ? a.targets : [],
        description: a.description || '',
      }))
    : [];

  // Interactions
  const rawInteractions = dataObj.interactions || [];
  const interactions = Array.isArray(rawInteractions)
    ? rawInteractions.map((i: any) => ({
        id: i.id,
        type: i.type,
        target: i.target,
        action_description: i.action_description || i.description,
      }))
    : [];

  const normalizedData: MagicViewData = {
    title,
    concept,
    visual_type,
    summary,
    steps,
    elements,
    connections,
    animations,
    interactions,
    key_takeaway,
  };

  return {
    success: raw.success !== false,
    action: raw.action || 'magic_view',
    data: normalizedData,
  };
}
