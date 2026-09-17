import { parseAdaptiveLearningResponse } from '../../utils/adapters';
import {
  AdaptiveLearningResult,
  PracticeAttempt,
  Question,
  AssessmentSuiteData,
  NormalizedAssessmentQuestion,
  NormalizedAssessmentOption,
  AssessmentSubmissionPayload,
  AssessmentSubmissionAnswer
} from '../../types';
import { supabase } from '../supabase';

const ADAPTIVE_LEARNING_WEBHOOK_URL =
  import.meta.env.VITE_ADAPTIVE_LEARNING_WEBHOOK_URL ||
  'https://api.agents.snsihub.ai/webhook/adaptive-learning';

export const DEFAULT_CANDIDATE_URLS = [
  import.meta.env.VITE_ADAPTIVE_LEARNING_WEBHOOK_URL,
  'https://api.agents.snsihub.ai/webhook/fbe93af0-6a48-4500-8768-788623f218ca',
  'https://api.agents.snsihub.ai/webhook-test/fbe93af0-6a48-4500-8768-788623f218ca',
  'https://api.agents.snsihub.ai/webhook/adaptive-learning',
  'https://api.agents.snsihub.ai/webhook-test/adaptive-learning'
].filter(Boolean) as string[];

let activeAssessmentWebhookUrl: string = DEFAULT_CANDIDATE_URLS[0] || ADAPTIVE_LEARNING_WEBHOOK_URL;

export interface AssessmentEvaluationResult {
  score: number;
  total_marks: number;
  obtained_marks: number;
  correct_answers: number;
  incorrect_answers: number;
  weak_topics: string[];
  strong_topics: string[];
  misconceptions: string[];
  knowledge_gaps: string[];
  level: string;
  raw?: any;
}

export function generateSubjectCode(name: string): string {
  if (!name) return '23ITT201';
  const clean = name.trim().toUpperCase();
  if (clean === 'DATA STRUCTURES') return '23ITT201';
  if (clean === 'DATABASE MANAGEMENT SYSTEMS') return '23ITT202';
  if (clean === 'OPERATING SYSTEMS') return '23ITT203';
  if (clean === 'COMPUTER NETWORKS') return '23ITT204';

  const STOP_WORDS = new Set(['AND', 'THE', 'OF', 'IN', 'FOR', 'WITH', 'ON', 'AT', 'TO']);
  const words = clean
    .replace(/[^A-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => Boolean(w) && !STOP_WORDS.has(w));

  if (words.length >= 2) {
    const initials = words.map(w => w[0]).join('').slice(0, 3);
    return `23${initials}201`;
  }
  return `23${clean.replace(/[^A-Z0-9]/g, '').slice(0, 3)}201`;
}

export function resolveActiveSubjectContext(explicit?: {
  subject_code?: string;
  subject_name?: string;
  total_questions?: number;
}): { subject_code: string; subject_name: string; total_questions: number } {
  if (explicit?.subject_name && explicit?.subject_code) {
    return {
      subject_name: explicit.subject_name.trim().toUpperCase(),
      subject_code: explicit.subject_code.trim().toUpperCase(),
      total_questions: explicit.total_questions || 10
    };
  }

  // 1. Check URL parameters
  if (typeof window !== 'undefined' && window.location) {
    try {
      const params = new URLSearchParams(window.location.search);
      const subName = params.get('subject_name') || params.get('subject') || params.get('course');
      const subCode = params.get('subject_code') || params.get('code');
      const totalQ = params.get('total_questions') ? Number(params.get('total_questions')) : undefined;
      if (subName) {
        return {
          subject_name: subName.trim().toUpperCase(),
          subject_code: (subCode || generateSubjectCode(subName)).trim().toUpperCase(),
          total_questions: totalQ || explicit?.total_questions || 10
        };
      }
    } catch {}
  }

  // 2. Check session / local storage
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const savedSubjectStr = window.sessionStorage.getItem('learnivo_active_subject') || window.localStorage.getItem('learnivo_current_subject');
      if (savedSubjectStr) {
        const parsed = JSON.parse(savedSubjectStr);
        if (parsed.subject_name) {
          return {
            subject_name: parsed.subject_name.trim().toUpperCase(),
            subject_code: (parsed.subject_code || generateSubjectCode(parsed.subject_name)).trim().toUpperCase(),
            total_questions: Number(parsed.total_questions) || explicit?.total_questions || 10
          };
        }
      }
    } catch {}
  }

  // 3. Check materials in storage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const matStr = window.localStorage.getItem('learnivo_materials');
      if (matStr) {
        const materials = JSON.parse(matStr);
        if (Array.isArray(materials) && materials.length > 0 && materials[0]?.title) {
          const matTitle = String(materials[0].title).trim().toUpperCase();
          return {
            subject_name: matTitle,
            subject_code: generateSubjectCode(matTitle),
            total_questions: explicit?.total_questions || 10
          };
        }
      }
    } catch {}
  }

  // Default fallback if no subject has been loaded yet
  const defaultName = explicit?.subject_name || 'DATA STRUCTURES';
  const defaultCode = explicit?.subject_code || generateSubjectCode(defaultName);
  return {
    subject_name: defaultName,
    subject_code: defaultCode,
    total_questions: explicit?.total_questions || 10
  };
}

