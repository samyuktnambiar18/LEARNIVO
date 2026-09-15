/* ==========================================================================
   LEARNIVO — Dynamic Syllabus & PDF AI Parser Engine
   Extracts text from PDF, DOCX, TXT files and parses structured subjects, units, & topics.
   ========================================================================== */

class LearnivoSyllabusParser {
  constructor() {
    this.pdfjsLib = null;
    this.initPdfLib();
  }

  /**
   * Load PDF.js CDN library dynamically if needed
   */
  async initPdfLib() {
    if (window.pdfjsLib) {
      this.pdfjsLib = window.pdfjsLib;
      return;
    }

    try {
      if (!document.getElementById('pdfjs-script')) {
        const script = document.createElement('script');
        script.id = 'pdfjs-script';
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
          if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            this.pdfjsLib = window.pdfjsLib;
          }
        };
        document.head.appendChild(script);
      }
    } catch (e) {
      console.warn('Could not load PDF.js script:', e);
    }
  }

  /**
   * Extract plain text content from uploaded File (PDF, DOCX, TXT)
   * @param {File} file 
   * @param {Function} progressCallback (percent)
   */
  async extractTextFromFile(file, progressCallback = null) {
    if (!file) throw new Error('No file provided');

    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.txt')) {
      if (progressCallback) progressCallback(30);
      const text = await file.text();
      if (progressCallback) progressCallback(60);
      return text;
    }

    if (fileName.endsWith('.pdf')) {
      return await this.extractTextFromPDF(file, progressCallback);
    }

    // For docx or other formats, attempt plain text reading
    try {
      if (progressCallback) progressCallback(30);
      const text = await file.text();
      // Filter non-printable control characters
      const cleanText = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');
      if (cleanText.trim().length > 30) {
        return cleanText;
      }
    } catch (e) {
      console.warn('Direct text read failed for file, attempting raw buffer decode');
    }

    return await this.readRawFileBuffer(file, progressCallback);
  }

  /**
   * Extract text page by page using PDF.js
   */
  async extractTextFromPDF(file, progressCallback) {
    if (progressCallback) progressCallback(15);

    if (!window.pdfjsLib) {
      await this.initPdfLib();
      // Brief pause if loading library async
      await new Promise(r => setTimeout(r, 400));
    }

    if (!window.pdfjsLib) {
      return await this.readRawFileBuffer(file, progressCallback);
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      let fullText = '';
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';

        if (progressCallback) {
          const pct = Math.min(55, Math.floor(15 + (i / numPages) * 40));
          progressCallback(pct);
        }
      }

      if (fullText.trim().length > 20) {
        return fullText;
      }
    } catch (err) {
      console.warn('PDF.js text extraction encountered error, using fallback reader:', err);
    }

    return await this.readRawFileBuffer(file, progressCallback);
  }

  async readRawFileBuffer(file, progressCallback) {
    const arrayBuffer = await file.arrayBuffer();
    const decoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false });
    let text = decoder.decode(arrayBuffer);

    // Extract printable sentences
    text = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ');
    if (progressCallback) progressCallback(50);
    return text;
  }

  /**
   * AI Syllabus Analyzer Engine
   * Dynamically parses text into courses, codes, units, and topics.
   * @param {string} rawText 
   * @param {Function} progressCallback 
   */
  async analyzeSyllabusContent(rawText, progressCallback = null) {
    if (progressCallback) progressCallback(65);

    // Simulate AI model processing delay with step progress
    await new Promise(r => setTimeout(r, 600));
    if (progressCallback) progressCallback(80);

    const text = rawText || '';
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

    // Dynamic structure container
    let courses = [];

    // Predefined common subject dictionary for standard detection matching
    const knownSubjects = [
      { name: 'Mathematics', code: 'MAT101', keywords: ['math', 'calculus', 'algebra', 'geometry', 'matrices', 'trigonometry', 'statistics', 'vectors', 'equations'] },
      { name: 'Physics', code: 'PHY101', keywords: ['physics', 'mechanics', 'thermodynamics', 'optics', 'electromagnetism', 'quantum', 'motion', 'kinematics'] },
      { name: 'Chemistry', code: 'CHM101', keywords: ['chemistry', 'organic', 'inorganic', 'bonding', 'atomic', 'reactions', 'molecules', 'chemical', 'stoichiometry'] },
      { name: 'Computer Science', code: 'CS101', keywords: ['computer', 'programming', 'code', 'python', 'java', 'data structures', 'algorithms', 'database', 'software'] },
      { name: 'Biology', code: 'BIO101', keywords: ['biology', 'genetics', 'cell', 'ecology', 'organism', 'botany', 'zoology', 'evolution', 'dna'] },
      { name: 'Economics', code: 'ECO101', keywords: ['economics', 'microeconomics', 'macroeconomics', 'finance', 'market', 'supply', 'demand', 'gdp'] },
      { name: 'History', code: 'HIS101', keywords: ['history', 'civilization', 'revolution', 'empire', 'world war', 'century', 'ancient', 'modern'] }
    ];

    // Detect subjects present in text
    let detectedMap = new Map();

    // 1. Scan for explicit headers e.g., "Course: ...", "Subject: ...", "Module: ..."
    lines.forEach(line => {
      const courseHeaderMatch = line.match(/^(?:course|subject|module|class)\s*[:=\-\|]\s*(.+)/i);
      if (courseHeaderMatch) {
        const title = courseHeaderMatch[1].trim();
        if (title.length > 2 && title.length < 50) {
          if (!detectedMap.has(title)) {
            detectedMap.set(title, {
              name: title,
              code: this.generateCourseCode(title),
              units: []
            });
          }
        }
      }
    });

    // 2. Keyword matching across text content
    const lowerText = text.toLowerCase();
    knownSubjects.forEach(sub => {
      const matchCount = sub.keywords.filter(kw => lowerText.includes(kw)).length;
      if (matchCount >= 2 && !detectedMap.has(sub.name)) {
        detectedMap.set(sub.name, {
          name: sub.name,
          code: sub.code,
          units: []
        });
      }
    });

    // If no course was automatically matched from keywords/headers, parse dynamic headings
    if (detectedMap.size === 0) {
      // Find prominent line headings
      const headingLines = lines.filter(l => l.length > 3 && l.length < 40 && !l.includes('.pdf') && !l.includes('http'));
      if (headingLines.length > 0) {
        const firstHeading = headingLines[0].replace(/[^a-zA-Z0-9\s]/g, '').trim();
        detectedMap.set(firstHeading || 'General Curriculum', {
          name: firstHeading || 'General Curriculum',
          code: 'CUR101',
          units: []
        });
      } else {
        detectedMap.set('General Studies', {
          name: 'General Studies',
          code: 'GEN101',
          units: []
        });
      }
    }

    // Convert map to course objects
    courses = Array.from(detectedMap.values());

    // 3. Extract Units and Topics for each course
    courses.forEach(course => {
      course.units = this.extractUnitsAndTopicsForCourse(lines, course.name);
    });

    if (progressCallback) progressCallback(95);
    await new Promise(r => setTimeout(r, 300));
    if (progressCallback) progressCallback(100);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      courses: courses
    };
  }

  extractUnitsAndTopicsForCourse(lines, courseName) {
    let units = [];
    let currentUnit = null;

    lines.forEach(line => {
      // Detect Unit/Chapter patterns: "Unit 1: ...", "Chapter 2 - ...", "Module 3 ..."
      const unitMatch = line.match(/^(?:unit|chapter|module|section|part)\s*(\d+|[IVXLCDM]+)\s*[:\-\|]?\s*(.*)/i);
      if (unitMatch) {
        if (currentUnit) {
          units.push(currentUnit);
        }
        const unitTitle = unitMatch[2].trim() || `Unit ${unitMatch[1]}`;
        currentUnit = {
          name: unitTitle,
          topics: []
        };
        return;
      }

      // Detect topic lines under active unit
      if (currentUnit) {
        const isTopicLine = line.startsWith('-') || line.startsWith('•') || line.startsWith('*') || line.match(/^\d+[\.\)]\s*(.+)/);
        if (isTopicLine) {
          const topicName = line.replace(/^[\-\•\*\d\.\)\s]+/, '').trim();
          if (topicName.length > 2 && topicName.length < 70) {
            currentUnit.topics.push(topicName);
          }
        }
      }
    });

    if (currentUnit && currentUnit.topics.length > 0) {
      units.push(currentUnit);
    }

    // Fallback units generation aligned to course if none extracted explicitly from PDF syntax
    if (units.length === 0) {
      units = this.generateFallbackUnitsForSubject(courseName);
    }

    return units;
  }

  generateCourseCode(name) {
    const clean = name.replace(/[^a-zA-Z]/g, '').toUpperCase();
    const prefix = clean.substring(0, 3) || 'CRS';
    return `${prefix}101`;
  }

  generateFallbackUnitsForSubject(subjectName) {
    const s = subjectName.toLowerCase();

    if (s.includes('math') || s.includes('mat')) {
      return [
        { name: 'Matrices & Determinants', topics: ['Types of Matrices', 'Matrix Operations', 'Determinants', 'Inverse Matrix'] },
        { name: 'Differential Calculus', topics: ['Limits Intro', 'Derivatives Rules', 'Chain Rule', 'Implicit Differentiation'] },
        { name: 'Integral Calculus', topics: ['Indefinite Integrals', 'Definite Integrals', 'Integration by Parts'] },
        { name: 'Vector Algebra', topics: ['Vector Operations', 'Dot Product', 'Cross Product'] },
        { name: 'Linear Systems', topics: ['2x2 Linear Systems', 'Gaussian Elimination', 'Cramer Rule'] }
      ];
    }

    if (s.includes('physic') || s.includes('phy')) {
      return [
        { name: 'Mechanics', topics: ['Kinematics', 'Newton Laws of Motion', 'Work & Energy', 'Momentum'] },
        { name: 'Thermodynamics', topics: ['Thermal Expansion', 'Heat Capacity', 'First Law of Thermodynamics'] },
        { name: 'Waves & Oscillations', topics: ['Simple Harmonic Motion', 'Sound Waves', 'Wave Interference'] },
        { name: 'Electromagnetism', topics: ['Electric Field', 'Gauss Law', 'Magnetic Force'] }
      ];
    }

    if (s.includes('chem') || s.includes('chm')) {
      return [
        { name: 'Atomic Structure', topics: ['Bohr Model', 'Quantum Numbers', 'Electron Configuration'] },
        { name: 'Chemical Bonding', topics: ['Ionic Bonds', 'Covalent Bonds', 'VSEPR Theory'] },
        { name: 'Thermodynamics & Kinetics', topics: ['Enthalpy', 'Rate Laws', 'Chemical Equilibrium'] }
      ];
    }

    if (s.includes('comp') || s.includes('code') || s.includes('cs')) {
      return [
        { name: 'Programming Fundamentals', topics: ['Variables & Data Types', 'Control Structures', 'Functions & Scope'] },
        { name: 'Data Structures', topics: ['Arrays & Strings', 'Linked Lists', 'Stacks & Queues', 'Trees & Graphs'] },
        { name: 'Algorithms', topics: ['Sorting Algorithms', 'Search Algorithms', 'Time Complexity Analysis'] }
      ];
    }

    return [
      { name: 'Fundamentals & Core Concepts', topics: ['Key Terminology', 'Foundational Principles', 'Basic Models'] },
      { name: 'Intermediate Applications', topics: ['Analytical Methods', 'Problem Solving Steps', 'Case Studies'] },
      { name: 'Advanced Topics', topics: ['System Integration', 'Practical Exercises', 'Comprehensive Review'] }
    ];
  }
}

// Expose globally
window.learnivoSyllabusParser = new LearnivoSyllabusParser();
