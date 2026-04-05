import { useState, useEffect } from 'react'
import { getVendors, saveVendors } from '../utils/storage'

const emptyVendor = { name: '', mobile: '' }

export default function VendorsPage() {
    const [vendors, setVendors] = useState([])
    const [form, setForm] = useState({ ...emptyVendor })
    const [editId, setEditId] = useState(null)
    const [search, setSearch] = useState('')

    useEffect(() => setVendors(getVendors()), [])

    function persist(v) {
        setVendors(v)
        saveVendors(v)
    }

    function handleSubmit(e) {
        e.preventDefault()
        if (!form.name.trim()) return

        if (editId) {
            persist(vendors.map(v => (v.id === editId ? { ...v, ...form } : v)))
            setEditId(null)
        } else {
            persist([...vendors, { id: Date.now().toString(), ...form }])
        }
        setForm({ ...emptyVendor })
    }

    function startEdit(v) {
        setForm({ name: v.name, mobile: v.mobile })
        setEditId(v.id)
    }

    function handleDelete(id) {
        if (confirm('Delete this vendor?')) persist(vendors.filter(v => v.id !== id))
    }

    const filtered = vendors.filter(v =>
        v.name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Add / Edit Form */}
            <form
                onSubmit={handleSubmit}
                className="bg-surface rounded-2xl p-5 shadow-lg shadow-black/20 border border-white/5 space-y-4"
            >
                <h2 className="text-lg font-semibold text-primary-light flex items-center gap-2">
                    <span className="text-2xl">🏪</span>
                    {editId ? 'Edit Vendor' : 'Add Vendor'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                        className="w-full rounded-lg bg-surface-dark border border-white/10 px-4 py-2.5 text-sm placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                        placeholder="Vendor Name *"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        required
                    />
                    <input
                        className="w-full rounded-lg bg-surface-dark border border-white/10 px-4 py-2.5 text-sm placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                        placeholder="Mobile Number"
                        value={form.mobile}
                        onChange={e => setForm({ ...form, mobile: e.target.value })}
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        type="submit"
                        className="px-5 py-2 rounded-lg bg-gradient-to-r from-primary to-primary-light text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/30 active:scale-95 transition-all"
                    >
                        {editId ? '✓ Update' : '+ Add'}
                    </button>
                    {editId && (
                        <button
                            type="button"
                            onClick={() => { setEditId(null); setForm({ ...emptyVendor }) }}
                            className="px-5 py-2 rounded-lg bg-surface-light text-gray-300 text-sm hover:bg-gray-600 transition"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>

            {/* Search */}
            {vendors.length > 0 && (
                <input
                    className="w-full rounded-lg bg-surface border border-white/10 px-4 py-2.5 text-sm placeholder-gray-500 focus:border-primary outline-none transition"
                    placeholder="🔍  Search vendors…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            )}

            {/* List */}
            <div className="space-y-2">
                {filtered.map(v => (
                    <div
                        key={v.id}
                        className="flex items-center justify-between bg-surface rounded-xl px-4 py-3 border border-white/5 hover:border-primary/30 transition group"
                    >
                        <div>
                            <p className="font-medium">{v.name}</p>
                            {v.mobile && <p className="text-xs text-gray-400">{v.mobile}</p>}
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                            <button
                                onClick={() => startEdit(v)}
                                className="text-xs px-3 py-1 rounded-md bg-primary/20 text-primary-light hover:bg-primary/30 transition"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(v.id)}
                                className="text-xs px-3 py-1 rounded-md bg-danger/20 text-danger hover:bg-danger/30 transition"
                            >
                                Del
                            </button>
                        </div>
                    </div>
                ))}
                {vendors.length === 0 && (
                    <p className="text-center text-gray-500 py-8 text-sm">No vendors yet. Add one above ↑</p>
                )}
            </div>
        </div>
    )
}