export const adaptiveLearningService = {
  /**
   * Evaluates student activity locally without posting deprecated adaptive_learning payload
   */
  evaluateActivity: async (attempts: PracticeAttempt[]): Promise<AdaptiveLearningResult> => {
    return buildLocalEvaluation(attempts);
  },

  /**
   * Submits dynamic assessment answers in a single request to the SNS Workbench webhook
   */
  submitAssessment: async (
    payload: AssessmentSubmissionPayload
  ): Promise<any> => {
    console.log('SUBMIT ASSESSMENT TO SNS WORKBENCH PAYLOAD:', JSON.stringify(payload, null, 2));

    const urlsToTry = [
      activeAssessmentWebhookUrl,
      ...DEFAULT_CANDIDATE_URLS.filter(u => u !== activeAssessmentWebhookUrl)
    ];

    for (const url of urlsToTry) {
      try {
        console.log('Sending final assessment submission to webhook:', url);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          console.warn(`Submission to ${url} returned status: ${response.status}`);
          continue;
        }

        activeAssessmentWebhookUrl = url;
        const contentType = response.headers.get('content-type');
        let rawData: any;

        if (contentType && contentType.includes('application/json')) {
          rawData = await response.json();
        } else {
          const text = await response.text();
          try {
            const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
            rawData = JSON.parse(cleaned);
          } catch {
            rawData = { message: text };
          }
        }

        console.log('SNS WORKBENCH SUBMISSION RESPONSE:', rawData);
        return rawData;
      } catch (err) {
        console.warn(`Error submitting assessment to ${url}:`, err);
      }
    }

    console.warn('All webhook submission endpoints attempted.');
    return { status: 'submitted_locally' };
  },

  /**
   * Triggers the Attend Assessment webhook dynamically for any subject and parses questions
   */
  fetchAssessmentQuestionsFromWebhook: async (subjectContext?: {
    subject_code?: string;
    subject_name?: string;
    total_questions?: number;
  }): Promise<AssessmentSuiteData | null> => {
    const targetSubject = resolveActiveSubjectContext(subjectContext);

    for (const url of DEFAULT_CANDIDATE_URLS) {
      try {
        console.log(`Attempting to fetch assessment questions from webhook (${url}) for subject:`, targetSubject.subject_name);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'attend_assessment',
            message: 'Attend Assessment',
            subject_code: targetSubject.subject_code,
            subject_name: targetSubject.subject_name,
            total_questions: targetSubject.total_questions,
            timestamp: new Date().toISOString()
          })
        });

        if (!response.ok) {
          console.warn(`Webhook at ${url} returned status: ${response.status}`);
          continue;
        }

        activeAssessmentWebhookUrl = url;
        const contentType = response.headers.get('content-type');
        let data: any;

        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          try {
            const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
            data = JSON.parse(cleaned);
          } catch {
            data = { text };
          }
        }

        console.log(`ATTEND ASSESSMENT WEBHOOK (${url}) RAW RESPONSE:`, data);
        const parsedSuite = parseAssessmentPayload(data, targetSubject.subject_code, targetSubject.subject_name, targetSubject.total_questions);
        if (parsedSuite && parsedSuite.questions && parsedSuite.questions.length > 0) {
          console.log('PARSED ASSESSMENT SUITE FROM WEBHOOK:', parsedSuite);
          return parsedSuite;
        }
      } catch (error) {
        console.warn(`Error fetching assessment webhook from ${url}:`, error);
      }
    }

    console.warn(`External assessment webhooks returned 404/inactive. Utilizing dynamic ${targetSubject.subject_code} ${targetSubject.subject_name} assessment suite.`);
    return getFallbackAssessmentSuite(targetSubject.subject_code, targetSubject.subject_name, targetSubject.total_questions);
  }
};


