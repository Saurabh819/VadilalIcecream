import { useState, useEffect, useRef } from 'react'

export default function AddVendorModal({ open, onClose, onSaved }) {
    const [name, setName] = useState('')
    const [mobile, setMobile] = useState('')
    const inputRef = useRef(null)

    useEffect(() => {
        if (open) {
            setName('')
            setMobile('')
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [open])

    // Close on Escape
    useEffect(() => {
        if (!open) return
        const handler = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [open, onClose])

    function handleSubmit(e) {
        e.preventDefault()
        if (!name.trim()) return
        onSaved({ name: name.trim(), mobile: mobile.trim() })
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fadeIn">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-sm bg-surface rounded-2xl shadow-2xl shadow-black/40 border border-white/10 overflow-hidden">
                {/* Header */}
                <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-primary-light flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-lg">+</span>
                        Add Vendor
                    </h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition text-lg leading-none"
                        title="Close"
                    >
                        ×
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-3">
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">Vendor Name *</label>
                        <input
                            ref={inputRef}
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Enter vendor name"
                            required
                            className="w-full rounded-lg bg-surface-dark border border-white/10 px-4 py-2.5 text-sm placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">Mobile Number</label>
                        <input
                            value={mobile}
                            onChange={e => setMobile(e.target.value)}
                            placeholder="Optional"
                            className="w-full rounded-lg bg-surface-dark border border-white/10 px-4 py-2.5 text-sm placeholder-gray-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            type="submit"
                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-light text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/30 active:scale-95 transition-all"
                        >
                            ✓ Save
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl bg-surface-light text-gray-300 text-sm font-medium hover:bg-gray-600 active:scale-95 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
