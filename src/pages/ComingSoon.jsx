const COLOR_MAP = {
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', btn: 'bg-emerald-600', icon: '🎤' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   btn: 'bg-amber-600',   icon: '📖' },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',    btn: 'bg-rose-600',    icon: '✍️' },
}

const FEATURES = {
  Speaking: [
    'Independent Speaking Tasks (Questions 1)',
    'Integrated Speaking Tasks (Questions 2–4)',
    'AI-powered prompt generation',
    'Recording & playback for practice',
    'Sample response library',
  ],
  Reading: [
    'Academic reading passages',
    'All question types (factual, inference, vocabulary, etc.)',
    'Timed reading mode',
    'Passage annotation tools',
    'Performance analytics',
  ],
  Writing: [
    'Integrated Writing Task',
    'Academic Discussion Task',
    'Sample essay library with scores',
    'Rubric-based evaluation guide',
    'AI essay analysis',
  ],
}

export default function ComingSoon({ section, color = 'emerald' }) {
  const c = COLOR_MAP[color] || COLOR_MAP.emerald

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-lg w-full text-center">
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl ${c.bg} ${c.border} border-2 mb-6 text-4xl`}>
          {c.icon}
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {section} — Coming Soon
        </h2>
        <p className="text-slate-500 mb-8">
          The {section} component is under development. Here's what's planned:
        </p>

        <div className={`card p-6 text-left mb-6 ${c.bg} ${c.border}`}>
          <ul className="space-y-2.5">
            {(FEATURES[section] || []).map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <span className={`mt-0.5 ${c.text} font-bold`}>✓</span>
                <span className="text-slate-700">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-slate-400">
          Focus on Listening for now — the other sections will be added in future updates.
        </p>
      </div>
    </div>
  )
}
