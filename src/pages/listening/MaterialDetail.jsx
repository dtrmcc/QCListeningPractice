import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

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

export default function MaterialDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [material, setMaterial] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [revealed, setRevealed] = useState({})

  useEffect(() => {
    async function load() {
      const [matRes, qRes] = await Promise.all([
        supabase.from('listening_materials').select('*').eq('id', id).single(),
        supabase.from('listening_questions').select('*').eq('material_id', id).order('question_order'),
      ])
      setMaterial(matRes.data)
      setQuestions(qRes.data || [])
      setLoading(false)
    }
    load()
  }, [id])

  function toggleAnswer(qid) {
    setRevealed((prev) => ({ ...prev, [qid]: !prev[qid] }))
  }

  function fmtDuration(secs) {
    if (!secs) return '—'
    const m = Math.floor(secs / 60), s = secs % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  if (loading) {
    return <div className="card p-16 text-center text-slate-400">Loading…</div>
  }
  if (!material) {
    return (
      <div className="card p-12 text-center">
        <p className="text-slate-500">Material not found.</p>
        <Link to="/dashboard/listening/materials" className="btn-primary mt-4">← Back to Library</Link>
      </div>
    )
  }

  const isConversation = material.material_type === 'conversation'

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Link to="/dashboard/listening/materials" className="text-sm text-slate-400 hover:text-brand-600">
              ← Materials
            </Link>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{material.title}</h2>
          {material.subject && <p className="text-slate-500 mt-1">{material.subject}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className={isConversation ? 'badge-conversation' : 'badge-lecture'}>
              {isConversation ? '💬 Conversation' : '🏛️ Lecture'}
            </span>
            {material.difficulty && <span className={`badge-${material.difficulty}`}>{material.difficulty}</span>}
            {material.estimated_duration && (
              <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                ⏱ {fmtDuration(material.estimated_duration)}
              </span>
            )}
            {material.word_count && (
              <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {material.word_count} words
              </span>
            )}
            <span className="text-xs text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-full capitalize border border-slate-200">
              {material.source_type?.replace('_', ' ') || 'manual'}
            </span>
          </div>
        </div>
        <Link
          to={`/dashboard/listening/classroom/${id}`}
          className="btn-primary ml-4"
        >
          🖥️ Open in Classroom Mode
        </Link>
      </div>

      {/* Meta info */}
      {(material.academic_field || material.conversation_setting || material.lecture_style) && (
        <div className="card p-4 flex flex-wrap gap-6 text-sm">
          {material.academic_field && (
            <div>
              <span className="text-slate-400 text-xs font-medium">Academic Field</span>
              <p className="text-slate-700 font-medium capitalize mt-0.5">
                {material.academic_field.replace('_', ' ')}
              </p>
            </div>
          )}
          {material.conversation_setting && (
            <div>
              <span className="text-slate-400 text-xs font-medium">Setting</span>
              <p className="text-slate-700 font-medium capitalize mt-0.5">
                {material.conversation_setting.replace('_', ' ')}
              </p>
            </div>
          )}
          {material.lecture_style && (
            <div>
              <span className="text-slate-400 text-xs font-medium">Lecture Style</span>
              <p className="text-slate-700 font-medium capitalize mt-0.5">
                {material.lecture_style}
              </p>
            </div>
          )}
          {material.created_at && (
            <div>
              <span className="text-slate-400 text-xs font-medium">Added</span>
              <p className="text-slate-700 font-medium mt-0.5">
                {new Date(material.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Speaker notes */}
      {material.speaker_notes && (
        <div className="card p-5 bg-amber-50 border-amber-200">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Speaker Notes</p>
          <p className="text-sm text-amber-900">{material.speaker_notes}</p>
        </div>
      )}

      {/* Transcript */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          📄 Transcript
          <span className="text-xs text-slate-400 font-normal">
            ({material.word_count || '?'} words · ~{fmtDuration(material.estimated_duration)})
          </span>
        </h3>
        <div className="prose prose-slate max-w-none">
          {material.transcript.split('\n').map((para, i) =>
            para.trim() ? (
              <p key={i} className="text-slate-700 text-sm leading-relaxed mb-3">{para}</p>
            ) : null
          )}
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900 text-lg flex items-center gap-2">
          ❓ Questions
          <span className="text-sm font-normal text-slate-400">({questions.length})</span>
        </h3>

        {questions.length === 0 ? (
          <div className="card p-8 text-center text-slate-400 text-sm">No questions added yet.</div>
        ) : (
          questions.map((q, idx) => (
            <div key={q.id} className="card p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-400 text-sm font-medium">Q{idx + 1}.</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${Q_TYPE_COLORS[q.question_type] || 'bg-slate-100 text-slate-600'}`}>
                    {Q_TYPE_LABELS[q.question_type] || q.question_type}
                  </span>
                  {q.allows_multiple && (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                      Multiple answers
                    </span>
                  )}
                </div>
                <button
                  onClick={() => toggleAnswer(q.id)}
                  className="text-xs btn-secondary shrink-0"
                >
                  {revealed[q.id] ? 'Hide Answer' : 'Show Answer'}
                </button>
              </div>

              <p className="text-slate-800 font-medium mb-3">{q.question_text}</p>

              {q.options && (
                <div className="space-y-2">
                  {(Array.isArray(q.options) ? q.options : []).map((opt) => {
                    const isCorrect = revealed[q.id] && (
                      q.correct_answer === opt.id ||
                      q.correct_answer?.split(',').includes(opt.id)
                    )
                    return (
                      <div
                        key={opt.id}
                        className={`flex items-start gap-2.5 p-3 rounded-lg border text-sm transition-colors ${
                          isCorrect
                            ? 'bg-green-50 border-green-300 text-green-800'
                            : 'border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className={`font-bold shrink-0 ${isCorrect ? 'text-green-600' : 'text-slate-400'}`}>
                          {opt.id}.
                        </span>
                        <span>{opt.text}</span>
                        {isCorrect && <span className="ml-auto text-green-600 shrink-0">✓</span>}
                      </div>
                    )
                  })}
                </div>
              )}

              {revealed[q.id] && q.explanation && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Explanation</p>
                  <p className="text-sm text-blue-800">{q.explanation}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
