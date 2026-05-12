import Anthropic from '@anthropic-ai/sdk'

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
  const topicNote = topic ? `The specific topic should be: ${topic}` : 'Choose an interesting, specific topic appropriate for TOEFL.'
  const diffNote = { easy: 'Use straightforward vocabulary and a clear, linear structure.', medium: 'Use moderately complex vocabulary with some academic terms defined in context.', hard: 'Use sophisticated academic vocabulary and complex organizational structure.' }[difficulty] || ''

  const lecturePrompt = `Create a TOEFL Academic Listening LECTURE in the field of ${field}.
${topicNote}
The lecture should be ~420-500 words, delivered by a professor, ${difficulty} difficulty.
${diffNote}
It may include 1-2 brief student questions/comments (marked with "Student:").
The professor's delivery should feel natural and spoken, with occasional restarts, hedges (e.g., "well", "so", "you know"), and signposting.`

  const convPrompt = `Create a TOEFL Academic Listening CONVERSATION set in ${setting}.
${topicNote}
The conversation should be ~200-250 words, between a Student and a staff member/professor, ${difficulty} difficulty.
Use natural conversational language with back-and-forth exchanges.
The student has a specific problem or question to resolve.`

  const qTypes = isLecture
    ? ['gist_content', 'detail', 'detail', 'organization', 'attitude', 'inference']
    : ['gist_purpose', 'detail', 'detail', 'attitude', 'inference']
  const selectedQTypes = qTypes.slice(0, num_questions)

  const qTypeDefs = `
- gist_content: "What is mainly discussed?" — tests the main topic
- gist_purpose: "Why does the student visit?" — tests the main reason
- detail: Tests a specific fact from the passage (4 options, 1 correct)
- function: "What does the professor mean when he says: [quote]?" — tests implied meaning
- attitude: "What is the professor's attitude toward X?" — tests opinion/feeling
- organization: "Why does the professor mention X?" — tests rhetorical purpose
- connecting_content: Matching/table question (mark allows_multiple: true, correct_answer as "A,C" etc.)
- inference: "What can be inferred about X?" — tests logical conclusion`

  return `You are a professional TOEFL test designer. ${isLecture ? lecturePrompt : convPrompt}

Create exactly ${num_questions} questions covering these types in order: ${selectedQTypes.join(', ')}.
${extra_instructions ? `\nExtra instructions: ${extra_instructions}` : ''}

Question type definitions:${qTypeDefs}

CRITICAL: Return ONLY valid JSON, no markdown, no explanation. Use this exact structure:
{
  "title": "Concise descriptive title (e.g., 'Professor discusses bioluminescence in deep-sea creatures')",
  "subject": "Brief subject/topic label",
  "speaker_notes": "One sentence about delivery style for TTS (e.g., 'Professor speaks with enthusiasm, pauses after introducing key terms')",
  "lecture_style": "monologue or interactive",
  "transcript": "Full transcript with speaker labels (Professor: / Student:) and natural paragraph breaks using \\n\\n",
  "questions": [
    {
      "question_type": "one of the 8 types above",
      "question_text": "Full question text as it appears on TOEFL",
      "options": [
        {"id": "A", "text": "Option A text"},
        {"id": "B", "text": "Option B text"},
        {"id": "C", "text": "Option C text"},
        {"id": "D", "text": "Option D text"}
      ],
      "correct_answer": "A",
      "allows_multiple": false,
      "explanation": "Brief explanation of why this is correct and others are wrong"
    }
  ]
}

Ensure all 4 options are plausible but only the correct one is clearly supported by the transcript. Distractors should be tempting but incorrect.`
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured in Netlify environment variables.' }),
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

  const prompt = buildPrompt({ material_type, academic_field, conversation_setting, topic, difficulty, num_questions, extra_instructions })

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = message.content[0]?.text || ''
    // Strip any markdown code fences if present
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
    const parsed = JSON.parse(jsonText)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    }
  } catch (err) {
    console.error('Generation error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'AI generation failed' }),
    }
  }
}
