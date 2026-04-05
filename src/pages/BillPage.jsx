import { useState, useEffect, useMemo } from 'react'
import products from '../data/products'
import { getVendors, saveVendors, addBill, getNextBillNumber, getDueForVendor } from '../utils/storage'
import AddVendorModal from '../components/AddVendorModal'

function emptyRow() {
    return { id: Date.now(), quantity: 1, productCode: '', description: '', rate: 0, amount: 0 }
}

function todayStr() {
    const d = new Date()
    return d.toISOString().slice(0, 10)
}

export default function BillPage({ onSaved }) {
    const [vendors, setVendors] = useState([])
    const [vendorId, setVendorId] = useState('')
    const [date, setDate] = useState(todayStr())
    const [rows, setRows] = useState([emptyRow()])
    const [paidAmount, setPaidAmount] = useState('')
    const [previousDue, setPreviousDue] = useState(0)
    const [saved, setSaved] = useState(false)
    const [savedBill, setSavedBill] = useState(null)
    const [showVendorModal, setShowVendorModal] = useState(false)

    function handleVendorAdded({ name, mobile }) {
        const newVendor = { id: Date.now().toString(), name, mobile }
        const updated = [...vendors, newVendor]
        saveVendors(updated)
        setVendors(updated)
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

    const total = useMemo(() => rows.reduce((s, r) => s + r.amount, 0), [rows])
    const grandTotal = total + previousDue
    const paid = parseFloat(paidAmount) || 0
    const due = Math.max(0, grandTotal - paid)

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

            row.amount = (parseFloat(row.quantity) || 0) * (parseFloat(row.rate) || 0)
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
            text += `${i + 1}. ${item.description}  ×${item.quantity}  @₹${item.rate}  = ₹${item.amount}\n`
        })
        text += `─────────────\n`
        text += `💰 Subtotal: ₹${bill.subtotal}\n`
        if (bill.previousDue > 0) text += `📌 Previous Due: ₹${bill.previousDue}\n`
        text += `🏷️ Grand Total: ₹${bill.grandTotal}\n`
        text += `✅ Paid: ₹${bill.paid}\n`
        if (bill.due > 0) text += `⚠️ Due: ₹${bill.due}\n`
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
                                        <td className="py-2 text-right">₹{item.rate}</td>
                                        <td className="py-2 text-right font-medium">₹{item.amount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="border-t border-white/10 pt-3 text-sm space-y-1">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Subtotal</span>
                            <span>₹{savedBill.subtotal}</span>
                        </div>
                        {savedBill.previousDue > 0 && (
                            <div className="flex justify-between text-warning">
                                <span>Previous Due</span>
                                <span>₹{savedBill.previousDue}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-base border-t border-white/10 pt-2 mt-2">
                            <span>Grand Total</span>
                            <span className="text-primary-light">₹{savedBill.grandTotal}</span>
                        </div>
                        <div className="flex justify-between text-success">
                            <span>Paid</span>
                            <span>₹{savedBill.paid}</span>
                        </div>
                        {savedBill.due > 0 && (
                            <div className="flex justify-between text-danger font-semibold">
                                <span>Due</span>
                                <span>₹{savedBill.due}</span>
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

                {/* Vendor + Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">Vendor *</label>
                        <div className="flex gap-2">
                            <select
                                value={vendorId}
                                onChange={e => setVendorId(e.target.value)}
                                className="flex-1 rounded-lg bg-surface-dark border border-white/10 px-4 py-2.5 text-sm focus:border-primary outline-none transition"
                            >
                                <option value="">Select Vendor</option>
                                {vendors.map(v => (
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
                            className="w-full rounded-lg bg-surface-dark border border-white/10 px-4 py-2.5 text-sm focus:border-primary outline-none transition"
                        />
                    </div>
                </div>

                {previousDue > 0 && (
                    <div className="bg-warning/10 border border-warning/30 rounded-lg px-4 py-2 text-sm text-warning">
                        ⚠️ Previous due for <strong>{vendor?.name}</strong>: <strong>₹{previousDue}</strong>
                    </div>
                )}
            </div>

            {/* Invoice Table */}
            <div className="bg-surface rounded-2xl p-5 shadow-lg shadow-black/20 border border-white/5 overflow-x-auto">
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
                                    <select
                                        value={row.productCode}
                                        onChange={e => updateRow(idx, { productCode: e.target.value })}
                                        className="w-full rounded-md bg-surface-dark border border-white/10 px-2 py-1.5 text-sm focus:border-primary outline-none transition"
                                    >
                                        <option value="">Select</option>
                                        {products.map(p => (
                                            <option key={p.productCode} value={p.productCode}>{p.productCode}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="py-2 pr-2 text-gray-300">{row.description || '—'}</td>
                                <td className="py-2 pr-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={row.rate}
                                        onChange={e => updateRow(idx, { rate: parseFloat(e.target.value) || 0 })}
                                        className="w-full rounded-md bg-surface-dark border border-white/10 px-2 py-1.5 text-sm text-right focus:border-primary outline-none transition"
                                    />
                                </td>
                                <td className="py-2 text-right font-medium text-primary-light">
                                    ₹{row.amount}
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

                <button
                    onClick={addRow}
                    className="mt-3 text-xs px-4 py-1.5 rounded-lg bg-primary/10 text-primary-light hover:bg-primary/20 transition"
                >
                    + Add Row
                </button>
            </div>

            {/* Totals & Payment */}
            <div className="bg-surface rounded-2xl p-5 shadow-lg shadow-black/20 border border-white/5 space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="font-medium">₹{total}</span>
                </div>
                {previousDue > 0 && (
                    <div className="flex justify-between text-sm text-warning">
                        <span>Previous Due</span>
                        <span>₹{previousDue}</span>
                    </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t border-white/10 pt-3">
                    <span>Grand Total</span>
                    <span className="text-primary-light">₹{grandTotal}</span>
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
                        <span>₹{due}</span>
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
            />
        </div>
    )
}
