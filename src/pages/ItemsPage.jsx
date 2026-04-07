import { useMemo, useState } from 'react'
import products from '../data/products'

export default function ItemsPage() {
    const [search, setSearch] = useState('')

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return products

        return products.filter(p =>
            p.productCode.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q)
        )
    }, [search])

    return (
        <div className="space-y-4 animate-fadeIn">
            <div className="bg-surface rounded-2xl p-5 shadow-lg shadow-black/20 border border-white/5 space-y-3">
                <h2 className="text-lg font-semibold text-primary-light flex items-center gap-2">
                    <span className="text-2xl">🧊</span>
                    Item List
                </h2>
                <p className="text-xs text-gray-400">
                    Search by product code or name. Use code in New Bill for quick selection.
                </p>
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search code or item name..."
                    className="w-full rounded-lg bg-surface-dark border border-white/10 px-4 py-2.5 text-sm placeholder-gray-500 focus:border-primary outline-none transition"
                />
            </div>

            <div className="space-y-2">
                {filtered.map(item => (
                    <div
                        key={item.productCode}
                        className="bg-surface rounded-xl border border-white/5 p-4 flex items-center justify-between gap-4"
                    >
                        <div className="min-w-0">
                            <p className="text-xs text-primary-light font-mono mb-1">{item.productCode}</p>
                            <p className="text-sm text-gray-100 break-words">{item.name}</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-200 shrink-0">₹{item.defaultRate.toFixed(2)}</p>
                    </div>
                ))}

                {filtered.length === 0 && (
                    <p className="text-center text-sm text-gray-500 py-8">No items found.</p>
                )}
            </div>
        </div>
    )
}