export function getFallbackAssessmentSuite(
  subjectCode?: string,
  subjectName?: string,
  totalQuestions?: number
): AssessmentSuiteData {
  const code = subjectCode || (subjectName ? generateSubjectCode(subjectName) : '23ITT201');
  const name = subjectName ? subjectName.trim().toUpperCase() : 'DATA STRUCTURES';

  const subjectQuestionBanks: Record<string, NormalizedAssessmentQuestion[]> = {
    'DATABASE MANAGEMENT SYSTEMS': [
      {
        question_number: 1,
        unit: 'UNIT I',
        topic: 'Relational Model & Keys',
        difficulty: 'Easy',
        question: 'Which of the following uniquely identifies each tuple in a relational relation with no redundant attributes?',
        options: [
          { key: 'A', text: 'Candidate Key' },
          { key: 'B', text: 'Foreign Key' },
          { key: 'C', text: 'Secondary Key' },
          { key: 'D', text: 'Composite Key' }
        ],
        correct_answer: 'A',
        explanation: 'A candidate key is a minimal superkey that uniquely identifies tuples without extraneous attributes.'
      },
      {
        question_number: 2,
        unit: 'UNIT I',
        topic: 'Relational Algebra',
        difficulty: 'Medium',
        question: 'Which relational algebra operation selects rows that satisfy a specified predicate condition?',
        options: [
          { key: 'A', text: 'Projection (π)' },
          { key: 'B', text: 'Selection (σ)' },
          { key: 'C', text: 'Join (⋈)' },
          { key: 'D', text: 'Cartesian Product (×)' }
        ],
        correct_answer: 'B',
        explanation: 'The selection operator (sigma) filters rows/tuples based on a boolean condition.'
      },
      {
        question_number: 3,
        unit: 'UNIT II',
        topic: 'SQL Queries & Constraints',
        difficulty: 'Easy',
        question: 'Which SQL clause is used to filter the results of an aggregate function such as COUNT() or AVG()?',
        options: [
          { key: 'A', text: 'WHERE' },
          { key: 'B', text: 'HAVING' },
          { key: 'C', text: 'GROUP BY' },
          { key: 'D', text: 'ORDER BY' }
        ],
        correct_answer: 'B',
        explanation: 'The HAVING clause applies filtering conditions to grouped rows produced by aggregate functions.'
      },
      {
        question_number: 4,
        unit: 'UNIT II',
        topic: 'Normalization',
        difficulty: 'Medium',
        question: 'A relation is in Third Normal Form (3NF) if it is in 2NF and has no:',
        options: [
          { key: 'A', text: 'Partial dependencies' },
          { key: 'B', text: 'Transitive dependencies' },
          { key: 'C', text: 'Multi-valued dependencies' },
          { key: 'D', text: 'Atomic domain violations' }
        ],
        correct_answer: 'B',
        explanation: '3NF strictly prohibits transitive dependencies between non-prime attributes and candidate keys.'
      },
      {
        question_number: 5,
        unit: 'UNIT III',
        topic: 'Transaction Management (ACID)',
        difficulty: 'Medium',
        question: 'Which ACID property guarantees that all operations in a database transaction complete successfully or none are applied?',
        options: [
          { key: 'A', text: 'Atomicity' },
          { key: 'B', text: 'Consistency' },
          { key: 'C', text: 'Isolation' },
          { key: 'D', text: 'Durability' }
        ],
        correct_answer: 'A',
        explanation: 'Atomicity enforces an all-or-nothing execution rule across transaction steps.'
      },
      {
        question_number: 6,
        unit: 'UNIT III',
        topic: 'Concurrency Control',
        difficulty: 'Hard',
        question: 'In Two-Phase Locking (2PL), once a transaction releases any lock, it enters which phase?',
        options: [
          { key: 'A', text: 'Growing Phase' },
          { key: 'B', text: 'Shrinking Phase' },
          { key: 'C', text: 'Validation Phase' },
          { key: 'D', text: 'Commit Phase' }
        ],
        correct_answer: 'B',
        explanation: 'In 2PL, once the first lock is released, the transaction enters the shrinking phase and cannot acquire any new locks.'
      },
      {
        question_number: 7,
        unit: 'UNIT IV',
        topic: 'Indexing & B+ Trees',
        difficulty: 'Medium',
        question: 'Why are B+ Trees preferred over B Trees for disk-based database index storage?',
        options: [
          { key: 'A', text: 'All data pointers reside exclusively in leaf nodes, providing sequential range scans' },
          { key: 'B', text: 'B+ Trees have a smaller fan-out factor' },
          { key: 'C', text: 'B+ Trees do not require rebalancing during insertions' },
          { key: 'D', text: 'B+ Trees use less physical disk space' }
        ],
        correct_answer: 'A',
        explanation: 'B+ tree leaf nodes form a linked list containing all records, maximizing range search efficiency.'
      },
      {
        question_number: 8,
        unit: 'UNIT IV',
        topic: 'Query Optimization',
        difficulty: 'Medium',
        question: 'Which heuristic is fundamentally applied first during relational query tree optimization?',
        options: [
          { key: 'A', text: 'Perform cross products early' },
          { key: 'B', text: 'Push selections down the query tree to reduce intermediate relation sizes' },
          { key: 'C', text: 'Eliminate indexes on primary keys' },
          { key: 'D', text: 'Perform projection before selection' }
        ],
        correct_answer: 'B',
        explanation: 'Pushing selections down minimizes the volume of tuples passed to subsequent join operations.'
      },
      {
        question_number: 9,
        unit: 'UNIT V',
        topic: 'Database Recovery',
        difficulty: 'Hard',
        question: 'In Write-Ahead Logging (WAL), when must log records for a database modification be written to stable storage?',
        options: [
          { key: 'A', text: 'After the modified database buffer page is written to disk' },
          { key: 'B', text: 'Before the corresponding database buffer page is written to disk' },
          { key: 'C', text: 'At checkpoint creation time exclusively' },
          { key: 'D', text: 'Only during system restart recovery' }
        ],
        correct_answer: 'B',
        explanation: 'WAL mandates that log records detailing changes precede dirty data page writes to persistent storage.'
      },
      {
        question_number: 10,
        unit: 'UNIT V',
        topic: 'Distributed Databases',
        difficulty: 'Medium',
        question: 'In the CAP theorem for distributed data stores, which two properties are prioritized during a network partition?',
        options: [
          { key: 'A', text: 'Consistency and Availability' },
          { key: 'B', text: 'Either Consistency or Availability (CP or AP)' },
          { key: 'C', text: 'Performance and Durability' },
          { key: 'D', text: 'Atomicity and Partition Tolerance' }
        ],
        correct_answer: 'B',
        explanation: 'Under network partition (P), a distributed system must choose between consistency (C) or availability (A).'
      }
    ],

    'OPERATING SYSTEMS': [
      {
        question_number: 1,
        unit: 'UNIT I',
        topic: 'Processes & Threads',
        difficulty: 'Easy',
        question: 'What resource is shared among multiple threads within the same process?',
        options: [
          { key: 'A', text: 'CPU Registers' },
          { key: 'B', text: 'Call Stack' },
          { key: 'C', text: 'Address Space & Open Files' },
          { key: 'D', text: 'Program Counter' }
        ],
        correct_answer: 'C',
        explanation: 'Threads of the same process share code, global data, heap memory, and open file descriptors.'
      },
      {
        question_number: 2,
        unit: 'UNIT I',
        topic: 'System Calls',
        difficulty: 'Easy',
        question: 'Which mechanism is executed by user applications to request privileged OS kernel services?',
        options: [
          { key: 'A', text: 'Interrupt Request (IRQ)' },
          { key: 'B', text: 'System Call / Software Trap' },
          { key: 'C', text: 'Direct Memory Access' },
          { key: 'D', text: 'Spinlock wait' }
        ],
        correct_answer: 'B',
        explanation: 'A system call triggers a controlled trap instruction transitioning CPU mode from user to kernel.'
      },
      {
        question_number: 3,
        unit: 'UNIT II',
        topic: 'CPU Scheduling',
        difficulty: 'Medium',
        question: 'Which CPU scheduling algorithm gives the lowest theoretical average waiting time for a given set of stationary processes?',
        options: [
          { key: 'A', text: 'First-Come, First-Served (FCFS)' },
          { key: 'B', text: 'Shortest Job First (SJF)' },
          { key: 'C', text: 'Round Robin (RR)' },
          { key: 'D', text: 'Priority Scheduling without preemption' }
        ],
        correct_answer: 'B',
        explanation: 'SJF is provably optimal regarding minimum average waiting time across non-preemptive algorithms.'
      },
      {
        question_number: 4,
        unit: 'UNIT II',
        topic: 'Process Synchronization',
        difficulty: 'Hard',
        question: 'A counting semaphore S is initialized to 7. After 10 wait() operations and 5 signal() operations, what is the value of S?',
        options: [
          { key: 'A', text: '2' },
          { key: 'B', text: '3' },
          { key: 'C', text: '0' },
          { key: 'D', text: '12' }
        ],
        correct_answer: 'A',
        explanation: 'Value of S = 7 - 10 + 5 = 2.'
      },
      {
        question_number: 5,
        unit: 'UNIT III',
        topic: 'Deadlock Handling',
        difficulty: 'Hard',
        question: 'Which algorithm is utilized by the operating system for dynamic deadlock avoidance with multiple resource instances?',
        options: [
          { key: 'A', text: 'Peterson\'s Algorithm' },
          { key: 'B', text: 'Banker\'s Algorithm' },
          { key: 'C', text: 'Bakery Algorithm' },
          { key: 'D', text: 'SSTF Algorithm' }
        ],
        correct_answer: 'B',
        explanation: 'Banker\'s algorithm determines whether allocating requested resources leaves the system in a safe state.'
      },
      {
        question_number: 6,
        unit: 'UNIT III',
        topic: 'Memory Management & Paging',
        difficulty: 'Medium',
        question: 'What hardware component speeds up virtual-to-physical address translation by caching recent page table mappings?',
        options: [
          { key: 'A', text: 'Translation Lookaside Buffer (TLB)' },
          { key: 'B', text: 'Memory Management Unit (MMU) Register' },
          { key: 'C', text: 'L3 Cache' },
          { key: 'D', text: 'Direct Memory Controller' }
        ],
        correct_answer: 'A',
        explanation: 'TLB is an associative cache within the MMU that stores recent page-to-frame translations.'
      },
      {
        question_number: 7,
        unit: 'UNIT IV',
        topic: 'Virtual Memory & Page Replacement',
        difficulty: 'Medium',
        question: 'Belady\'s Anomaly occurs in which page replacement algorithm where increasing frames increases page faults?',
        options: [
          { key: 'A', text: 'First-In, First-Out (FIFO)' },
          { key: 'B', text: 'Least Recently Used (LRU)' },
          { key: 'C', text: 'Optimal (OPT)' },
          { key: 'D', text: 'Least Frequently Used (LFU)' }
        ],
        correct_answer: 'A',
        explanation: 'FIFO replacement is subject to Belady\'s Anomaly because it is not a stack algorithm.'
      },
      {
        question_number: 8,
        unit: 'UNIT IV',
        topic: 'File Systems & Inodes',
        difficulty: 'Medium',
        question: 'In Unix-like file systems, where is file metadata (permissions, owner, size, direct block pointers) stored?',
        options: [
          { key: 'A', text: 'Superblock' },
          { key: 'B', text: 'Directory Entry' },
          { key: 'C', text: 'Inode' },
          { key: 'D', text: 'Master Boot Record' }
        ],
        correct_answer: 'C',
        explanation: 'An inode holds metadata and data block pointers for a file, excluding its file name.'
      },
      {
        question_number: 9,
        unit: 'UNIT V',
        topic: 'Disk Scheduling',
        difficulty: 'Easy',
        question: 'Which disk scheduling algorithm services requests by moving the disk arm in one direction until reaching the end, then reversing?',
        options: [
          { key: 'A', text: 'SCAN (Elevator Algorithm)' },
          { key: 'B', text: 'C-SCAN' },
          { key: 'C', text: 'FCFS' },
          { key: 'D', text: 'SSTF' }
        ],
        correct_answer: 'A',
        explanation: 'The SCAN elevator algorithm moves disk heads from one end of disk to the other servicing cylinders on the path.'
      },
      {
        question_number: 10,
        unit: 'UNIT V',
        topic: 'I/O & Device Management',
        difficulty: 'Medium',
        question: 'Direct Memory Access (DMA) improves CPU efficiency by:',
        options: [
          { key: 'A', text: 'Eliminating all hardware interrupts' },
          { key: 'B', text: 'Transferring blocks of data directly between I/O device and memory without CPU intervention' },
          { key: 'C', text: 'Multiplexing network sockets' },
          { key: 'D', text: 'Overclocking system bus frequencies' }
        ],
        correct_answer: 'B',
        explanation: 'DMA controllers transfer bulk blocks between device buffers and main memory without continuous CPU polling.'
      }
    ],

    'COMPUTER NETWORKS': [
      {
        question_number: 1,
        unit: 'UNIT I',
        topic: 'OSI & TCP/IP Models',
        difficulty: 'Easy',
        question: 'Which layer of the OSI model is responsible for node-to-node frame delivery and MAC addressing?',
        options: [
          { key: 'A', text: 'Physical Layer' },
          { key: 'B', text: 'Data Link Layer' },
          { key: 'C', text: 'Network Layer' },
          { key: 'D', text: 'Transport Layer' }
        ],
        correct_answer: 'B',
        explanation: 'The Data Link Layer formats bits into frames, performs error detection, and handles physical MAC addressing.'
      },
      {
        question_number: 2,
        unit: 'UNIT I',
        topic: 'Transmission Media & Modulation',
        difficulty: 'Medium',
        question: 'According to Nyquist theorem, what is the maximum channel capacity in bits/sec for a noiseless channel with bandwidth B and M signal levels?',
        options: [
          { key: 'A', text: '2B log2(M)' },
          { key: 'B', text: 'B log2(1 + S/N)' },
          { key: 'C', text: 'B / M' },
          { key: 'D', text: '2B / log2(M)' }
        ],
        correct_answer: 'A',
        explanation: 'Nyquist theorem states maximum data rate = 2B * log2(M) for noiseless channels.'
      },
      {
        question_number: 3,
        unit: 'UNIT II',
        topic: 'Error Detection & Flow Control',
        difficulty: 'Medium',
        question: 'Which polynomial division method is widely used in network interfaces for burst error detection in data frames?',
        options: [
          { key: 'A', text: 'Cyclic Redundancy Check (CRC)' },
          { key: 'B', text: 'Checksum' },
          { key: 'C', text: 'Hamming Code' },
          { key: 'D', text: 'Parity Bit' }
        ],
        correct_answer: 'A',
        explanation: 'CRC uses binary polynomial division to calculate frame check sequences that catch burst errors.'
      },
      {
        question_number: 4,
        unit: 'UNIT II',
        topic: 'Medium Access Control (MAC)',
        difficulty: 'Hard',
        question: 'What access method is used by standard 802.3 Ethernet to detect collisions and back off exponentially?',
        options: [
          { key: 'A', text: 'CSMA/CA' },
          { key: 'B', text: 'CSMA/CD' },
          { key: 'C', text: 'Token Ring' },
          { key: 'D', text: 'Slotted ALOHA' }
        ],
        correct_answer: 'B',
        explanation: 'Ethernet uses Carrier Sense Multiple Access with Collision Detection (CSMA/CD) and binary exponential backoff.'
      },
      {
        question_number: 5,
        unit: 'UNIT III',
        topic: 'IP Addressing & Subnetting',
        difficulty: 'Medium',
        question: 'How many usable host IP addresses are available in an IPv4 network with subnet mask /27 (255.255.255.224)?',
        options: [
          { key: 'A', text: '32' },
          { key: 'B', text: '30' },
          { key: 'C', text: '62' },
          { key: 'D', text: '14' }
        ],
        correct_answer: 'B',
        explanation: 'With /27, 5 host bits remain (2^5 = 32). Subtracting network and broadcast addresses leaves 30 usable hosts.'
      },
      {
        question_number: 6,
        unit: 'UNIT III',
        topic: 'Routing Algorithms',
        difficulty: 'Hard',
        question: 'The Link-State routing protocol OSPF uses which algorithm to compute the shortest path tree from source to all destinations?',
        options: [
          { key: 'A', text: 'Bellman-Ford Algorithm' },
          { key: 'B', text: 'Dijkstra\'s Algorithm' },
          { key: 'C', text: 'Floyd-Warshall Algorithm' },
          { key: 'D', text: 'Prim\'s Algorithm' }
        ],
        correct_answer: 'B',
        explanation: 'OSPF uses Dijkstra\'s Shortest Path First (SPF) algorithm to calculate optimal routes across the network topology.'
      },
      {
        question_number: 7,
        unit: 'UNIT IV',
        topic: 'Transport Layer Protocols',
        difficulty: 'Easy',
        question: 'What handshake sequence establishes a reliable connection in Transmission Control Protocol (TCP)?',
        options: [
          { key: 'A', text: 'SYN, SYN-ACK, ACK' },
          { key: 'B', text: 'ACK, SYN, FIN' },
          { key: 'C', text: 'SYN, ACK, RST' },
          { key: 'D', text: 'PING, PONG, ACK' }
        ],
        correct_answer: 'A',
        explanation: 'TCP connection establishment uses a 3-way handshake: client sends SYN, server returns SYN-ACK, client acknowledges with ACK.'
      },
      {
        question_number: 8,
        unit: 'UNIT IV',
        topic: 'Congestion Control',
        difficulty: 'Hard',
        question: 'In TCP congestion control, what occurs when three duplicate ACKs are received in Fast Retransmit?',
        options: [
          { key: 'A', text: 'Slow Start restarts from cwnd = 1 MSS' },
          { key: 'B', text: 'Missing segment is retransmitted immediately without waiting for retransmission timer' },
          { key: 'C', text: 'Connection is terminated with RST packet' },
          { key: 'D', text: 'ssthresh is set to infinity' }
        ],
        correct_answer: 'B',
        explanation: 'Triple duplicate ACKs trigger Fast Retransmit to immediately send the missing packet before timeout.'
      },
      {
        question_number: 9,
        unit: 'UNIT V',
        topic: 'DNS & Application Layer Protocols',
        difficulty: 'Medium',
        question: 'Which DNS record type maps a domain hostname to an IPv4 address?',
        options: [
          { key: 'A', text: 'A Record' },
          { key: 'B', text: 'AAAA Record' },
          { key: 'C', text: 'CNAME Record' },
          { key: 'D', text: 'MX Record' }
        ],
        correct_answer: 'A',
        explanation: 'An A record maps a hostname to a 32-bit IPv4 address, while AAAA maps to IPv6.'
      },
      {
        question_number: 10,
        unit: 'UNIT V',
        topic: 'Network Security & TLS',
        difficulty: 'Medium',
        question: 'Which protocol provides end-to-end encryption and cryptographic authentication above the transport layer for HTTPS traffic?',
        options: [
          { key: 'A', text: 'IPsec' },
          { key: 'B', text: 'Transport Layer Security (TLS)' },
          { key: 'C', text: 'WPA3' },
          { key: 'D', text: 'SSH Tunneling' }
        ],
        correct_answer: 'B',
        explanation: 'TLS encrypts and validates application layer HTTP data traveling over TCP port 443.'
      }
    ]
  };

  // Find matching bank or generate questions dynamically for any custom subject
  let selectedQuestions = subjectQuestionBanks[name];

  if (!selectedQuestions) {
    // Check if name is DATA STRUCTURES
    if (name === 'DATA STRUCTURES' || name.includes('DATA STRUCT')) {
      selectedQuestions = getDataStructuresDefaultQuestions();
    } else {
      // Dynamically generate questions for this custom subject
      selectedQuestions = generateGenericSubjectQuestions(name);
    }
  }

  const finalQuestions = selectedQuestions.map((q, idx) => ({
    ...q,
    question_number: idx + 1
  }));

  return {
    subject_code: code,
    subject_name: name,
    total_questions: totalQuestions || finalQuestions.length,
    questions: finalQuestions
  };
}

