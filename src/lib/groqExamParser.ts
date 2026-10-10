/**
 * Groq AI & PDF Parser Service for Exam Questions
 * Uses Mozilla PDF.js for client-side text extraction
 * Uses Groq (llama-3.3-70b-versatile) for high-speed structured extraction
 */

export interface MCQOption {
  id: string;
  text: string;
}

export interface ParsedQuestion {
  id: string;
  number: number;
  type: 'mcq' | 'descriptive';
  question: string;
  marks: number;
  options?: MCQOption[];
  correctAnswer?: string;
  explanation?: string;
}

export interface GroqParseResult {
  examTitle?: string;
  totalMarks?: number;
  questions: ParsedQuestion[];
}

const STORAGE_KEY = 'GROQ_API_KEY';

/**
 * Retrieve saved Groq API key from localStorage or Vite environment variable
 */
export const getStoredGroqApiKey = (): string => {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local && local.trim().length > 0) return local.trim();
  }
  return ((import.meta as any).env?.VITE_GROQ_API_KEY as string) || '';
};

/**
 * Persist Groq API key to localStorage
 */
export const setStoredGroqApiKey = (key: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, key.trim());
  }
};

/**
 * Dynamically loads Mozilla's PDF.js library via CDN in the browser if not already available
 */
const loadPdfJs = async (): Promise<any> => {
  if (typeof window === 'undefined') {
    throw new Error('PDF parsing is only supported in browser environments.');
  }

  const win = window as any;
  if (win.pdfjsLib) {
    return win.pdfjsLib;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      if (win.pdfjsLib) {
        win.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(win.pdfjsLib);
      } else {
        reject(new Error('Failed to initialize PDF.js.'));
      }
    };
    script.onerror = () => {
      reject(new Error('Failed to load PDF.js from CDN. Please check your internet connection or paste text directly.'));
    };
    document.head.appendChild(script);
  });
};

/**
 * Extracts plain text from an uploaded PDF file in the browser
 */
export const extractTextFromPdfFile = async (
  file: File,
  onProgress?: (progress: { current: number; total: number }) => void
): Promise<{ text: string; pageCount: number }> => {
  // If user uploaded a plain text or markdown file
  if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
    const text = await file.text();
    return { text, pageCount: 1 };
  }

  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const totalPages = pdf.numPages;
  let fullText = '';

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    let pageText = '';
    for (let i = 0; i < textContent.items.length; i++) {
      const item = textContent.items[i] as any;
      const str = 'str' in item ? String(item.str) : '';
      if (!str) continue;

      const isSuperscript = /^[²³¹⁰-⁹²³⁴⁵⁶⁷⁸⁹]/.test(str);
      const isPunctuation = /^[,.:;!?)}]]/.test(str);

      if (
        pageText.length === 0 ||
        pageText.endsWith(' ') ||
        pageText.endsWith('(') ||
        pageText.endsWith('[') ||
        pageText.endsWith('{') ||
        isSuperscript ||
        isPunctuation
      ) {
        pageText += str;
      } else {
        pageText += ' ' + str;
      }
    }
    fullText += `\n--- Page ${pageNum} ---\n` + pageText;

    if (onProgress) {
      onProgress({ current: pageNum, total: totalPages });
    }
  }

  return { text: fullText.trim(), pageCount: totalPages };
};

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

/**
 * Calls Groq's high-speed API to parse text into structured exam questions
 */
