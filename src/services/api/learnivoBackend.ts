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
        errorMessage: "Magic View is temporarily unavailable. Please try again."
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
          errorMessage: "Magic View is temporarily unavailable. Please try again."
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

      // STEP 2: Console logging requirements
      console.log("MAGIC VIEW RAW RESPONSE:", rawData);

      const parsedResponse = extractObjectFromRaw(rawData);

      console.log("MAGIC VIEW PARSED RESPONSE:", parsedResponse);
      console.log("MAGIC VIEW ELEMENTS:", parsedResponse?.elements);
      console.log("MAGIC VIEW VISUAL TYPE:", parsedResponse?.visual_type);

      const normalizedResult = normalizeMagicViewPayload(rawData, parsedResponse, message.trim());
      
      return normalizedResult;

    } catch (error) {
      console.error("MAGIC VIEW PARSE ERROR:", error);
      return {
        success: false,
        action: 'magic_view',
        errorMessage: "Magic View is temporarily unavailable. Please try again."
      };
    }
  },
};

/**
 * Robustly normalizes raw webhook payload into MagicViewResult
 */
function normalizeMagicViewPayload(rawData: any, parsedResponse: any, userQuery: string): MagicViewResult {
  const genericErrorMessage = "Magic View is temporarily unavailable. Please try again.";

  if (!parsedResponse) {
    return { success: false, action: 'magic_view', errorMessage: genericErrorMessage };
  }

  // STEP 4: Handle backend errors correctly (Gemini high demand / quota / rate limits / success === false)
  const errString = (JSON.stringify(rawData) + JSON.stringify(parsedResponse)).toLowerCase();
  const isAiError =
    errString.includes('high demand') ||
    errString.includes('quota') ||
    errString.includes('exceeded your current') ||
    errString.includes('temporarily unavailable') ||
    errString.includes('rate limit');

  if (isAiError || (parsedResponse.success === false && parsedResponse.error)) {
    console.warn('Backend returned AI error or failure status:', parsedResponse.error || rawData);
    return { success: false, action: 'magic_view', errorMessage: genericErrorMessage };
  }

  // Target object containing elements, steps, summary, html, imageUrl etc.
  const source = parsedResponse.data || parsedResponse.result || parsedResponse;

  // Extract HTML content if available
  let html: string | undefined = undefined;
  if (typeof source.html === 'string' && source.html.trim()) {
    html = source.html;
  } else if (typeof source.htmlCode === 'string' && source.htmlCode.trim()) {
    html = source.htmlCode;
  } else if (typeof source.markup === 'string' && source.markup.trim()) {
    html = source.markup;
  } else if (typeof source.content === 'string' && (source.content.includes('<') && source.content.includes('>'))) {
    html = source.content;
  } else if (typeof rawData === 'string' && (rawData.includes('<') && rawData.includes('>'))) {
    html = rawData;
  }

  // Extract Image URL if available
  let imageUrl: string | undefined = undefined;
  const rawImg = source.imageUrl || source.image_url || source.image || source.img || source.src;
  if (typeof rawImg === 'string' && rawImg.trim()) {
    imageUrl = rawImg.trim();
  } else if (typeof source.url === 'string' && (source.url.startsWith('http') || source.url.startsWith('data:image/'))) {
    imageUrl = source.url.trim();
  } else if (typeof rawData === 'string' && (rawData.startsWith('http') || rawData.startsWith('data:image/'))) {
    imageUrl = rawData.trim();
  }

  // Extract required & optional fields
  const title = String(source.title || source.concept || source.question || `Visualizing: ${userQuery}`);
  const concept = String(source.concept || userQuery);
  const visual_type = String(source.visual_type || source.visualType || (html ? 'html_preview' : imageUrl ? 'image_preview' : 'diagram'));
  const summary = String(source.summary || source.overview || source.description || `Visual explanation for ${userQuery}.`);
  const key_takeaway = String(source.key_takeaway || source.keyTakeaway || source.takeaway || `${userQuery} core concept breakdown.`);

  // Elements (Array, default [])
  const rawElements = Array.isArray(source.elements) ? source.elements : Array.isArray(source.nodes) ? source.nodes : [];
  const elements: MagicViewElement[] = rawElements.map((e: any, idx: number) => {
    const id = String(e.id || `elem_${idx + 1}`);
    const label = String(e.label || e.name || e.text || `Node ${idx + 1}`);
    const rawType = String(e.type || 'box').toLowerCase();
    
    let type = 'box';
    if (rawType.includes('circle')) type = 'circle';
    else if (rawType.includes('text')) type = 'text';
    else if (rawType.includes('arrow')) type = 'arrow';
    else if (rawType.includes('formula') || rawType.includes('math')) type = 'formula';
    else if (rawType.includes('image')) type = 'image_placeholder';
    else if (rawType.includes('node')) type = 'node';

    let x = 200 + (idx % 4) * 250;
    let y = 180 + Math.floor(idx / 4) * 180;

    if (e.position && typeof e.position === 'object') {
      const parsedX = Number(e.position.x);
      const parsedY = Number(e.position.y);
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

  // Connections (Array, default [])
  const rawConnections = Array.isArray(source.connections) ? source.connections : Array.isArray(source.edges) ? source.edges : [];
  const connections: MagicViewConnection[] = rawConnections
    .map((c: any) => ({
      from: String(c.from || c.source || ''),
      to: String(c.to || c.target || ''),
      label: c.label || c.text || '',
      type: c.type || 'arrow',
      direction: c.direction || 'forward',
      color: c.color,
    }))
    .filter((c: MagicViewConnection) => validElementIdSet.size === 0 || (validElementIdSet.has(c.from) && validElementIdSet.has(c.to)));

  // Steps (Array, default [])
  const rawSteps = Array.isArray(source.steps) ? source.steps : Array.isArray(source.process_steps) ? source.process_steps : [];
  const steps: MagicViewStep[] = rawSteps.map((s: any, idx: number) => ({
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

  // Animations & Interactions (Optional, default [])
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
    html,
    imageUrl,
  };

  return {
    success: source.success !== false,
    action: 'magic_view',
    data,
  };
}

/**
 * Extracts and JSON-parses candidate payloads from raw webhook response wrappers
 * Wrappers supported: output, response, result, text, data, responseData, or rawData object directly
 */
function extractObjectFromRaw(rawData: any): any {
  if (!rawData) return null;

  // Search candidate sub-objects first (such as rawData.result, rawData.data, rawData.output)
  const candidateFields = [
    rawData.result,
    rawData.data,
    rawData.output,
    rawData.response,
    rawData.responseData,
    rawData._RESPONSEDATA?.output,
    rawData,
  ];

  for (const candidate of candidateFields) {
    if (!candidate) continue;

    let target = candidate;

    if (typeof target === 'string') {
      let cleaned = target.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      try {
        target = JSON.parse(cleaned);
      } catch {
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          try {
            target = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
          } catch {
            // Continuation
          }
        }
      }
    }

    if (target && typeof target === 'object') {
      if (
        Array.isArray(target.elements) ||
        Array.isArray(target.steps) ||
        Array.isArray(target.nodes) ||
        target.visual_type ||
        target.title ||
        target.summary ||
        target.concept ||
        target.html ||
        target.htmlCode ||
        target.markup ||
        target.imageUrl ||
        target.image_url ||
        target.image
      ) {
        return target;
      }
    }
  }

  return typeof rawData === 'object' ? rawData : null;
}