function getDataStructuresDefaultQuestions(): NormalizedAssessmentQuestion[] {
  return [
    {
      question_number: 1,
      unit: 'UNIT I',
      topic: 'Doubly-linked lists',
      difficulty: 'Medium',
      question: 'What is a primary structural advantage of a doubly-linked list over a singly linked list?',
      options: [
        { key: 'A', text: 'It requires half the memory space.' },
        { key: 'B', text: 'It allows traversal in both forward and backward directions.' },
        { key: 'C', text: 'It eliminates the need for dynamic memory allocation.' },
        { key: 'D', text: 'Insertion at the tail is always O(1) without keeping a tail pointer.' }
      ],
      correct_answer: 'B',
      explanation: 'Each node in a doubly-linked list contains pointers to both the next and previous nodes, enabling bidirectional traversal.'
    },
    {
      question_number: 2,
      unit: 'UNIT I',
      topic: 'Stack Data Structure',
      difficulty: 'Easy',
      question: 'Which data structure operates on the Last-In, First-Out (LIFO) principle?',
      options: [
        { key: 'A', text: 'Queue' },
        { key: 'B', text: 'Stack' },
        { key: 'C', text: 'Binary Search Tree' },
        { key: 'D', text: 'Hash Table' }
      ],
      correct_answer: 'B',
      explanation: 'A Stack operates on a Last-In, First-Out (LIFO) sequence where elements pushed last are popped first.'
    },
    {
      question_number: 3,
      unit: 'UNIT II',
      topic: 'Queue Operations',
      difficulty: 'Easy',
      question: 'Which operation removes and returns the element from the front of a Queue?',
      options: [
        { key: 'A', text: 'Enqueue' },
        { key: 'B', text: 'Dequeue' },
        { key: 'C', text: 'Push' },
        { key: 'D', text: 'Pop' }
      ],
      correct_answer: 'B',
      explanation: 'The Dequeue operation deletes and returns the item located at the front of a queue.'
    },
    {
      question_number: 4,
      unit: 'UNIT II',
      topic: 'Binary Search Trees',
      difficulty: 'Medium',
      question: 'What is the worst-case time complexity of searching for an element in an unbalanced Binary Search Tree (BST)?',
      options: [
        { key: 'A', text: 'O(1)' },
        { key: 'B', text: 'O(log n)' },
        { key: 'C', text: 'O(n)' },
        { key: 'D', text: 'O(n log n)' }
      ],
      correct_answer: 'C',
      explanation: 'In an unbalanced or skewed BST, tree height degenerates to O(n), making search operations O(n) in the worst case.'
    },
    {
      question_number: 5,
      unit: 'UNIT III',
      topic: 'AVL Trees & Balance Factor',
      difficulty: 'Hard',
      question: 'What are the allowed balance factors for any node in a valid AVL Tree?',
      options: [
        { key: 'A', text: '-1, 0, or +1' },
        { key: 'B', text: '-2, 0, or +2' },
        { key: 'C', text: '0 or +1 only' },
        { key: 'D', text: 'Any integer value' }
      ],
      correct_answer: 'A',
      explanation: 'AVL trees strictly maintain self-balancing where height difference between left and right subtrees (balance factor) is -1, 0, or +1.'
    },
    {
      question_number: 6,
      unit: 'UNIT III',
      topic: 'Graph Traversal',
      difficulty: 'Medium',
      question: 'Which graph traversal algorithm utilizes a Queue data structure to visit vertices level by level?',
      options: [
        { key: 'A', text: 'Depth-First Search (DFS)' },
        { key: 'B', text: 'Breadth-First Search (BFS)' },
        { key: 'C', text: 'Pre-order Traversal' },
        { key: 'D', text: 'Post-order Traversal' }
      ],
      correct_answer: 'B',
      explanation: 'Breadth-First Search (BFS) uses a Queue to explore neighbor vertices level by level.'
    },
    {
      question_number: 7,
      unit: 'UNIT IV',
      topic: 'Sorting Algorithms',
      difficulty: 'Medium',
      question: 'Which sorting algorithm guarantees O(n log n) time complexity across all cases while remaining stable?',
      options: [
        { key: 'A', text: 'Quick Sort' },
        { key: 'B', text: 'Merge Sort' },
        { key: 'C', text: 'Selection Sort' },
        { key: 'D', text: 'Heap Sort' }
      ],
      correct_answer: 'B',
      explanation: 'Merge Sort provides guaranteed O(n log n) performance across best, average, and worst cases while preserving relative order of equal keys.'
    },
    {
      question_number: 8,
      unit: 'UNIT IV',
      topic: 'Hash Tables & Collisions',
      difficulty: 'Medium',
      question: 'What collision resolution technique stores colliding elements in a linked list at the corresponding table index?',
      options: [
        { key: 'A', text: 'Linear Probing' },
        { key: 'B', text: 'Quadratic Probing' },
        { key: 'C', text: 'Separate Chaining' },
        { key: 'D', text: 'Double Hashing' }
      ],
      correct_answer: 'C',
      explanation: 'Separate Chaining uses linked lists attached to array indices to hold colliding key-value pairs.'
    },
    {
      question_number: 9,
      unit: 'UNIT V',
      topic: 'Heap Representation',
      difficulty: 'Medium',
      question: 'In a binary heap stored as an array with 1-based indexing, what is the parent node index for an element at index i?',
      options: [
        { key: 'A', text: 'Math.floor(i / 2)' },
        { key: 'B', text: '2 * i' },
        { key: 'C', text: '2 * i + 1' },
        { key: 'D', text: 'i - 1' }
      ],
      correct_answer: 'A',
      explanation: 'Using 1-based indexing in a binary heap array, parent of node i is located at floor(i / 2).'
    },
    {
      question_number: 10,
      unit: 'UNIT V',
      topic: 'Shortest Path Algorithms',
      difficulty: 'Hard',
      question: 'Dijkstra\'s algorithm for single-source shortest paths fails under which graph condition?',
      options: [
        { key: 'A', text: 'Graphs with directed edges' },
        { key: 'B', text: 'Graphs containing negative edge weights' },
        { key: 'C', text: 'Graphs with multiple connected components' },
        { key: 'D', text: 'Unweighted cyclic graphs' }
      ],
      correct_answer: 'B',
      explanation: 'Dijkstra\'s algorithm assumes non-negative edge weights; negative weights can lead to incorrect shortest path calculations due to greedy choices.'
    }
  ];
}

