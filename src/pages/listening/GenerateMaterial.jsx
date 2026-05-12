import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const Q_TYPE_COLORS = {
  gist_content: 'bg-indigo-100 text-indigo-700',
  gist_purpose: 'bg-blue-100 text-blue-700',
  detail: 'bg-teal-100 text-teal-700',
  function: 'bg-cyan-100 text-cyan-700',
  attitude: 'bg-amber-100 text-amber-700',
  organization: 'bg-orange-100 text-orange-700',
  connecting_content: 'bg-pink-100 text-pink-700',
  inference: 'bg-purple-100 text-purple-700',
}

const Q_TYPE_LABELS = {
  gist_content: 'Gist-Content',
  gist_purpose: 'Gist-Purpose',
  detail: 'Detail',
  function: 'Function',
  attitude: 'Attitude',
  organization: 'Organization',
  connecting_content: 'Connecting Content',
  inference: 'Inference',
}

export default function GenerateMaterial() {
  const navigate = useNavigate()
  const [step, setStep] = useState('form') // 'form' | 'generating' | 'preview'
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [generated, setGenerated] = useState(null)
  const [editedMaterial, setEditedMaterial] = useState(null)

  const [form, setForm] = useState({
    material_type: 'lecture',
    academic_field: 'life_sciences',
    conversation_setting: 'office_hours',
    topic: '',
    difficulty: 'medium',
    num_questions: 6,
    extra_instructions: '',
  })

  function setField(k, v) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  async function handleGenerate() {
    setError('')
    setStep('generating')
    try {
      const res = await fetch('/.netlify/functions/generate-material', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setGenerated(data)
      setEditedMaterial(data)
      setStep('preview')
    } catch (e) {
      setError(e.message || 'Failed to generate material. Check your Anthropic API key in Netlify env vars.')
      setStep('form')
    }
  }

  async function handleSave() {
    if (!editedMaterial) return
    setSaving(true)
    setError('')

    const wc = editedMaterial.transcript.trim().split(/\s+/).filter(Boolean).length
    const estDur = Math.round((wc / 130) * 60)

    const matData = {
      title: editedMaterial.title,
      material_type: form.material_type,
      subject: editedMaterial.subject || null,
      conversation_setting: form.material_type === 'conversation' ? form.conversation_setting : null,
      academic_field: form.material_type === 'lecture' ? form.academic_field : null,
      lecture_style: editedMaterial.lecture_style || 'monologue',
      transcript: editedMaterial.transcript,
      speaker_notes: editedMaterial.speaker_notes || null,
      difficulty: form.difficulty,
      word_count: wc,
      estimated_duration: estDur,
      source_type: 'ai_generated',
    }

    const { data: matRow, error: matErr } = await supabase
      .from('listening_materials')
      .insert(matData)
      .select()
      .single()

    if (matErr) {
      setError('Failed to save: ' + matErr.message)
      setSaving(false)
      return
    }

    if (editedMaterial.questions?.length > 0) {
      const qRows = editedMaterial.questions.map((q, idx) => ({
        material_id: matRow.id,
        question_order: idx + 1,
        question_type: q.question_type,
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        allows_multiple: q.allows_multiple || false,
        explanation: q.explanation || null,
      }))
      await supabase.from('listening_questions').insert(qRows)
    }

    navigate(`/dashboard/listening/materials/${matRow.id}`)
  }

  const isLecture = form.material_type === 'lecture'

  if (step === 'generating') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🤖</div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Generating TOEFL Material…</h3>
          <p className="text-slate-500 text-sm">
            Claude is creating an authentic TOEFL-style{' '}
            {form.material_type} with {form.num_questions} questions.
          </p>
          <div className="mt-6 flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-brand-500 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (step === 'preview' && editedMaterial) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Review Generated Material</h2>
            <p className="text-sm text-slate-500 mt-1">Review and edit before saving to the library.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep('form')} className="btn-secondary">
              ← Regenerate
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : '💾 Save to Library'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100">{error}</div>
        )}

        {/* Edit title */}
        <div className="card p-5">
          <label className="label">Title</label>
          <input
            className="input"
            value={editedMaterial.title}
            onChange={(e) => setEditedMaterial((p) => ({ ...p, title: e.target.value }))}
          />
          {editedMaterial.subject && (
            <div className="mt-3">
              <label className="label">Subject</label>
              <input
                className="input"
                value={editedMaterial.subject}
                onChange={(e) => setEditedMaterial((p) => ({ ...p, subject: e.target.value }))}
              />
            </div>
          )}
          {editedMaterial.speaker_notes && (
            <div className="mt-3">
              <label className="label text-amber-700">Speaker Notes</label>
              <input
                className="input"
                value={editedMaterial.speaker_notes}
                onChange={(e) => setEditedMaterial((p) => ({ ...p, speaker_notes: e.target.value }))}
              />
            </div>
          )}
        </div>

        {/* Transcript */}
        <div className="card p-5">
          <label className="label">Transcript</label>
          <textarea
            className="input min-h-[320px] font-mono text-sm leading-relaxed"
            value={editedMaterial.transcript}
            onChange={(e) => setEditedMaterial((p) => ({ ...p, transcript: e.target.value }))}
          />
        </div>

        {/* Questions */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900">Questions ({editedMaterial.questions?.length})</h3>
          {(editedMaterial.questions || []).map((q, idx) => (
            <div key={idx} className="card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm font-medium">Q{idx + 1}.</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${Q_TYPE_COLORS[q.question_type] || 'bg-slate-100 text-slate-600'}`}>
                  {Q_TYPE_LABELS[q.question_type] || q.question_type}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-800">{q.question_text}</p>
              <div className="space-y-1.5">
                {(q.options || []).map((opt) => {
                  const isCorrect = q.correct_answer === opt.id || q.correct_answer?.split(',').includes(opt.id)
                  return (
                    <div key={opt.id} className={`flex items-start gap-2 p-2.5 rounded-lg text-sm border ${isCorrect ? 'bg-green-50 border-green-200 text-green-800' : 'border-slate-200 text-slate-700'}`}>
                      <span className={`font-bold shrink-0 ${isCorrect ? 'text-green-600' : 'text-slate-400'}`}>{opt.id}.</span>
                      <span>{opt.text}</span>
                      {isCorrect && <span className="ml-auto text-green-600 shrink-0">✓ Correct</span>}
                    </div>
                  )
                })}
              </div>
              {q.explanation && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Explanation</p>
                  <p className="text-xs text-blue-800">{q.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Form step
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Generate with AI</h2>
        <p className="text-slate-500 text-sm mt-1">
          Use Claude AI to create authentic TOEFL-style listening material instantly.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-100">
          <strong>Error:</strong> {error}
          <p className="mt-1 text-xs">Make sure <code>ANTHROPIC_API_KEY</code> is set in your Netlify environment variables.</p>
        </div>
      )}

      <div className="card p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Material Type *</label>
            <select className="input" value={form.material_type} onChange={(e) => setField('material_type', e.target.value)}>
              <option value="conversation">Conversation</option>
              <option value="lecture">Lecture</option>
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

          {isLecture ? (
            <div>
              <label className="label">Academic Field</label>
              <select className="input" value={form.academic_field} onChange={(e) => setField('academic_field', e.target.value)}>
                <option value="arts_humanities">Arts & Humanities</option>
                <option value="life_sciences">Life Sciences</option>
                <option value="physical_sciences">Physical Sciences</option>
                <option value="social_sciences">Social Sciences</option>
              </select>
            </div>
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
            <label className="label">Number of Questions</label>
            <select className="input" value={form.num_questions} onChange={(e) => setField('num_questions', Number(e.target.value))}>
              {isLecture
                ? [4, 5, 6].map((n) => <option key={n} value={n}>{n} questions</option>)
                : [4, 5].map((n) => <option key={n} value={n}>{n} questions</option>)
              }
            </select>
          </div>
        </div>

        <div>
          <label className="label">
            Specific Topic / Keywords <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            className="input"
            value={form.topic}
            onChange={(e) => setField('topic', e.target.value)}
            placeholder={isLecture ? 'e.g. bioluminescence, the printing press, behavioral economics…' : 'e.g. changing major, library research help…'}
          />
          <p className="text-xs text-slate-400 mt-1.5">Leave blank for a random TOEFL-appropriate topic.</p>
        </div>

        <div>
          <label className="label">
            Extra Instructions <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            className="input min-h-[80px]"
            value={form.extra_instructions}
            onChange={(e) => setField('extra_instructions', e.target.value)}
            placeholder="e.g. Include a connecting content question about a table. Make the professor enthusiastic. Focus on B2/C1 vocabulary level."
          />
        </div>

        <div className="pt-2">
          <button onClick={handleGenerate} className="btn-primary w-full justify-center py-3 text-base">
            🤖 Generate Material
          </button>
          <p className="text-center text-xs text-slate-400 mt-2">
            Powered by Claude AI · Takes ~15–30 seconds
          </p>
        </div>
      </div>

      {/* Setup info */}
      <div className="card p-5 bg-blue-50 border-blue-200">
        <p className="text-sm font-semibold text-blue-800 mb-1">Setup Required</p>
        <p className="text-sm text-blue-700">
          Add your Anthropic API key as <code className="bg-blue-100 px-1 rounded">ANTHROPIC_API_KEY</code> in your Netlify site's environment variables (Site Settings → Environment Variables).
        </p>
      </div>
    </div>
  )
}
