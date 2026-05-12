
const FIELD_LABELS = {
  arts_humanities: 'Arts & Humanities',
  life_sciences: 'Life Sciences',
  physical_sciences: 'Physical Sciences',
  social_sciences: 'Social Sciences',
}

const SETTING_LABELS = {
  office_hours: 'office hours (student visits professor)',
  student_services: 'student services office (student needs administrative help)',
  library: 'campus library (student asks librarian for research help)',
  advising: 'academic advising center (student discusses course planning)',
  housing: 'housing office (student discusses accommodation)',
  other: 'campus setting',
}

function buildPrompt({ material_type, academic_field, conversation_setting, topic, difficulty, num_questions, extra_instructions }) {
  const isLecture = material_type === 'lecture'
  const field = FIELD_LABELS[academic_field] || 'General Academic'
  const setting = SETTING_LABELS[conversation_setting] || 'campus setting'
  const topicNote = topic
    ? `The specific topic should be: ${topic}`
    : 'Choose an interesting, specific TOEFL-appropriate topic.'
  const diffNote = {
    easy: 'Use straightforward vocabulary and a clear, linear structure.',
    medium: 'Use moderately complex vocabulary with some academic terms defined in context.',
    hard: 'Use sophisticated academic vocabulary and a complex organizational structure with multiple sub-points.',
  }[difficulty] || ''

  const passageInstructions = isLecture
    ? `Create a TOEFL Academic Listening LECTURE in the field of ${field}.
${topicNote}
Length: ~420–500 words. Delivered by a professor. Difficulty: ${difficulty}. ${diffNote}
May include 1–2 brief student questions/comments (marked "Student:").
The professor's speech must feel natural and spoken — include occasional hedges ("well", "so", "now"), signposting phrases ("Let me turn to...", "The key point here is..."), and slight restarts. Use paragraph breaks to separate ideas.`
    : `Create a TOEFL Academic Listening CONVERSATION set in ${setting}.
${topicNote}
Length: ~200–250 words. Two speakers: Student and a staff member or professor. Difficulty: ${difficulty}. ${diffNote}
The student has a specific problem or request. The dialogue should feel natural with back-and-forth exchanges. Use paragraph breaks between speaker turns.`

  // Choose question types proportional to what TOEFL uses
  const lectureTypes  = ['gist_content', 'detail', 'detail', 'organization', 'attitude', 'inference']
  const convTypes     = ['gist_purpose', 'detail', 'detail', 'attitude', 'inference']
  const baseTypes     = isLecture ? lectureTypes : convTypes
  const selectedTypes = baseTypes.slice(0, num_questions)

  const qTypeDefs = `
- gist_content      → "What is the lecture mainly about?" (main topic)
- gist_purpose      → "Why does the student visit / why does the professor discuss X?" (main reason)
- detail            → Tests a specific fact stated in the passage; 4 options, 1 correct
- function          → "What does the professor mean when he says: [direct quote]?" (implied meaning)
- attitude          → "What is the professor's attitude toward X?" (opinion/feeling)
- organization      → "Why does the professor mention X?" (rhetorical purpose / structure)
- connecting_content→ Matching or table question; set allows_multiple:true and correct_answer to e.g. "A,C"
- inference         → "What can be inferred about X?" (logical conclusion not stated directly)`

  return `You are a professional TOEFL iBT test designer with 10 years of experience.

${passageInstructions}

Generate exactly ${num_questions} questions covering these types in order: ${selectedTypes.join(', ')}.
${extra_instructions ? `\nExtra instructions from the teacher: ${extra_instructions}` : ''}

Question type reference:${qTypeDefs}

RULES:
1. All 4 options must be plausible. Wrong options should be tempting — either partially true, too broad/narrow, or based on a misheard detail.
2. The correct answer must be clearly supported by a specific part of the transcript.
3. For "function" questions, include an exact short quote from the transcript in the question text.
4. Transcript must use natural spoken language, NOT written/formal prose.

Return ONLY a valid JSON object with this exact structure (no markdown, no code fences):
{
  "title": "Descriptive title, e.g. 'Professor discusses bioluminescence in deep-sea creatures'",
  "subject": "Short topic label, e.g. 'Bioluminescence'",
  "speaker_notes": "One sentence on delivery style for TTS, e.g. 'Professor is enthusiastic; pause after key terms'",
  "lecture_style": "monologue | interactive",
  "transcript": "Full transcript with speaker labels (Professor: / Student:) and natural paragraph breaks using \\n\\n",
  "questions": [
    {
      "question_type": "<one of the 8 types>",
      "question_text": "Full question text exactly as it would appear on the TOEFL",
      "options": [
        {"id": "A", "text": "..."},
        {"id": "B", "text": "..."},
        {"id": "C", "text": "..."},
        {"id": "D", "text": "..."}
      ],
      "correct_answer": "A",
      "allows_multiple": false,
      "explanation": "One sentence: why this is correct and why each distractor is wrong"
    }
  ]
}`
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'GEMINI_API_KEY is not set in Netlify environment variables.' }),
    }
  }

  let params
  try {
    params = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) }
  }

  const {
    material_type = 'lecture',
    academic_field = 'life_sciences',
    conversation_setting = 'office_hours',
    topic = '',
    difficulty = 'medium',
    num_questions = 6,
    extra_instructions = '',
  } = params

  const prompt = buildPrompt({
    material_type, academic_field, conversation_setting,
    topic, difficulty, num_questions, extra_instructions,
  })

  try {
    const GEMINI_MODEL = 'gemini-1.5-flash'
    const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.9,
          maxOutputTokens: 4096,
        },
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData?.error?.message || `Gemini API error ${res.status}`)
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Empty response from Gemini')

    const parsed = JSON.parse(text)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    }
  } catch (err) {
    console.error('Gemini generation error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'AI generation failed' }),
    }
  }
}