function generateGenericSubjectQuestions(subjectName: string): NormalizedAssessmentQuestion[] {
  const topics = [
    { unit: 'UNIT I', topic: `${subjectName} Fundamentals`, q: `What is the core fundamental principle governing ${subjectName}?`, a: 'Standardized hierarchical architecture and modular design', exp: `Modular design and standardized architecture form the primary design foundation in ${subjectName}.` },
    { unit: 'UNIT I', topic: 'Core Definitions & Models', q: `Which specification establishes baseline compliance in ${subjectName}?`, a: 'Formal axiomatic model with verified constraints', exp: `Formal verification and model checking validate consistency across system states.` },
    { unit: 'UNIT II', topic: 'Execution & Control Flow', q: `How are concurrent operational states managed effectively in ${subjectName}?`, a: 'Through atomic transactional boundaries and synchronization primitives', exp: `Atomic boundaries prevent race conditions and data corruption across concurrent tasks.` },
    { unit: 'UNIT II', topic: 'Algorithmic Efficiency', q: `What is the primary optimization objective when analyzing performance in ${subjectName}?`, a: 'Minimizing asymptotic time complexity and latency', exp: `Asymptotic complexity optimization ensures scalable execution under heavy workloads.` },
    { unit: 'UNIT III', topic: 'System Architecture & Design', q: `Which design pattern provides decoupled layer interactions in ${subjectName}?`, a: 'Layered abstraction with well-defined interface contracts', exp: `Interface contracts shield internal implementation details between collaborating layers.` },
    { unit: 'UNIT III', topic: 'Resource Allocation', q: `What mechanism prevents starvation during resource arbitration in ${subjectName}?`, a: 'Fair queuing with aging priority promotion', exp: `Aging ensures waiting tasks gradually gain priority to avoid indefinite postponement.` },
    { unit: 'UNIT IV', topic: 'Data Validation & Integrity', q: `How is consistency maintained across distributed components in ${subjectName}?`, a: 'Consensus protocols and cryptographic verification', exp: `Consensus ensures uniform state synchronization across distributed instances.` },
    { unit: 'UNIT IV', topic: 'Fault Tolerance & Resilience', q: `Which strategy enables self-healing recovery in ${subjectName}?`, a: 'Redundant standby replication with automatic failover', exp: `Standby replication enables near-zero downtime transitions when faults occur.` },
    { unit: 'UNIT V', topic: 'Security & Access Control', q: `What security principle enforces least-privilege enforcement in ${subjectName}?`, a: 'Role-based access control with granular permission scoping', exp: `Role-based scoping guarantees entities only possess permissions required for their tasks.` },
    { unit: 'UNIT V', topic: 'Advanced Applications & Scalability', q: `What strategy supports horizontal scalability under non-linear load growth in ${subjectName}?`, a: 'Stateless service decomposition and dynamic load balancing', exp: `Stateless components permit dynamic horizontal auto-scaling without shared-state bottlenecks.` }
  ];

  return topics.map((t, idx) => ({
    question_number: idx + 1,
    unit: t.unit,
    topic: t.topic,
    difficulty: idx < 3 ? 'Easy' : idx < 7 ? 'Medium' : 'Hard',
    question: t.q,
    options: [
      { key: 'A', text: t.a },
      { key: 'B', text: 'Unconstrained heuristic execution without boundary monitoring' },
      { key: 'C', text: 'Monolithic static allocation without interface isolation' },
      { key: 'D', text: 'Arbitrary parameter configuration ignoring system guarantees' }
    ],
    correct_answer: 'A',
    explanation: t.exp
  }));
}


