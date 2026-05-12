import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
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

export default function ClassroomMode() {
  const { id } = useParams()
  const navigate = useNavigate()

  // Material state
  const [materials, setMaterials] = useState([])
  const [material, setMaterial] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)

  // TTS state
  const [voices, setVoices] = useState([])
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('')
  const [rate, setRate] = useState(0.9)
  const [pitch, setPitch] = useState(1.0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [currentCharIndex, setCurrentCharIndex] = useState(-1)
  const [progress, setProgress] = useState(0)

  // UI state
  const [showTranscript, setShowTranscript] = useState(true)
  const [showQuestions, setShowQuestions] = useState(false)
  const [revealedAnswers, setRevealedAnswers] = useState({})
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [darkMode, setDarkMode] = useState(true)

  const utteranceRef = useRef(null)
  const transcriptRef = useRef(null)
  const paragraphRefs = useRef([])

  // Load voices
  useEffect(() => {
    function loadVoices() {
      const available = window.speechSynthesis.getVoices()
      if (available.length === 0) return
      setVoices(available)
      // Prefer high-quality English voices (Mac: Samantha, Tom, Alex, Karen)
      const preferred = ['Samantha', 'Tom', 'Alex', 'Daniel', 'Karen', 'Moira']
      const best = available.find((v) => preferred.some((n) => v.name.includes(n)) && v.lang.startsWith('en'))
        || available.find((v) => v.lang.startsWith('en-US'))
        || available.find((v) => v.lang.startsWith('en'))
        || available[0]
      if (best) setSelectedVoiceURI(best.voiceURI)
    }

    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    return () => {
      window.speechSynthesis.cancel()
    }
  }, [])

  // Load materials list + specific material if id
  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: mats } = await supabase
        .from('listening_materials')
        .select('id, title, material_type, subject, academic_field, conversation_setting')
        .order('created_at', { ascending: false })
      setMaterials(mats || [])

      if (id) {
        const [matRes, qRes] = await Promise.all([
          supabase.from('listening_materials').select('*').eq('id', id).single(),
          supabase.from('listening_questions').select('*').eq('material_id', id).order('question_order'),
        ])
        setMaterial(matRes.data)
        setQuestions(qRes.data || [])
      }
      setLoading(false)
    }
    load()
  }, [id])

  // Stop TTS when material changes
  useEffect(() => {
    stop()
    setShowQuestions(false)
    setRevealedAnswers({})
    setSelectedAnswers({})
    setCurrentCharIndex(-1)
    setProgress(0)
  }, [id])

  const paragraphs = material?.transcript
    ? material.transcript.split('\n').filter((p) => p.trim())
    : []

  function getVoice() {
    return voices.find((v) => v.voiceURI === selectedVoiceURI) || null
  }

  function buildUtterance(text) {
    const utt = new SpeechSynthesisUtterance(text)
    utt.voice = getVoice()
    utt.rate = rate
    utt.pitch = pitch
    utt.lang = 'en-US'

    utt.onstart = () => { setIsPlaying(true); setIsPaused(false) }
    utt.onend = () => {
      setIsPlaying(false)
      setIsPaused(false)
      setCurrentCharIndex(-1)
      setProgress(100)
    }
    utt.onerror = (e) => {
      if (e.error !== 'interrupted') console.error('TTS error', e)
      setIsPlaying(false)
      setIsPaused(false)
    }
    utt.onboundary = (e) => {
      if (e.name === 'word') {
        setCurrentCharIndex(e.charIndex)
        setProgress(Math.round((e.charIndex / text.length) * 100))
        scrollToCurrent(e.charIndex)
      }
    }
    return utt
  }

  function scrollToCurrent(charIndex) {
    if (!transcriptRef.current || !material) return
    let cumulative = 0
    for (let i = 0; i < paragraphs.length; i++) {
      cumulative += paragraphs[i].length + 1
      if (charIndex < cumulative) {
        paragraphRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        break
      }
    }
  }

  function getCurrentParagraphIdx() {
    if (currentCharIndex < 0) return -1
    let cumulative = 0
    for (let i = 0; i < paragraphs.length; i++) {
      cumulative += paragraphs[i].length + 1
      if (currentCharIndex < cumulative) return i
    }
    return -1
  }

  function play() {
    if (!material) return
    window.speechSynthesis.cancel()
    const utt = buildUtterance(material.transcript)
    utteranceRef.current = utt
    window.speechSynthesis.speak(utt)
    setProgress(0)
  }

  function pause() {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause()
      setIsPaused(true)
      setIsPlaying(false)
    }
  }

  function resume() {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      setIsPaused(false)
      setIsPlaying(true)
    }
  }

  function stop() {
    window.speechSynthesis.cancel()
    setIsPlaying(false)
    setIsPaused(false)
    setCurrentCharIndex(-1)
    setProgress(0)
  }

  function handlePlayPause() {
    if (isPlaying) pause()
    else if (isPaused) resume()
    else play()
  }

  function toggleAnswer(qid) {
    setRevealedAnswers((p) => ({ ...p, [qid]: !p[qid] }))
  }

  function selectAnswer(qid, optId) {
    setSelectedAnswers((p) => ({ ...p, [qid]: optId }))
  }

  const currentPara = getCurrentParagraphIdx()

  // Theming
  const bg = darkMode ? 'bg-slate-900' : 'bg-slate-50'
  const cardBg = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
  const textPrimary = darkMode ? 'text-slate-100' : 'text-slate-900'
  const textSecondary = darkMode ? 'text-slate-400' : 'text-slate-500'
  const inputBg = darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200 text-slate-900'

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
        Loading…
      </div>
    )
  }

  // Selector screen if no material selected
  if (!id || !material) {
    return (
      <div className={`min-h-screen ${bg} ${textPrimary} p-8`}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold">🖥️ Classroom Mode</h1>
              <p className={`text-sm mt-1 ${textSecondary}`}>Select a listening passage to play for your students.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDarkMode((d) => !d)}
                className={`text-sm px-3 py-1.5 rounded-lg border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              >
                {darkMode ? '☀️ Light' : '🌙 Dark'}
              </button>
              <Link to="/dashboard/listening" className={`text-sm px-3 py-1.5 rounded-lg border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                ← Dashboard
              </Link>
            </div>
          </div>

          {materials.length === 0 ? (
            <div className={`rounded-xl border ${cardBg} p-12 text-center`}>
              <span className="text-4xl block mb-3">📭</span>
              <p className={textSecondary}>No materials in the library yet.</p>
              <Link to="/dashboard/listening/generate" className="btn-primary mt-4">
                🤖 Generate First Material
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {materials.map((m) => (
                <button
                  key={m.id}
                  onClick={() => navigate(`/dashboard/listening/classroom/${m.id}`)}
                  className={`w-full text-left rounded-xl border ${cardBg} p-4 hover:border-brand-500 transition-colors group flex items-center gap-4`}
                >
                  <span className="text-3xl">{m.material_type === 'conversation' ? '💬' : '🏛️'}</span>
                  <div className="flex-1">
                    <p className={`font-semibold group-hover:text-brand-400 transition-colors ${textPrimary}`}>{m.title}</p>
                    <p className={`text-sm mt-0.5 ${textSecondary}`}>
                      {m.material_type === 'conversation' ? 'Conversation' : 'Lecture'}
                      {m.subject && ` · ${m.subject}`}
                    </p>
                  </div>
                  <span className={`text-sm ${textSecondary}`}>▶ Play</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Classroom playback screen
  return (
    <div className={`min-h-screen ${bg} flex flex-col`}>
      {/* Top bar */}
      <div className={`border-b ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'} px-6 py-3 flex items-center justify-between gap-4`}>
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/dashboard/listening/classroom')}
            className={`shrink-0 text-sm px-2.5 py-1.5 rounded-lg border transition-colors ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
          >
            ← Back
          </button>
          <div className="min-w-0">
            <p className={`font-semibold truncate ${textPrimary}`}>{material.title}</p>
            <p className={`text-xs ${textSecondary} truncate`}>
              {material.material_type === 'conversation' ? '💬 Conversation' : '🏛️ Lecture'}
              {material.subject && ` · ${material.subject}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* Voice selector */}
          <div className="flex items-center gap-2">
            <label className={`text-xs font-medium ${textSecondary}`}>Voice</label>
            <select
              value={selectedVoiceURI}
              onChange={(e) => setSelectedVoiceURI(e.target.value)}
              className={`text-sm rounded-lg border px-2 py-1 ${inputBg}`}
            >
              {voices.filter((v) => v.lang.startsWith('en')).map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* Speed */}
          <div className="flex items-center gap-2">
            <label className={`text-xs font-medium ${textSecondary}`}>Speed</label>
            <div className="flex gap-1">
              {[0.7, 0.85, 1.0, 1.15, 1.3].map((r) => (
                <button
                  key={r}
                  onClick={() => { setRate(r); if (isPlaying) { stop(); setTimeout(play, 100) } }}
                  className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                    rate === r
                      ? 'bg-brand-600 text-white'
                      : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r === 1.0 ? '1×' : `${r}×`}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowTranscript((t) => !t)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                showTranscript
                  ? 'bg-brand-600 text-white border-brand-600'
                  : darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              📄 Transcript
            </button>
            <button
              onClick={() => setDarkMode((d) => !d)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto px-8 py-6 max-w-4xl mx-auto w-full">
        {/* Transcript */}
        {showTranscript && (
          <div ref={transcriptRef} className={`rounded-xl border ${cardBg} p-6 mb-6`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-4 ${textSecondary}`}>
              Transcript
              {material.speaker_notes && (
                <span className="ml-3 normal-case font-normal text-amber-500">
                  📝 {material.speaker_notes}
                </span>
              )}
            </p>
            <div className="space-y-4">
              {paragraphs.map((para, i) => (
                <p
                  key={i}
                  ref={(el) => (paragraphRefs.current[i] = el)}
                  className={`leading-relaxed transition-all duration-300 text-base ${
                    currentPara === i
                      ? darkMode
                        ? 'text-yellow-300 font-medium'
                        : 'text-amber-700 font-medium bg-amber-50 -mx-2 px-2 rounded'
                      : textPrimary
                  }`}
                >
                  {para}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Questions */}
        {showQuestions && (
          <div className="space-y-4 mb-6">
            <h3 className={`font-semibold text-lg ${textPrimary}`}>Questions ({questions.length})</h3>
            {questions.map((q, idx) => (
              <div key={q.id} className={`rounded-xl border ${cardBg} p-5`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-sm font-medium ${textSecondary}`}>Q{idx + 1}.</span>
                  <span className="text-xs px-2 py-0.5 bg-brand-900 text-brand-300 rounded-full font-medium">
                    {Q_TYPE_LABELS[q.question_type] || q.question_type}
                  </span>
                </div>
                <p className={`font-medium mb-3 ${textPrimary}`}>{q.question_text}</p>
                <div className="space-y-2">
                  {(q.options || []).map((opt) => {
                    const isSelected = selectedAnswers[q.id] === opt.id
                    const isRevealed = revealedAnswers[q.id]
                    const isCorrect = q.correct_answer === opt.id || q.correct_answer?.split(',').includes(opt.id)
                    let optClass = darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    if (isSelected && !isRevealed) optClass = 'border-brand-500 bg-brand-900 text-brand-200'
                    if (isRevealed && isCorrect) optClass = 'border-green-500 bg-green-900 text-green-200'
                    else if (isRevealed && isSelected && !isCorrect) optClass = 'border-red-500 bg-red-900 text-red-200'

                    return (
                      <button
                        key={opt.id}
                        onClick={() => !isRevealed && selectAnswer(q.id, opt.id)}
                        className={`w-full text-left flex items-start gap-2.5 p-3 rounded-lg border text-sm transition-colors ${optClass}`}
                      >
                        <span className="font-bold shrink-0">{opt.id}.</span>
                        <span className="flex-1">{opt.text}</span>
                        {isRevealed && isCorrect && <span className="shrink-0 text-green-400">✓</span>}
                        {isRevealed && isSelected && !isCorrect && <span className="shrink-0 text-red-400">✗</span>}
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <button
                    onClick={() => toggleAnswer(q.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      darkMode ? 'border-slate-600 text-slate-400 hover:bg-slate-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {revealedAnswers[q.id] ? 'Hide Answer' : 'Reveal Answer'}
                  </button>
                  {revealedAnswers[q.id] && q.explanation && (
                    <p className={`text-xs ${textSecondary} max-w-lg text-right`}>{q.explanation}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className={`h-1 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
        <div
          className="h-full bg-brand-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* TTS Control Bar */}
      <div className={`border-t ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'} px-6 py-4`}>
        <div className="max-w-4xl mx-auto flex items-center gap-6">
          {/* Main controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={stop}
              disabled={!isPlaying && !isPaused}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors disabled:opacity-30 ${
                darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              ⏹
            </button>

            <button
              onClick={handlePlayPause}
              disabled={!material}
              className="w-14 h-14 rounded-full bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center text-2xl transition-colors disabled:opacity-50 shadow-lg"
            >
              {isPlaying ? '⏸' : '▶'}
            </button>

            <div className={`text-xs ${textSecondary} text-center w-16`}>
              {isPlaying ? '● Playing' : isPaused ? '⏸ Paused' : 'Ready'}
            </div>
          </div>

          {/* Pitch */}
          <div className="flex items-center gap-2">
            <label className={`text-xs font-medium ${textSecondary}`}>Pitch</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={pitch}
              onChange={(e) => setPitch(Number(e.target.value))}
              className="w-20 accent-brand-500"
            />
            <span className={`text-xs w-6 ${textSecondary}`}>{pitch.toFixed(1)}</span>
          </div>

          {/* Show questions button */}
          <div className="ml-auto">
            {questions.length > 0 && (
              <button
                onClick={() => setShowQuestions((q) => !q)}
                className={`text-sm px-4 py-2 rounded-lg border font-medium transition-colors ${
                  showQuestions
                    ? 'bg-brand-600 text-white border-brand-600'
                    : darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {showQuestions ? '❓ Hide Questions' : `❓ Show Questions (${questions.length})`}
              </button>
            )}
          </div>

          {/* Keyboard hint */}
          <p className={`text-xs ${textSecondary}`}>
            Space = play/pause · Esc = stop
          </p>
        </div>
      </div>

      {/* Keyboard shortcuts */}
      <KeyboardHandler
        onPlay={handlePlayPause}
        onStop={stop}
      />
    </div>
  )
}

function KeyboardHandler({ onPlay, onStop }) {
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return
      if (e.code === 'Space') { e.preventDefault(); onPlay() }
      if (e.code === 'Escape') onStop()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onPlay, onStop])
  return null
}
