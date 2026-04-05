import { useState, useEffect } from 'react'
import { getBills, getVendors } from '../utils/storage'

export default function HistoryPage() {
    const [bills, setBills] = useState([])
    const [vendors, setVendors] = useState([])
    const [filterVendor, setFilterVendor] = useState('')
    const [expandedId, setExpandedId] = useState(null)

    useEffect(() => {
        setBills(getBills())
        setVendors(getVendors())
    }, [])

    const filtered = filterVendor
        ? bills.filter(b => b.vendorId === filterVendor)
        : bills

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

    function handleWhatsApp(bill) {
        const text = encodeURIComponent(buildWhatsAppText(bill))
        const phone = bill.vendorMobile ? bill.vendorMobile.replace(/\D/g, '') : ''
        const url = phone
            ? `https://wa.me/${phone}?text=${text}`
            : `https://wa.me/?text=${text}`
        window.open(url, '_blank')
    }

    return (
        <div className="space-y-5 animate-fadeIn">
            {/* Filter */}
            <div className="flex items-center gap-3">
                <select
                    value={filterVendor}
                    onChange={e => setFilterVendor(e.target.value)}
                    className="flex-1 rounded-lg bg-surface border border-white/10 px-4 py-2.5 text-sm focus:border-primary outline-none transition"
                >
                    <option value="">All Vendors</option>
                    {vendors.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                </select>
                <span className="text-xs text-gray-500">{filtered.length} bill{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Bills List */}
            {filtered.length === 0 ? (
                <p className="text-center text-gray-500 py-12 text-sm">No bills found.</p>
            ) : (
                <div className="space-y-3">
                    {filtered.map(bill => (
                        <div
                            key={bill.id}
                            className="bg-surface rounded-2xl border border-white/5 overflow-hidden hover:border-primary/20 transition"
                        >
                            {/* Summary row */}
                            <button
                                onClick={() => setExpandedId(expandedId === bill.id ? null : bill.id)}
                                className="w-full px-5 py-4 flex items-center justify-between text-left"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs bg-primary/20 text-primary-light px-2 py-0.5 rounded-full font-mono">
                                            #{bill.billNumber}
                                        </span>
                                        <span className="text-xs text-gray-500">{bill.date}</span>
                                    </div>
                                    <p className="font-medium truncate">{bill.vendorName}</p>
                                </div>
                                <div className="text-right ml-4 shrink-0 space-y-0.5">
                                    <p className="font-bold text-primary-light">₹{bill.grandTotal}</p>
                                    <div className="flex gap-2 text-xs">
                                        <span className="text-success">Paid ₹{bill.paid}</span>
                                        {bill.due > 0 && <span className="text-danger">Due ₹{bill.due}</span>}
                                    </div>
                                </div>
                            </button>

                            {/* Expanded detail */}
                            {expandedId === bill.id && (
                                <div className="px-5 pb-4 border-t border-white/5 pt-3 space-y-3 animate-fadeIn">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="text-gray-500 uppercase tracking-wider">
                                                <th className="text-left pb-1">Item</th>
                                                <th className="text-center pb-1">Qty</th>
                                                <th className="text-right pb-1">Rate</th>
                                                <th className="text-right pb-1">Amt</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bill.items.map((item, i) => (
                                                <tr key={i} className="border-t border-white/5">
                                                    <td className="py-1">{item.description}</td>
                                                    <td className="py-1 text-center">{item.quantity}</td>
                                                    <td className="py-1 text-right">₹{item.rate}</td>
                                                    <td className="py-1 text-right font-medium">₹{item.amount}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    <div className="text-xs space-y-1 border-t border-white/5 pt-2">
                                        <div className="flex justify-between"><span className="text-gray-400">Subtotal</span><span>₹{bill.subtotal}</span></div>
                                        {bill.previousDue > 0 && (
                                            <div className="flex justify-between text-warning"><span>Previous Due</span><span>₹{bill.previousDue}</span></div>
                                        )}
                                        <div className="flex justify-between font-bold text-sm"><span>Grand Total</span><span className="text-primary-light">₹{bill.grandTotal}</span></div>
                                        <div className="flex justify-between text-success"><span>Paid</span><span>₹{bill.paid}</span></div>
                                        {bill.due > 0 && (
                                            <div className="flex justify-between text-danger font-semibold"><span>Due</span><span>₹{bill.due}</span></div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => handleWhatsApp(bill)}
                                        className="w-full py-2 rounded-lg bg-green-600/20 text-green-400 text-xs font-medium hover:bg-green-600/30 transition"
                                    >
                                        📲 Share on WhatsApp
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