export function findQuestionsContainer(raw: any): any {
  if (!raw) return null;

  let data = raw;
  if (typeof data === 'string') {
    try {
      const cleaned = data.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      data = JSON.parse(cleaned);
    } catch {
      return null;
    }
  }

  const queue: any[] = [data];
  const visited = new Set<any>();

  while (queue.length > 0) {
    let current = queue.shift();
    if (!current || visited.has(current)) continue;
    if (typeof current === 'object') visited.add(current);

    if (typeof current === 'string') {
      try {
        const cleaned = current.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        current = JSON.parse(cleaned);
      } catch {
        continue;
      }
    }

    if (Array.isArray(current)) {
      for (const item of current) {
        queue.push(item);
      }
      continue;
    }

    if (current && typeof current === 'object') {
      if (Array.isArray(current.questions) && current.questions.length > 0) {
        return current;
      }

      const keysToTry = [
        'output',
        'data',
        'result',
        'response',
        'responseData',
        '_responseData',
        '_RESPONSEDATA',
        'payload',
        'body',
        'items',
        'json',
        'text'
      ];

      for (const k of keysToTry) {
        if (current[k] !== undefined && current[k] !== null) {
          queue.push(current[k]);
        }
      }

      for (const k of Object.keys(current)) {
        if (!keysToTry.includes(k) && current[k] && (typeof current[k] === 'object' || typeof current[k] === 'string')) {
          queue.push(current[k]);
        }
      }
    }
  }

  return null;
}

