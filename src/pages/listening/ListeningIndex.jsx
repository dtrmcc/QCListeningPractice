import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const QUICK_LINKS = [
  { label: 'Browse Materials', desc: 'View all conversations and lectures', path: '/dashboard/listening/materials', icon: '📚', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { label: 'Add Material', desc: 'Manually enter a new passage', path: '/dashboard/listening/add', icon: '➕', color: 'bg-green-50 border-green-200 text-green-700' },
  { label: 'Generate with AI', desc: 'Create TOEFL-style material via AI', path: '/dashboard/listening/generate', icon: '🤖', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { label: 'Classroom Mode', desc: 'TTS playback for in-class use', path: '/dashboard/listening/classroom', icon: '🖥️', color: 'bg-orange-50 border-orange-200 text-orange-700' },
]

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

export default function ListeningIndex() {
  const [stats, setStats] = useState({ total: 0, conversations: 0, lectures: 0, questions: 0 })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [matRes, qRes] = await Promise.all([
        supabase.from('listening_materials').select('id, material_type, title, created_at').order('created_at', { ascending: false }),
        supabase.from('listening_questions').select('id', { count: 'exact' }),
      ])

      if (matRes.data) {
        const total = matRes.data.length
        const conversations = matRes.data.filter((m) => m.material_type === 'conversation').length
        const lectures = matRes.data.filter((m) => m.material_type === 'lecture').length
        const questions = qRes.count || 0
        setStats({ total, conversations, lectures, questions })
        setRecent(matRes.data.slice(0, 5))
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Listening</h2>
        <p className="text-slate-500 mt-1 text-sm">
          Manage TOEFL listening materials and run classroom sessions with TTS playback.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Materials', value: stats.total, icon: '📂', color: 'text-brand-600' },
          { label: 'Conversations', value: stats.conversations, icon: '💬', color: 'text-blue-600' },
          { label: 'Lectures', value: stats.lectures, icon: '🏛️', color: 'text-purple-600' },
          { label: 'Total Questions', value: stats.questions, icon: '❓', color: 'text-green-600' },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{s.icon}</span>
              <span className={`text-3xl font-bold ${s.color}`}>
                {loading ? '—' : s.value}
              </span>
            </div>
            <p className="text-sm text-slate-500 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`card p-5 flex items-start gap-4 border-2 hover:shadow-md transition-shadow ${link.color}`}
          >
            <span className="text-3xl mt-0.5">{link.icon}</span>
            <div>
              <p className="font-semibold">{link.label}</p>
              <p className="text-sm opacity-80 mt-0.5">{link.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* TOEFL Listening Format Guide */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900 mb-4">TOEFL Listening Format Reference</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="badge-conversation">Conversation</span>
              <span className="text-sm text-slate-500">2 per test · 5 questions each</span>
            </div>
            <ul className="space-y-1.5 text-sm text-slate-600">
              <li className="flex items-start gap-2"><span>•</span><span>Campus settings (office hours, student services, library, advising)</span></li>
              <li className="flex items-start gap-2"><span>•</span><span>2 speakers: student + staff/professor</span></li>
              <li className="flex items-start gap-2"><span>•</span><span>~3 minutes, 170–225 words</span></li>
              <li className="flex items-start gap-2"><span>•</span><span>Common types: Gist-Purpose, Detail, Attitude, Inference</span></li>
            </ul>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="badge-lecture">Lecture</span>
              <span className="text-sm text-slate-500">3–4 per test · 6 questions each</span>
            </div>
            <ul className="space-y-1.5 text-sm text-slate-600">
              <li className="flex items-start gap-2"><span>•</span><span>Academic subjects: Arts & Humanities, Life Sciences, Physical Sciences, Social Sciences</span></li>
              <li className="flex items-start gap-2"><span>•</span><span>1 professor, sometimes student participation</span></li>
              <li className="flex items-start gap-2"><span>•</span><span>~5 minutes, 400–550 words</span></li>
              <li className="flex items-start gap-2"><span>•</span><span>All 8 question types may appear</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Question Types</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(Q_TYPE_LABELS).map(([k, v]) => (
              <span key={k} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-full font-medium">
                {v}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Materials */}
      {recent.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Recent Materials</h3>
            <Link to="/dashboard/listening/materials" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {recent.map((m) => (
              <Link
                key={m.id}
                to={`/dashboard/listening/materials/${m.id}`}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <span className={m.material_type === 'conversation' ? 'badge-conversation' : 'badge-lecture'}>
                  {m.material_type === 'conversation' ? 'Conv' : 'Lecture'}
                </span>
                <span className="text-sm font-medium text-slate-700 group-hover:text-brand-600 flex-1">
                  {m.title}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(m.created_at).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