export const parseQuestionsWithGroq = async (
  sourceText: string,
  apiKey: string
): Promise<GroqParseResult> => {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error('Groq API Key is missing. Please enter your API key to continue.');
  }

  if (!sourceText || sourceText.trim().length < 10) {
    throw new Error('The provided text is too short or empty to extract questions.');
  }

  const systemPrompt = `You are an expert examination paper parser. 
Your task is to analyze the user-provided exam text, ChatGPT output, or PDF text extract, and convert all questions into a strictly structured JSON object.

Extract both:
1. Multiple Choice Questions (type: "mcq")
2. Descriptive / Subjective Questions (type: "descriptive")

Rules for MCQs:
- Extract the clean question text (strip question numbering like "1.", "Q1:", etc.).
- Extract all choices as an array of strings in "options". Strip leading labels like "A)", "B.", "(c)" from each option text.
- Detect which option is the correct answer. Set "correctAnswer" to the letter corresponding to the correct option index: "A" for the 1st option, "B" for the 2nd, "C" for the 3rd, etc. If the source does not indicate the correct answer, choose "A" by default.
- If marks are explicitly specified (e.g. "[2 Marks]", "(1 pt)"), extract it as an integer in "marks". Default to 2 if not stated.

Rules for Descriptive Questions:
- Extract the clean question prompt.
- If marks are explicitly stated, set "marks" to that integer. If not stated, set "marks" to 5.

Mathematical Precision & Exponent Integrity:
- CRITICAL: You must preserve all mathematical notation, formulas, variables, exponents, and roots with 100% fidelity.
- Never drop, omit, or flatten superscripts or exponents: preserve squares (² or ^2), cubes (³ or ^3), higher powers (⁴, ⁵, ^n), and roots (√, ∛).
- Never transform x² into x or x2; keep x² or x^2. Never transform 14³ into 14; keep 14³.
- Preserve all terms, coefficients, signs (+, -, ·, /), and nested brackets: (), [], {}.

General:
- If a title for the exam is apparent, put it in "examTitle", otherwise leave empty string.
- Return ONLY valid JSON adhering to the specified schema.

JSON Response Schema:
{
  "examTitle": "Optional title or empty string",
  "questions": [
    {
      "type": "mcq",
      "question": "Question statement here",
      "options": ["First choice", "Second choice", "Third choice", "Fourth choice"],
      "correctAnswer": "A",
      "marks": 2
    },
    {
      "type": "descriptive",
      "question": "Describe the main factors of production...",
      "marks": 5
    }
  ]
}`;

  const candidateModels = [
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'qwen/qwen3.8-27b',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant'
  ];

  let data: any = null;
  let lastErrorMsg = '';

  for (const model of candidateModels) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Here is the exam text / ChatGPT questions to extract:\n\n${sourceText.slice(0, 50000)}`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      });

      if (response.status === 404) {
        continue; // Model not on account, try next candidate
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData?.error?.message || `Groq API responded with status ${response.status} (${response.statusText})`;
        if (response.status === 401) {
          throw new Error('Invalid Groq API Key. Please verify your API key and try again.');
        }
        if (response.status === 429) {
          throw new Error('Groq rate limit reached. Please wait a moment or check your Groq quota.');
        }
        lastErrorMsg = errorMessage;
        continue;
      }

      data = await response.json();
      break;
    } catch (e: any) {
      if (e.message && (e.message.includes('Invalid Groq API Key') || e.message.includes('rate limit'))) {
        throw e;
      }
      lastErrorMsg = e.message;
    }
  }

  if (!data) {
    throw new Error(lastErrorMsg || 'Failed to complete question extraction with Groq.');
  }
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Received an empty response from Groq.');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Failed to parse Groq response as valid JSON.');
  }

  const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
  if (rawQuestions.length === 0) {
    throw new Error('No questions could be identified in the provided text. Please check the text format.');
  }

  const formattedQuestions: ParsedQuestion[] = rawQuestions.map((q: any, index: number) => {
    const id = `q_${Date.now()}_${index + 1}`;
    const number = index + 1;
    const type: 'mcq' | 'descriptive' = q.type === 'descriptive' ? 'descriptive' : 'mcq';
    const marks = typeof q.marks === 'number' && q.marks > 0 ? q.marks : type === 'mcq' ? 2 : 5;

    if (type === 'mcq') {
      const optionsArray: string[] = Array.isArray(q.options)
        ? q.options.map((opt: any) => String(opt).trim())
        : ['Option 1', 'Option 2', 'Option 3', 'Option 4'];

      const optionsList: MCQOption[] = optionsArray.map((optText, optIdx) => ({
        id: OPTION_KEYS[optIdx] || `Opt${optIdx + 1}`,
        text: optText,
      }));

      // Normalize correctAnswer
      let correctKey = 'A';
      if (typeof q.correctAnswer === 'string') {
        const rawKey = q.correctAnswer.trim().toUpperCase();
        if (optionsList.some((o) => o.id === rawKey)) {
          correctKey = rawKey;
        } else {
          // If the model returned the text of the option instead of the key
          const matchingIdx = optionsArray.findIndex(
            (o) => o.toLowerCase() === q.correctAnswer.toLowerCase()
          );
          if (matchingIdx >= 0 && OPTION_KEYS[matchingIdx]) {
            correctKey = OPTION_KEYS[matchingIdx];
          }
        }
      }

      return {
        id,
        number,
        type: 'mcq',
        question: String(q.question || `Question ${index + 1}`).trim(),
        options: optionsList,
        correctAnswer: correctKey,
        marks,
      };
    } else {
      return {
        id,
        number,
        type: 'descriptive',
        question: String(q.question || `Question ${index + 1}`).trim(),
        marks,
      };
    }
  });

  const totalCalculatedMarks = formattedQuestions.reduce((acc, curr) => acc + (curr.marks || 0), 0);

  return {
    examTitle: typeof parsed.examTitle === 'string' ? parsed.examTitle.trim() : undefined,
    totalMarks: totalCalculatedMarks,
    questions: formattedQuestions,
  };
};