export function extractOptions(q: any): NormalizedAssessmentOption[] {
  const optionsList: NormalizedAssessmentOption[] = [];
  const keys = ['A', 'B', 'C', 'D', 'E', 'F'];

  const addOpt = (key: string, text: any) => {
    if (text !== undefined && text !== null && String(text).trim().length > 0) {
      optionsList.push({
        key: String(key).trim().toUpperCase(),
        text: String(text).trim()
      });
    }
  };

  const optsContainer = q?.options || q?.choices || q?.answers || q?.optionList || q?.questionOptions;

  if (Array.isArray(optsContainer) && optsContainer.length > 0) {
    optsContainer.forEach((item: any, idx: number) => {
      if (typeof item === 'string' || typeof item === 'number') {
        addOpt(keys[idx] || String(idx + 1), item);
      } else if (item && typeof item === 'object') {
        const textVal = item.text || item.option || item.value || item.content || item.label || item.description || item.answer || item.choice;
        const keyVal = item.key || item.id || item.letter || item.label || keys[idx] || String(idx + 1);
        if (textVal) {
          addOpt(keyVal, textVal);
        } else {
          const entries = Object.entries(item);
          if (entries.length > 0) {
            addOpt(entries[0][0], entries[0][1]);
          }
        }
      }
    });
  } else if (optsContainer && typeof optsContainer === 'object') {
    Object.entries(optsContainer).forEach(([k, v]) => {
      let normKey = String(k).trim().toUpperCase();
      if (normKey === '1' || normKey === 'OPTION1' || normKey === 'OPTION_1') normKey = 'A';
      if (normKey === '2' || normKey === 'OPTION2' || normKey === 'OPTION_2') normKey = 'B';
      if (normKey === '3' || normKey === 'OPTION3' || normKey === 'OPTION_3') normKey = 'C';
      if (normKey === '4' || normKey === 'OPTION4' || normKey === 'OPTION_4') normKey = 'D';

      addOpt(normKey, v);
    });
  }

  if (optionsList.length === 0 && q && typeof q === 'object') {
    if (q.A || q.a) addOpt('A', q.A || q.a);
    if (q.B || q.b) addOpt('B', q.B || q.b);
    if (q.C || q.c) addOpt('C', q.C || q.c);
    if (q.D || q.d) addOpt('D', q.D || q.d);

    if (q.optionA || q.option_a) addOpt('A', q.optionA || q.option_a);
    if (q.optionB || q.option_b) addOpt('B', q.optionB || q.option_b);
    if (q.optionC || q.option_c) addOpt('C', q.optionC || q.option_c);
    if (q.optionD || q.option_d) addOpt('D', q.optionD || q.option_d);

    if (q.option1 || q.option_1) addOpt('A', q.option1 || q.option_1);
    if (q.option2 || q.option_2) addOpt('B', q.option2 || q.option_2);
    if (q.option3 || q.option_3) addOpt('C', q.option3 || q.option_3);
    if (q.option4 || q.option_4) addOpt('D', q.option4 || q.option_4);

    if (q.choice1 || q.choiceA) addOpt('A', q.choice1 || q.choiceA);
    if (q.choice2 || q.choiceB) addOpt('B', q.choice2 || q.choiceB);
    if (q.choice3 || q.choiceC) addOpt('C', q.choice3 || q.choiceC);
    if (q.choice4 || q.choiceD) addOpt('D', q.choice4 || q.choiceD);
  }

  optionsList.forEach(opt => {
    if (opt.key === '1') opt.key = 'A';
    if (opt.key === '2') opt.key = 'B';
    if (opt.key === '3') opt.key = 'C';
    if (opt.key === '4') opt.key = 'D';
  });

  optionsList.sort((a, b) => a.key.localeCompare(b.key));
  return optionsList;
}

