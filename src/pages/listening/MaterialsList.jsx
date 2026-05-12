import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const CONV_SETTINGS = {
  office_hours: 'Office Hours',
  student_services: 'Student Services',
  library: 'Library',
  advising: 'Advising Center',
  housing: 'Housing Office',
  other: 'Other Campus',
}

const FIELDS = {
  arts_humanities: 'Arts & Humanities',
  life_sciences: 'Life Sciences',
  physical_sciences: 'Physical Sciences',
  social_sciences: 'Social Sciences',
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

export default function MaterialsList() {
  const navigate = useNavigate()
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [subFilter, setSubFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    fetchMaterials()
  }, [])

  async function fetchMaterials() {
    setLoading(true)
    const { data } = await supabase
      .from('listening_materials')
      .select(`
        id, title, material_type, subject, academic_field, conversation_setting,
        difficulty, estimated_duration, source_type, created_at,
        listening_questions(id)
      `)
      .order('created_at', { ascending: false })
    setMaterials(data || [])
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this material and all its questions?')) return
    setDeleting(id)
    await supabase.from('listening_materials').delete().eq('id', id)
    setMaterials((prev) => prev.filter((m) => m.id !== id))
    setDeleting(null)
  }

  const filtered = materials.filter((m) => {
    if (typeFilter !== 'all' && m.material_type !== typeFilter) return false
    if (subFilter !== 'all') {
      if (m.material_type === 'conversation' && m.conversation_setting !== subFilter) return false
      if (m.material_type === 'lecture' && m.academic_field !== subFilter) return false
    }
    if (search && !m.title.toLowerCase().includes(search.toLowerCase()) &&
        !m.subject?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function fmtDuration(secs) {
    if (!secs) return '—'
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Materials Library</h2>
          <p className="text-slate-500 text-sm mt-1">{materials.length} total materials</p>
        </div>
        <div className="flex gap-2">
          <Link to="/dashboard/listening/add" className="btn-secondary">➕ Add Manual</Link>
          <Link to="/dashboard/listening/generate" className="btn-primary">🤖 Generate AI</Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-4">
        <input
          className="input max-w-xs"
          placeholder="Search title or subject…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setSubFilter('all') }}
        />

        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {['all', 'conversation', 'lecture'].map((t) => (
            <button
              key={t}
              onClick={() => { setTypeFilter(t); setSubFilter('all') }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                typeFilter === t ? 'bg-white shadow text-brand-700' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'all' ? 'All' : t === 'conversation' ? '💬 Conversations' : '🏛️ Lectures'}
            </button>
          ))}
        </div>

        {typeFilter !== 'all' && (
          <select
            className="input max-w-[200px]"
            value={subFilter}
            onChange={(e) => setSubFilter(e.target.value)}
          >
            <option value="all">All {typeFilter === 'conversation' ? 'Settings' : 'Fields'}</option>
            {typeFilter === 'conversation'
              ? Object.entries(CONV_SETTINGS).map(([k, v]) => <option key={k} value={k}>{v}</option>)
              : Object.entries(FIELDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)
            }
          </select>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="card p-16 text-center text-slate-400">Loading materials…</div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <span className="text-4xl block mb-3">📭</span>
          <p className="text-slate-500 font-medium">No materials found</p>
          <p className="text-slate-400 text-sm mt-1">Try adjusting filters or add new material.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Title</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Difficulty</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Duration</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Questions</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Source</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((m) => {
                const category = m.material_type === 'conversation'
                  ? CONV_SETTINGS[m.conversation_setting] || '—'
                  : FIELDS[m.academic_field] || '—'
                return (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3">
                      <Link
                        to={`/dashboard/listening/materials/${m.id}`}
                        className="font-medium text-slate-800 hover:text-brand-600 transition-colors"
                      >
                        {m.title}
                      </Link>
                      {m.subject && <p className="text-xs text-slate-400 mt-0.5">{m.subject}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={m.material_type === 'conversation' ? 'badge-conversation' : 'badge-lecture'}>
                        {m.material_type === 'conversation' ? 'Conversation' : 'Lecture'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{category}</td>
                    <td className="px-4 py-3">
                      {m.difficulty && (
                        <span className={`badge-${m.difficulty}`}>{m.difficulty}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{fmtDuration(m.estimated_duration)}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {m.listening_questions?.length ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-400 capitalize">
                        {m.source_type?.replace('_', ' ') || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          to={`/dashboard/listening/classroom/${m.id}`}
                          className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors font-medium"
                        >
                          🖥️ Play
                        </Link>
                        <Link
                          to={`/dashboard/listening/materials/${m.id}`}
                          className="text-xs px-2 py-1 bg-brand-100 text-brand-700 rounded hover:bg-brand-200 transition-colors font-medium"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => handleDelete(m.id)}
                          disabled={deleting === m.id}
                          className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors font-medium disabled:opacity-50"
                        >
                          {deleting === m.id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
