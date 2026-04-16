import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import products from '../data/products'
import { getVendors, saveVendors, addBill, getNextBillNumber, getDueForVendor } from '../utils/storage'
import AddVendorModal from '../components/AddVendorModal'

const DEFAULT_CITIES = ['Fatehabad', 'Pinahat', 'Bah', 'Bhadrauli', 'Syahipura']

function emptyRow() {
    return { id: Date.now(), quantity: 1, productCode: '', description: '', rate: 0, amount: 0 }
}

function todayStr() {
    const d = new Date()
    return d.toISOString().slice(0, 10)
}

function round2(value) {
    return Math.round((Number(value) || 0) * 100) / 100
}

function formatMoney(value) {
    return round2(value).toFixed(2)
}

// ── Searchable product combo-box ─────────────────────────────────────────────
function ProductSelect({ value, onChange, placeholder = 'Search code or name…', className = '' }) {
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const wrapRef = useRef(null)
    const inputRef = useRef(null)

    const selected = products.find(p => p.productCode === value && p.productCode !== '')
    const displayText = selected ? `${selected.productCode} - ${selected.name}` : ''

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return products
        const isNumeric = /^\d+$/.test(q)
        return products.filter(p =>
            p.productCode.toLowerCase().startsWith(q) ||
            (!isNumeric && p.name.toLowerCase().includes(q))
        )
    }, [query])

    // Close on outside click
    useEffect(() => {
        function onPointerDown(e) {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('pointerdown', onPointerDown)
        return () => document.removeEventListener('pointerdown', onPointerDown)
    }, [])

    function handleFocus() {
        setQuery('')
        setOpen(true)
    }

    function handleSelect(code) {
        onChange(code)
        setQuery('')
        setOpen(false)
    }

    return (
        <div ref={wrapRef} className={`relative ${className}`}>
            <input
                ref={inputRef}
                type="text"
                value={open ? query : displayText}
                onChange={e => { setQuery(e.target.value); setOpen(true) }}
                onFocus={handleFocus}
                placeholder={placeholder}
                autoComplete="off"
                className="w-full rounded-md bg-surface-dark border border-white/10 px-3 py-2 text-sm focus:border-primary outline-none transition placeholder-gray-500"
            />
            {open && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-md bg-[#1e2235] border border-white/10 shadow-2xl">
                    {filtered.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-gray-500">No products found</p>
                    ) : filtered.map((p, i) => (
                        <div
                            key={p.productCode || p.name + i}
                            onPointerDown={e => { e.preventDefault(); handleSelect(p.productCode) }}
                            className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                                p.productCode === value
                                    ? 'bg-primary/30 text-white'
                                    : 'hover:bg-primary/15 text-gray-200'
                            }`}
                        >
                            {p.productCode
                                ? <><span className="text-primary-light font-mono mr-2">{p.productCode}</span>{p.name}</>
                                : <span className="text-gray-400">{p.name}</span>
                            }
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
// ─────────────────────────────────────────────────────────────────────────────

export default function BillPage({ onSaved }) {
    const [vendors, setVendors] = useState([])
    const [city, setCity] = useState('')
    const [vendorId, setVendorId] = useState('')
    const [date, setDate] = useState(todayStr())
    const [rows, setRows] = useState([emptyRow()])
    const [paidAmount, setPaidAmount] = useState('')
    const [previousDue, setPreviousDue] = useState(0)
    const [saved, setSaved] = useState(false)
    const [savedBill, setSavedBill] = useState(null)
    const [showVendorModal, setShowVendorModal] = useState(false)
    const dateInputRef = useRef(null)

    function handleVendorAdded({ name, mobile, city: vendorCity }) {
        const newVendor = { id: Date.now().toString(), name, mobile, city: vendorCity }
        const updated = [...vendors, newVendor]
        saveVendors(updated)
        setVendors(updated)
        setCity(vendorCity)
        setVendorId(newVendor.id)
        setShowVendorModal(false)
    }

    useEffect(() => setVendors(getVendors()), [])

    useEffect(() => {
        if (vendorId) {
            setPreviousDue(getDueForVendor(vendorId))
        } else {
            setPreviousDue(0)
        }
    }, [vendorId])

    const cityOptions = useMemo(() => {
        const unique = new Set([
            ...DEFAULT_CITIES,
            ...vendors
                .map(v => (v.city || '').trim())
                .filter(Boolean),
        ])
        return Array.from(unique).sort((a, b) => a.localeCompare(b))
    }, [vendors])

    const cityVendors = useMemo(
        () => vendors.filter(v => (v.city || '').trim().toLowerCase() === city.toLowerCase()),
        [vendors, city]
    )

    const total = useMemo(() => round2(rows.reduce((s, r) => s + r.amount, 0)), [rows])
    const totalQty = useMemo(() => rows.reduce((s, r) => s + (parseFloat(r.quantity) || 0), 0), [rows])
    const grandTotal = round2(total + previousDue)
    const paid = round2(parseFloat(paidAmount) || 0)
    const due = round2(Math.max(0, grandTotal - paid))

    function updateRow(idx, patch) {
        setRows(prev => {
            const next = [...prev]
            const row = { ...next[idx], ...patch }

            // Auto-fill when product code changes
            if (patch.productCode !== undefined) {
                const p = products.find(p => p.productCode === patch.productCode)
                if (p) {
                    row.description = p.name
                    row.rate = p.defaultRate
                }
            }

            row.amount = round2((parseFloat(row.quantity) || 0) * (parseFloat(row.rate) || 0))
            next[idx] = row
            return next
        })
    }

    function addRow() {
        setRows(prev => [...prev, emptyRow()])
    }

    function removeRow(idx) {
        if (rows.length === 1) return
        setRows(prev => prev.filter((_, i) => i !== idx))
    }

    function handleSave() {
        if (!city) return alert('Please select a city')
        if (!vendorId) return alert('Please select a vendor')
        if (rows.every(r => !r.productCode)) return alert('Please add at least one item')

        const vendor = vendors.find(v => v.id === vendorId)
        const billNumber = getNextBillNumber()

        const bill = {
            id: Date.now().toString(),
            billNumber,
            date,
            vendorId,
            vendorName: vendor?.name || '',
            vendorMobile: vendor?.mobile || '',
            vendorCity: vendor?.city || city,
            items: rows.filter(r => r.productCode),
            subtotal: total,
            previousDue,
            grandTotal,
            paid,
            due,
        }

        addBill(bill)
        setSavedBill(bill)
        setSaved(true)
        if (onSaved) onSaved()
    }

    function handleNew() {
        setSaved(false)
        setSavedBill(null)
        setCity('')
        setVendorId('')
        setDate(todayStr())
        setRows([emptyRow()])
        setPaidAmount('')
        setPreviousDue(0)
        setVendors(getVendors())
    }

    function buildWhatsAppText(bill) {
        let text = `🧾 *INVOICE #${bill.billNumber}*\n`
        text += `📅 Date: ${bill.date}\n`
        text += `👤 Vendor: ${bill.vendorName}\n`
        text += `─────────────\n`
        bill.items.forEach((item, i) => {
            text += `${i + 1}. ${item.description}  ×${item.quantity}  @₹${formatMoney(item.rate)}  = ₹${formatMoney(item.amount)}\n`
        })
        text += `─────────────\n`
        text += `💰 Subtotal: ₹${formatMoney(bill.subtotal)}\n`
        if (bill.previousDue > 0) text += `📌 Previous Due: ₹${formatMoney(bill.previousDue)}\n`
        text += `🏷️ Grand Total: ₹${formatMoney(bill.grandTotal)}\n`
        text += `✅ Paid: ₹${formatMoney(bill.paid)}\n`
        if (bill.due > 0) text += `⚠️ Due: ₹${formatMoney(bill.due)}\n`
        return text
    }

    function handleWhatsApp() {
        if (!savedBill) return
        const vendor = vendors.find(v => v.id === savedBill.vendorId)
        const text = encodeURIComponent(buildWhatsAppText(savedBill))
        const phone = vendor?.mobile ? vendor.mobile.replace(/\D/g, '') : ''
        const url = phone
            ? `https://wa.me/${phone}?text=${text}`
            : `https://wa.me/?text=${text}`
        window.open(url, '_blank')
    }

    function handlePrint() {
        window.print()
    }

    function openDatePicker() {
        if (dateInputRef.current && typeof dateInputRef.current.showPicker === 'function') {
            dateInputRef.current.showPicker()
        }
    }

    const vendor = vendors.find(v => v.id === vendorId)

    if (saved && savedBill) {
        return (
            <div className="animate-fadeIn">
                {/* Success banner */}
                <div className="bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 mb-6 text-center">
                    <p className="text-3xl mb-1">✅</p>
                    <p className="text-emerald-300 font-semibold text-lg">Bill #{savedBill.billNumber} Saved!</p>
                </div>

                {/* Saved Bill Preview */}
                <div className="print-bill bg-surface rounded-2xl p-6 shadow-lg shadow-black/20 border border-white/5 space-y-4 mb-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-bold text-primary-light">🍦 Ice Cream Bill</h2>
                            <p className="text-xs text-gray-400 mt-1">Invoice #{savedBill.billNumber}</p>
                        </div>
                        <div className="text-right text-sm text-gray-400">
                            <p>{savedBill.date}</p>
                        </div>
                    </div>

                    <div className="text-sm">
                        <p><span className="text-gray-400">Vendor:</span> {savedBill.vendorName}</p>
                        {savedBill.vendorMobile && <p><span className="text-gray-400">Mobile:</span> {savedBill.vendorMobile}</p>}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
                                    <th className="py-2 text-left">#</th>
                                    <th className="py-2 text-left">Item</th>
                                    <th className="py-2 text-center">Qty</th>
                                    <th className="py-2 text-right">Rate</th>
                                    <th className="py-2 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {savedBill.items.map((item, i) => (
                                    <tr key={i} className="border-b border-white/5">
                                        <td className="py-2 text-gray-500">{i + 1}</td>
                                        <td className="py-2">{item.description}</td>
                                        <td className="py-2 text-center">{item.quantity}</td>
                                        <td className="py-2 text-right">₹{formatMoney(item.rate)}</td>
                                        <td className="py-2 text-right font-medium">₹{formatMoney(item.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="border-t border-white/10 pt-3 text-sm space-y-1">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Subtotal</span>
                            <span>₹{formatMoney(savedBill.subtotal)}</span>
                        </div>
                        {savedBill.previousDue > 0 && (
                            <div className="flex justify-between text-warning">
                                <span>Previous Due</span>
                                <span>₹{formatMoney(savedBill.previousDue)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-base border-t border-white/10 pt-2 mt-2">
                            <span>Grand Total</span>
                            <span className="text-primary-light">₹{formatMoney(savedBill.grandTotal)}</span>
                        </div>
                        <div className="flex justify-between text-success">
                            <span>Paid</span>
                            <span>₹{formatMoney(savedBill.paid)}</span>
                        </div>
                        {savedBill.due > 0 && (
                            <div className="flex justify-between text-danger font-semibold">
                                <span>Due</span>
                                <span>₹{formatMoney(savedBill.due)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 no-print">
                    <button
                        onClick={handleNew}
                        className="flex-1 min-w-[120px] py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-light text-white text-sm font-medium hover:shadow-lg hover:shadow-primary/30 active:scale-95 transition-all"
                    >
                        + New Bill
                    </button>
                    <button
                        onClick={handleWhatsApp}
                        className="flex-1 min-w-[120px] py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-green-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-green-500/30 active:scale-95 transition-all"
                    >
                        📲 WhatsApp
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex-1 min-w-[120px] py-2.5 rounded-xl bg-surface-light text-gray-200 text-sm font-medium hover:bg-gray-600 active:scale-95 transition-all"
                    >
                        🖨️ Print / PDF
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-5 animate-fadeIn">
            {/* Header */}
            <div className="bg-surface rounded-2xl p-5 shadow-lg shadow-black/20 border border-white/5 space-y-4">
                <h2 className="text-lg font-semibold text-primary-light flex items-center gap-2">
                    <span className="text-2xl">🧾</span> New Bill
                </h2>

                {/* City + Vendor + Date */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">City *</label>
                        <select
                            value={city}
                            onChange={e => {
                                setCity(e.target.value)
                                setVendorId('')
                            }}
                            className="w-full rounded-lg bg-surface-dark border border-white/10 px-4 py-2.5 text-sm focus:border-primary outline-none transition"
                        >
                            <option value="">Select City</option>
                            {cityOptions.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">Vendor *</label>
                        <div className="flex gap-2">
                            <select
                                value={vendorId}
                                onChange={e => setVendorId(e.target.value)}
                                disabled={!city}
                                className="flex-1 rounded-lg bg-surface-dark border border-white/10 px-4 py-2.5 text-sm focus:border-primary outline-none transition"
                            >
                                <option value="">{city ? 'Select Vendor' : 'Select City First'}</option>
                                {cityVendors.map(v => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => setShowVendorModal(true)}
                                title="Add Vendor"
                                className="shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-light text-white text-xl font-bold flex items-center justify-center hover:shadow-lg hover:shadow-primary/30 active:scale-90 transition-all"
                            >
                                +
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            onClick={openDatePicker}
                            onFocus={openDatePicker}
                            ref={dateInputRef}
                            className="w-full rounded-lg bg-surface-dark border border-white/10 px-4 py-2.5 text-sm focus:border-primary outline-none transition"
                        />
                    </div>
                </div>

                {previousDue > 0 && (
                    <div className="bg-warning/10 border border-warning/30 rounded-lg px-4 py-2 text-sm text-warning">
                        ⚠️ Previous due for <strong>{vendor?.name}</strong>: <strong>₹{formatMoney(previousDue)}</strong>
                    </div>
                )}
            </div>

            {/* Invoice Items */}
            <div className="bg-surface rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/20 border border-white/5">
                <div className="md:hidden space-y-3">
                    {rows.map((row, idx) => (
                        <div key={row.id} className="rounded-xl border border-white/10 bg-surface-dark/50 p-3 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-xs text-gray-400">Item {idx + 1}</p>
                                {rows.length > 1 && (
                                    <button
                                        onClick={() => removeRow(idx)}
                                        className="text-danger/70 hover:text-danger text-sm transition"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>

                            <div>
                                <label className="text-[11px] text-gray-400 mb-1 block">Product</label>
                                <ProductSelect
                                    value={row.productCode}
                                    onChange={code => updateRow(idx, { productCode: code })}
                                />
                            </div>

                            <div className="text-xs text-gray-300 min-h-4">
                                {row.description || 'Description will appear here'}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[11px] text-gray-400 mb-1 block">Qty</label>
                                    <div className="flex items-center rounded-md overflow-hidden border border-white/10 bg-surface-dark">
                                        <button
                                            type="button"
                                            onClick={() => updateRow(idx, { quantity: Math.max(1, (parseInt(row.quantity) || 1) - 1) })}
                                            className="w-10 h-10 flex items-center justify-center text-xl font-bold text-primary-light bg-white/5 hover:bg-primary/20 active:bg-primary/40 transition-colors select-none"
                                        >−</button>
                                        <input
                                            type="number"
                                            min="1"
                                            value={row.quantity}
                                            onChange={e => updateRow(idx, { quantity: parseInt(e.target.value) || 1 })}
                                            className="flex-1 min-w-0 bg-transparent py-2 text-sm text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => updateRow(idx, { quantity: (parseInt(row.quantity) || 0) + 1 })}
                                            className="w-10 h-10 flex items-center justify-center text-xl font-bold text-primary-light bg-white/5 hover:bg-primary/20 active:bg-primary/40 transition-colors select-none"
                                        >+</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[11px] text-gray-400 mb-1 block">Rate (Rs)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={row.rate}
                                        onChange={e => updateRow(idx, { rate: parseFloat(e.target.value) || 0 })}
                                        className="w-full rounded-md bg-surface-dark border border-white/10 px-3 py-2 text-sm text-right focus:border-primary outline-none transition"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between text-sm border-t border-white/10 pt-2">
                                <span className="text-gray-400">Amount</span>
                                <span className="font-semibold text-primary-light">Rs {formatMoney(row.amount)}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                    <thead>
                        <tr className="border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
                            <th className="py-2 text-left w-16">Qty</th>
                            <th className="py-2 text-left w-36">Product</th>
                            <th className="py-2 text-left">Description</th>
                            <th className="py-2 text-right w-24">Rate (₹)</th>
                            <th className="py-2 text-right w-24">Amount</th>
                            <th className="py-2 w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => (
                            <tr key={row.id} className="border-b border-white/5 group">
                                <td className="py-2 pr-2">
                                    <input
                                        type="number"
                                        min="1"
                                        value={row.quantity}
                                        onChange={e => updateRow(idx, { quantity: parseInt(e.target.value) || 0 })}
                                        className="w-full rounded-md bg-surface-dark border border-white/10 px-2 py-1.5 text-sm text-center focus:border-primary outline-none transition"
                                    />
                                </td>
                                <td className="py-2 pr-2">
                                    <ProductSelect
                                        value={row.productCode}
                                        onChange={code => updateRow(idx, { productCode: code })}
                                        placeholder="Search…"
                                    />
                                </td>
                                <td className="py-2 pr-2 text-gray-300">{row.description || '—'}</td>
                                <td className="py-2 pr-2">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={row.rate}
                                        onChange={e => updateRow(idx, { rate: parseFloat(e.target.value) || 0 })}
                                        className="w-full rounded-md bg-surface-dark border border-white/10 px-2 py-1.5 text-sm text-right focus:border-primary outline-none transition"
                                    />
                                </td>
                                <td className="py-2 text-right font-medium text-primary-light">
                                    ₹{formatMoney(row.amount)}
                                </td>
                                <td className="py-2 text-center">
                                    {rows.length > 1 && (
                                        <button
                                            onClick={() => removeRow(idx)}
                                            className="text-danger/50 hover:text-danger text-lg leading-none transition"
                                        >×</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    </table>
                </div>

                <button
                    onClick={addRow}
                    className="mt-3 text-xs sm:text-sm px-4 py-2 rounded-lg bg-primary/10 text-primary-light hover:bg-primary/20 transition"
                >
                    + Add Row
                </button>
            </div>

            {/* Totals & Payment */}
            <div className="bg-surface rounded-2xl p-5 shadow-lg shadow-black/20 border border-white/5 space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total Quantity</span>
                    <span className="font-medium">{totalQty}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="font-medium">₹{formatMoney(total)}</span>
                </div>
                {previousDue > 0 && (
                    <div className="flex justify-between text-sm text-warning">
                        <span>Previous Due</span>
                        <span>₹{formatMoney(previousDue)}</span>
                    </div>
                )}
                <div className="flex justify-between text-2xl font-bold border-t border-white/10 pt-3">
                    <span>Grand Total</span>
                    <span className="text-primary-light">₹{formatMoney(grandTotal)}</span>
                </div>

                <div>
                    <label className="text-xs text-gray-400 mb-1 block">Paid Amount (₹)</label>
                    <input
                        type="number"
                        min="0"
                        value={paidAmount}
                        onChange={e => setPaidAmount(e.target.value)}
                        placeholder="0"
                        className="w-full rounded-lg bg-surface-dark border border-white/10 px-4 py-2.5 text-sm focus:border-primary outline-none transition"
                    />
                </div>

                {paid > 0 && due > 0 && (
                    <div className="flex justify-between text-sm text-danger font-semibold">
                        <span>Remaining Due</span>
                        <span>₹{formatMoney(due)}</span>
                    </div>
                )}

                <button
                    onClick={handleSave}
                    className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-semibold hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all text-sm"
                >
                    💾 Save Bill
                </button>
            </div>

            {/* Add Vendor Modal */}
            <AddVendorModal
                open={showVendorModal}
                onClose={() => setShowVendorModal(false)}
                onSaved={handleVendorAdded}
                defaultCity={city}
            />
        </div>
    )
}
