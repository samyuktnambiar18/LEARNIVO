import { MagicViewResult, MagicViewData, MagicViewElement, MagicViewConnection, MagicViewStep } from '../../types';

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
      return {
        success: false,
        action: 'magic_view',
        errorMessage: "Magic View couldn't generate the visualization right now. Please try again."
      };
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
        return {
          success: false,
          action: 'magic_view',
          errorMessage: "Magic View couldn't generate the visualization right now. Please try again."
        };
      }

      const contentType = response.headers.get('content-type');
      let rawData: any;

      if (contentType && contentType.includes('application/json')) {
        rawData = await response.json();
      } else {
        const text = await response.text();
        rawData = { text };
      }

      console.log("Magic View raw response:", rawData);

      const normalizedResult = normalizeMagicViewPayload(rawData, message.trim());
      
      console.log("Magic View normalized response:", normalizedResult);
      if (normalizedResult.data) {
        console.log("Magic View elements:", normalizedResult.data.elements);
      }

      return normalizedResult;

    } catch (error) {
      console.error('Magic View API fetch error:', error);
      return {
        success: false,
        action: 'magic_view',
        errorMessage: "Magic View couldn't generate the visualization right now. Please try again."
      };
    }
  },
};

/**
 * Robustly parses and normalizes raw webhook payload into MagicViewResult
 */
