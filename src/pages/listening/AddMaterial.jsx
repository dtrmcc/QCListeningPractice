import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const EMPTY_QUESTION = {
  question_type: 'detail',
  question_text: '',
  options: [
    { id: 'A', text: '' },
    { id: 'B', text: '' },
    { id: 'C', text: '' },
    { id: 'D', text: '' },
  ],
  correct_answer: 'A',
  allows_multiple: false,
  explanation: '',
}

const Q_TYPES = [
  { value: 'gist_content', label: 'Gist-Content (main topic)' },
  { value: 'gist_purpose', label: 'Gist-Purpose (why visit/discuss)' },
  { value: 'detail', label: 'Detail (specific fact)' },
  { value: 'function', label: 'Function (what does speaker mean)' },
  { value: 'attitude', label: 'Attitude (speaker\'s feelings)' },
  { value: 'organization', label: 'Organization (how structured)' },
  { value: 'connecting_content', label: 'Connecting Content (table/chart)' },
  { value: 'inference', label: 'Inference (what can be concluded)' },
]

export default function AddMaterial() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
    material_type: 'conversation',
    subject: '',
    conversation_setting: 'office_hours',
    academic_field: 'arts_humanities',
    lecture_style: 'monologue',
    transcript: '',
    speaker_notes: '',
    difficulty: 'medium',
    source_type: 'manual',
    notes: '',
  })

  const [questions, setQuestions] = useState([{ ...EMPTY_QUESTION }])

  function setField(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  function setQuestion(idx, key, val) {
    setQuestions((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [key]: val }
      return next
    })
  }

  function setOptionText(qIdx, optId, text) {
    setQuestions((prev) => {
      const next = [...prev]
      next[qIdx] = {
        ...next[qIdx],
        options: next[qIdx].options.map((o) => (o.id === optId ? { ...o, text } : o)),
      }
      return next
    })
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, { ...EMPTY_QUESTION, options: EMPTY_QUESTION.options.map(o => ({ ...o })) }])
  }

  function removeQuestion(idx) {
    setQuestions((prev) => prev.filter((_, i) => i !== idx))
  }

  function estimateWordCount(text) {
    return text.trim().split(/\s+/).filter(Boolean).length
  }

  function estimateDuration(text) {
    const wpm = 130
    const words = estimateWordCount(text)
    return Math.round((words / wpm) * 60)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.transcript.trim()) {
      setError('Title and transcript are required.')
      return
    }
    setSaving(true)
    setError('')

    const wordCount = estimateWordCount(form.transcript)
    const estDuration = estimateDuration(form.transcript)

    const matData = {
      title: form.title.trim(),
      material_type: form.material_type,
      subject: form.subject.trim() || null,
      conversation_setting: form.material_type === 'conversation' ? form.conversation_setting : null,
      academic_field: form.material_type === 'lecture' ? form.academic_field : null,
      lecture_style: form.material_type === 'lecture' ? form.lecture_style : null,
      transcript: form.transcript.trim(),
      speaker_notes: form.speaker_notes.trim() || null,
      difficulty: form.difficulty,
      word_count: wordCount,
      estimated_duration: estDuration,
      source_type: form.source_type,
      notes: form.notes.trim() || null,
    }

    const { data: matRow, error: matErr } = await supabase
      .from('listening_materials')
      .insert(matData)
      .select()
      .single()

    if (matErr) {
      setError('Failed to save material: ' + matErr.message)
      setSaving(false)
      return
    }

    const validQuestions = questions.filter((q) => q.question_text.trim())
    if (validQuestions.length > 0) {
      const qRows = validQuestions.map((q, idx) => ({
        material_id: matRow.id,
        question_order: idx + 1,
        question_type: q.question_type,
        question_text: q.question_text.trim(),
        options: q.options.filter((o) => o.text.trim()),
        correct_answer: q.correct_answer,
        allows_multiple: q.allows_multiple,
        explanation: q.explanation.trim() || null,
      }))
      await supabase.from('listening_questions').insert(qRows)
    }

    navigate(`/dashboard/listening/materials/${matRow.id}`)
  }

  const isLecture = form.material_type === 'lecture'

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link to="/dashboard/listening/materials" className="text-sm text-slate-400 hover:text-brand-600">
          ← Materials
        </Link>
        <span className="text-slate-300">/</span>
        <h2 className="text-xl font-bold text-slate-900">Add Material Manually</h2>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-slate-900">Basic Information</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="e.g. Professor discusses photosynthesis" />
          </div>

          <div>
            <label className="label">Type *</label>
            <select className="input" value={form.material_type} onChange={(e) => setField('material_type', e.target.value)}>
              <option value="conversation">Conversation (campus setting)</option>
              <option value="lecture">Lecture (academic topic)</option>
            </select>
          </div>

          <div>
            <label className="label">Difficulty</label>
            <select className="input" value={form.difficulty} onChange={(e) => setField('difficulty', e.target.value)}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="label">Subject / Topic</label>
            <input className="input" value={form.subject} onChange={(e) => setField('subject', e.target.value)} placeholder="e.g. Photosynthesis, Office Hours about exam" />
          </div>

          {isLecture ? (
            <>
              <div>
                <label className="label">Academic Field</label>
                <select className="input" value={form.academic_field} onChange={(e) => setField('academic_field', e.target.value)}>
                  <option value="arts_humanities">Arts & Humanities</option>
                  <option value="life_sciences">Life Sciences</option>
                  <option value="physical_sciences">Physical Sciences</option>
                  <option value="social_sciences">Social Sciences</option>
                </select>
              </div>
              <div>
                <label className="label">Lecture Style</label>
                <select className="input" value={form.lecture_style} onChange={(e) => setField('lecture_style', e.target.value)}>
                  <option value="monologue">Monologue (professor only)</option>
                  <option value="interactive">Interactive (with student Q&A)</option>
                </select>
              </div>
            </>
          ) : (
            <div>
              <label className="label">Campus Setting</label>
              <select className="input" value={form.conversation_setting} onChange={(e) => setField('conversation_setting', e.target.value)}>
                <option value="office_hours">Office Hours</option>
                <option value="student_services">Student Services</option>
                <option value="library">Library</option>
                <option value="advising">Advising Center</option>
                <option value="housing">Housing Office</option>
                <option value="other">Other Campus</option>
              </select>
            </div>
          )}

          <div>
            <label className="label">Source</label>
            <select className="input" value={form.source_type} onChange={(e) => setField('source_type', e.target.value)}>
              <option value="manual">Manual Entry</option>
              <option value="adapted">Adapted from Official Material</option>
              <option value="ai_generated">AI Generated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transcript */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Transcript *</h3>
          {form.transcript && (
            <span className="text-xs text-slate-400">
              ~{estimateWordCount(form.transcript)} words · ~{Math.round(estimateDuration(form.transcript)/60)}:{String(estimateDuration(form.transcript)%60).padStart(2,'0')} min
            </span>
          )}
        </div>
        <textarea
          className="input min-h-[280px] font-mono text-sm leading-relaxed"
          value={form.transcript}
          onChange={(e) => setField('transcript', e.target.value)}
          placeholder={isLecture
            ? "Professor: Good morning everyone. Today we'll be discussing...\n\nStudent: Professor, could you explain...?\n\nProfessor: Great question! ..."
            : "Student: Hi, I was hoping to talk to you about...\n\nAdvisor: Of course, come in. What's on your mind?\n\nStudent: Well, I've been having trouble with..."
          }
        />
        <div>
          <label className="label">Speaker Notes (optional)</label>
          <input
            className="input"
            value={form.speaker_notes}
            onChange={(e) => setField('speaker_notes', e.target.value)}
            placeholder="e.g. Professor uses a slightly excited tone when discussing the discovery..."
          />
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 text-lg">
            Questions
            <span className="text-sm font-normal text-slate-400 ml-2">
              ({questions.length} / {isLecture ? 6 : 5} recommended)
            </span>
          </h3>
          <button onClick={addQuestion} className="btn-secondary text-sm">
            + Add Question
          </button>
        </div>

        {questions.map((q, idx) => (
          <div key={idx} className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-600">Question {idx + 1}</span>
              {questions.length > 1 && (
                <button onClick={() => removeQuestion(idx)} className="text-xs text-red-500 hover:text-red-700">
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Question Type</label>
                <select className="input text-sm" value={q.question_type} onChange={(e) => setQuestion(idx, 'question_type', e.target.value)}>
                  {Q_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-3">
                <div>
                  <label className="label text-xs">Correct Answer</label>
                  <select className="input text-sm" value={q.correct_answer} onChange={(e) => setQuestion(idx, 'correct_answer', e.target.value)}>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600 pb-2 cursor-pointer">
                  <input type="checkbox" checked={q.allows_multiple} onChange={(e) => setQuestion(idx, 'allows_multiple', e.target.checked)} className="rounded" />
                  Multiple correct
                </label>
              </div>
            </div>

            <div>
              <label className="label text-xs">Question Text</label>
              <input className="input" value={q.question_text} onChange={(e) => setQuestion(idx, 'question_text', e.target.value)} placeholder="What is mainly discussed in the conversation?" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {q.options.map((opt) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-400 w-5 shrink-0">{opt.id}.</span>
                  <input
                    className="input text-sm"
                    value={opt.text}
                    onChange={(e) => setOptionText(idx, opt.id, e.target.value)}
                    placeholder={`Option ${opt.id}`}
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="label text-xs">Explanation (optional)</label>
              <input className="input text-sm" value={q.explanation} onChange={(e) => setQuestion(idx, 'explanation', e.target.value)} placeholder="Why is this the correct answer?" />
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="card p-5">
        <label className="label">Internal Notes (optional)</label>
        <textarea className="input min-h-[80px]" value={form.notes} onChange={(e) => setField('notes', e.target.value)} placeholder="Any notes for yourself about this material…" />
      </div>

      {/* Save */}
      <div className="flex justify-end gap-3 pb-8">
        <Link to="/dashboard/listening/materials" className="btn-secondary">Cancel</Link>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : '💾 Save Material'}
        </button>
      </div>
    </div>
  )
}
