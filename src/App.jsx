import { useState, useCallback } from 'react'
import BillPage from './pages/BillPage'
import HistoryPage from './pages/HistoryPage'
import ItemsPage from './pages/ItemsPage'

const TABS = [
  { id: 'bill', label: '🧾 New Bill', icon: '🧾' },
  { id: 'items', label: '🧊 Items', icon: '🧊' },
  { id: 'history', label: '📋 History', icon: '📋' },
]

export default function App() {
  const [tab, setTab] = useState('bill')
  const [historyKey, setHistoryKey] = useState(0)

  const onBillSaved = useCallback(() => setHistoryKey(k => k + 1), [])

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Top bar */}
      <header className="no-print sticky top-0 z-50 bg-surface-dark/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">🍦</span>
          <div>
            <h1 className="text-base font-bold bg-gradient-to-r from-primary-light to-accent bg-clip-text text-transparent leading-tight">
              Ice Cream Billing
            </h1>
            <p className="text-[10px] text-gray-500 tracking-wide">OFFLINE BILLING APP</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5">
        {tab === 'bill' && <BillPage onSaved={onBillSaved} />}
        {tab === 'items' && <ItemsPage />}
        {tab === 'history' && <HistoryPage key={historyKey} />}
      </main>

      {/* Bottom tabs */}
      <nav className="no-print sticky bottom-0 z-50 bg-surface/90 backdrop-blur-xl border-t border-white/5">
        <div className="max-w-2xl mx-auto flex">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-xs font-medium transition-all ${tab === t.id
                  ? 'text-primary-light'
                  : 'text-gray-500 hover:text-gray-300'
                }`}
            >
              <span className={`text-lg transition-transform ${tab === t.id ? 'scale-110' : ''}`}>{t.icon}</span>
              <span>{t.label.split(' ').slice(1).join(' ')}</span>
              {tab === t.id && (
                <span className="w-5 h-0.5 bg-gradient-to-r from-primary to-accent rounded-full mt-0.5" />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