export function parseAssessmentPayload(
  rawData: any,
  fallbackSubjectCode?: string,
  fallbackSubjectName?: string,
  fallbackTotalQuestions?: number
): AssessmentSuiteData | null {
  if (!rawData) return null;

  const foundContainer = findQuestionsContainer(rawData);
  if (!foundContainer || !Array.isArray(foundContainer.questions) || foundContainer.questions.length === 0) {
    return null;
  }

  const questionsArray: any[] = foundContainer.questions;

  const subject_code = String(
    foundContainer?.subject_code ||
    foundContainer?.subjectCode ||
    fallbackSubjectCode ||
    '23ITT201'
  );
  const subject_name = String(
    foundContainer?.subject_name ||
    foundContainer?.subjectName ||
    fallbackSubjectName ||
    'DATA STRUCTURES'
  );
  const total_questions = Number(
    foundContainer?.total_questions ||
    foundContainer?.totalQuestions ||
    fallbackTotalQuestions ||
    questionsArray.length
  );

  const normalizedQuestions: NormalizedAssessmentQuestion[] = questionsArray.map((q: any, idx: number) => {
    const qNum = Number(q.question_number || q.number || (idx + 1));
    const unit = String(q.unit || `UNIT ${Math.ceil(qNum / 2)}`);
    const topic = String(q.topic || q.concept || subject_name);
    const difficulty = String(q.difficulty || 'Medium');
    const questionText = String(q.question || q.questionText || q.prompt || `Question ${qNum}`);

    const optionsList = extractOptions(q);

    let correctAnswerKey = String(q.correct_answer || q.correctAnswer || q.answer || 'A').trim();

    const matchedByKey = optionsList.find(o => o.key.toUpperCase() === correctAnswerKey.toUpperCase());
    if (matchedByKey) {
      correctAnswerKey = matchedByKey.key;
    } else {
      const matchedByText = optionsList.find(o => o.text.toLowerCase() === correctAnswerKey.toLowerCase());
      if (matchedByText) {
        correctAnswerKey = matchedByText.key;
      }
    }

    const explanation = String(q.explanation || q.solution || `The correct answer is Option ${correctAnswerKey}.`);

    return {
      question_number: qNum,
      unit,
      topic,
      difficulty,
      question: questionText,
      options: optionsList,
      correct_answer: correctAnswerKey,
      explanation
    };
  });

  return {
    subject_code,
    subject_name,
    total_questions: total_questions || normalizedQuestions.length,
    questions: normalizedQuestions
  };
}

export function parseAssessmentEvaluationResponse(raw: any, totalQuestions: number = 10): AssessmentEvaluationResult {
  if (!raw || typeof raw !== 'object') {
    return {
      score: 0,
      total_marks: 100,
      obtained_marks: 0,
      correct_answers: 0,
      incorrect_answers: totalQuestions,
      weak_topics: [],
      strong_topics: [],
      misconceptions: [],
      knowledge_gaps: [],
      level: 'Beginner',
      raw
    };
  }

  const source = raw.data || raw.result || raw.output || raw.evaluation || raw;

  const total_marks = Number(source.total_marks ?? source.totalMarks ?? 100);
  const obtained_marks = Number(source.obtained_marks ?? source.obtainedMarks ?? source.score ?? 0);
  const score = Number(source.score ?? source.scorePercentage ?? (total_marks > 0 ? Math.round((obtained_marks / total_marks) * 100) : 0));
  const correct_answers = Number(source.correct_answers ?? source.correctCount ?? Math.round((score / 100) * totalQuestions));
  const incorrect_answers = Number(source.incorrect_answers ?? source.incorrectCount ?? Math.max(0, totalQuestions - correct_answers));

  const weak_topics = Array.isArray(source.weak_topics)
    ? source.weak_topics
    : Array.isArray(source.weaknesses)
    ? source.weaknesses
    : [];

  const strong_topics = Array.isArray(source.strong_topics)
    ? source.strong_topics
    : Array.isArray(source.strengths)
    ? source.strengths
    : [];

  const misconceptions = Array.isArray(source.misconceptions) ? source.misconceptions : [];
  const knowledge_gaps = Array.isArray(source.knowledge_gaps)
    ? source.knowledge_gaps
    : Array.isArray(source.recommendations)
    ? source.recommendations
    : [];

  const level = String(source.level || source.suggestedDifficulty || 'Intermediate');

  return {
    score,
    total_marks,
    obtained_marks,
    correct_answers,
    incorrect_answers,
    weak_topics,
    strong_topics,
    misconceptions,
    knowledge_gaps,
    level,
    raw: source
  };
}

function buildLocalEvaluation(attempts: PracticeAttempt[]): AdaptiveLearningResult {
  const topicStats: Record<string, { correct: number; total: number }> = {};
  
  attempts.forEach(a => {
    if (!topicStats[a.topic]) {
      topicStats[a.topic] = { correct: 0, total: 0 };
    }
    topicStats[a.topic].total += 1;
    if (a.isCorrect) topicStats[a.topic].correct += 1;
  });

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  Object.entries(topicStats).forEach(([topic, stat]) => {
    const accuracy = stat.correct / stat.total;
    if (accuracy >= 0.7) {
      strengths.push(topic);
    } else {
      weaknesses.push(topic);
    }
  });

  const accuracyOverall = attempts.filter(a => a.isCorrect).length / attempts.length;
  let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
  if (accuracyOverall >= 0.8) difficulty = 'Hard';
  else if (accuracyOverall < 0.5) difficulty = 'Easy';

  return {
    evaluationSummary: `Evaluated ${attempts.length} practice interactions with ${Math.round(accuracyOverall * 100)}% overall accuracy.`,
    strengths: strengths.length > 0 ? strengths : ['Active problem solving'],
    weaknesses: weaknesses.length > 0 ? weaknesses : [],
    recommendedFocus: weaknesses.length > 0 ? weaknesses : (strengths.length > 0 ? strengths : ['Core Technical Fundamentals']),
    suggestedDifficulty: difficulty
  };
}