function normalizeMagicViewPayload(rawData: any, userQuery: string): MagicViewResult {
  const genericErrorMessage = "Magic View couldn't generate the visualization right now. Please try again.";

  if (!rawData) {
    return { success: false, action: 'magic_view', errorMessage: genericErrorMessage };
  }

  // STEP 1: Extract real object payload from possible nested wrappers (output, response, data, text, result)
  let extractedObj: any = extractObjectFromRaw(rawData);

  if (!extractedObj) {
    return { success: false, action: 'magic_view', errorMessage: genericErrorMessage };
  }

  // Check for explicit error responses or AI model unavailable messages
  if (
    extractedObj.success === false ||
    extractedObj.error ||
    extractedObj.status === 'error' ||
    (typeof extractedObj.text === 'string' && (extractedObj.text.toLowerCase().includes('high demand') || extractedObj.text.toLowerCase().includes('rate limit') || extractedObj.text.toLowerCase().includes('unavailable')))
  ) {
    console.warn('Backend returned an error or failure response:', extractedObj.error || extractedObj.text);
    return { success: false, action: 'magic_view', errorMessage: genericErrorMessage };
  }

  // Target object containing elements, steps, etc.
  const source = extractedObj.data || extractedObj;

  // STEP 2: Normalize Elements
  const rawElements = source.elements || source.nodes || source.components || [];
  if (!Array.isArray(rawElements)) {
    return { success: false, action: 'magic_view', errorMessage: genericErrorMessage };
  }

  const elements: MagicViewElement[] = rawElements.map((e: any, idx: number) => {
    const id = String(e.id || `elem_${idx + 1}`);
    const label = String(e.label || e.name || e.text || `Node ${idx + 1}`);
    const rawType = String(e.type || 'box').toLowerCase();
    
    // Map element type to standard supported types: box, circle, text, arrow, image_placeholder, formula, node
    let type = 'box';
    if (rawType.includes('circle')) type = 'circle';
    else if (rawType.includes('text')) type = 'text';
    else if (rawType.includes('arrow')) type = 'arrow';
    else if (rawType.includes('formula') || rawType.includes('math')) type = 'formula';
    else if (rawType.includes('image')) type = 'image_placeholder';
    else if (rawType.includes('node')) type = 'node';

    // Parse position coordinates on 1200 x 700 canvas
    let pos = e.position;
    let x = 150 + (idx % 4) * 260;
    let y = 150 + Math.floor(idx / 4) * 200;

    if (pos && typeof pos === 'object') {
      const parsedX = Number(pos.x);
      const parsedY = Number(pos.y);
      if (!isNaN(parsedX) && !isNaN(parsedY)) {
        x = parsedX;
        y = parsedY;
      }
    }

    return {
      id,
      label,
      type,
      position: { x, y },
      value: e.value !== undefined ? String(e.value) : undefined,
      color: e.color || e.highlight_color,
      state: e.state || 'normal',
      details: e.details || e.description,
      width: Number(e.width) || undefined,
      height: Number(e.height) || undefined,
    };
  });

  const validElementIdSet = new Set(elements.map(e => e.id));

  // STEP 3: Normalize Connections (filter out invalid connections referencing non-existent element IDs)
  const rawConnections = source.connections || source.edges || source.arrows || [];
  const connections: MagicViewConnection[] = (Array.isArray(rawConnections) ? rawConnections : [])
    .map((c: any) => ({
      from: String(c.from || c.source || ''),
      to: String(c.to || c.target || ''),
      label: c.label || c.text || '',
      type: c.type || 'arrow',
      direction: c.direction || 'forward',
      color: c.color,
    }))
    .filter((c: MagicViewConnection) => validElementIdSet.has(c.from) && validElementIdSet.has(c.to));

  // STEP 4: Normalize Steps
  const rawSteps = source.steps || source.process_steps || [];
  let steps: MagicViewStep[] = [];

  if (Array.isArray(rawSteps) && rawSteps.length > 0) {
    steps = rawSteps.map((s: any, idx: number) => ({
      step_number: Number(s.step_number || s.step || idx + 1),
      title: String(s.title || `Step ${idx + 1}`),
      description: String(s.description || s.explanation || (typeof s === 'string' ? s : '')),
      active_elements: Array.isArray(s.active_elements)
        ? s.active_elements.map(String)
        : Array.isArray(s.targets)
        ? s.targets.map(String)
        : [],
      highlight_color: s.highlight_color || s.color || '#C7FF4A',
    }));
  } else if (elements.length > 0) {
    // Generate default steps if none explicitly returned by backend
    steps = elements.map((elem, idx) => ({
      step_number: idx + 1,
      title: elem.label || `Step ${idx + 1}`,
      description: elem.details || `Step ${idx + 1} of visualization for ${userQuery}.`,
      active_elements: [elem.id],
      highlight_color: '#C7FF4A',
    }));
  }

  // Validate that we have at least one element or step to render
  if (elements.length === 0 && steps.length === 0) {
    console.warn('Visualization validation failed: elements and steps arrays are empty.');
    return { success: false, action: 'magic_view', errorMessage: genericErrorMessage };
  }

  // STEP 5: Normalize Animations & Interactions
  const animations = Array.isArray(source.animations)
    ? source.animations.map((a: any, idx: number) => ({
        step: Number(a.step || idx + 1),
        action: String(a.action || 'highlight'),
        target_ids: Array.isArray(a.target_ids) ? a.target_ids.map(String) : [],
        description: String(a.description || ''),
      }))
    : [];

  const interactions = Array.isArray(source.interactions)
    ? source.interactions.map((i: any) => ({
        id: i.id ? String(i.id) : undefined,
        type: String(i.type || 'click'),
        target: i.target ? String(i.target) : undefined,
        action_description: String(i.action_description || i.description || ''),
      }))
    : [];

  const title = String(source.title || source.concept || `Visualizing: ${userQuery}`);
  const concept = String(source.concept || userQuery);
  const visual_type = String(source.visual_type || source.visualType || 'diagram');
  const summary = String(source.summary || source.overview || source.description || '');
  const key_takeaway = String(source.key_takeaway || source.keyTakeaway || source.takeaway || '');

  const data: MagicViewData = {
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
    success: true,
    action: 'magic_view',
    data,
  };
}

/**
 * Extracts and JSON-parses candidate payloads from raw webhook response wrapper
 */
function extractObjectFromRaw(rawData: any): any {
  if (!rawData) return null;

  if (typeof rawData === 'object' && (rawData.elements || rawData.steps || (rawData.data && typeof rawData.data === 'object'))) {
    return rawData;
  }

  let candidates: string[] = [];

  if (typeof rawData === 'string') {
    candidates.push(rawData);
  } else {
    if (typeof rawData.output === 'string') candidates.push(rawData.output);
    if (typeof rawData.response === 'string') candidates.push(rawData.response);
    if (typeof rawData.text === 'string') candidates.push(rawData.text);
    if (typeof rawData.result === 'string') candidates.push(rawData.result);
    if (typeof rawData.data === 'string') candidates.push(rawData.data);
  }

  for (const candidate of candidates) {
    if (!candidate || !candidate.trim()) continue;

    // Remove accidental markdown code fences such as ```json ... ```
    let cleaned = candidate.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch {
      // Ignore parse failure for this candidate string and try next
    }
  }

  if (typeof rawData === 'object') {
    return rawData;
  }

  return null;
}
