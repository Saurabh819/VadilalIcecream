const KEYS = {
    VENDORS: 'icebill_vendors',
    BILLS: 'icebill_bills',
    BILL_COUNTER: 'icebill_counter',
}

function read(key, fallback = []) {
    try {
        const raw = localStorage.getItem(key)
        return raw ? JSON.parse(raw) : fallback
    } catch {
        return fallback
    }
}

function write(key, data) {
    localStorage.setItem(key, JSON.stringify(data))
}

// ── Vendors ──────────────────────────
export function getVendors() {
    return read(KEYS.VENDORS, [])
}

export function saveVendors(vendors) {
    write(KEYS.VENDORS, vendors)
}

// ── Bills ────────────────────────────
export function getBills() {
    return read(KEYS.BILLS, [])
}

export function saveBills(bills) {
    write(KEYS.BILLS, bills)
}

export function addBill(bill) {
    const bills = getBills()
    bills.unshift(bill)
    saveBills(bills)
}

// ── Bill Counter ─────────────────────
export function getNextBillNumber() {
    const counter = parseInt(localStorage.getItem(KEYS.BILL_COUNTER) || '0', 10) + 1
    localStorage.setItem(KEYS.BILL_COUNTER, counter.toString())
    return counter
}

// ── Dues (derived from bills) ────────
export function getDueForVendor(vendorId) {
    const bills = getBills()
    const vendorBills = bills.filter(b => b.vendorId === vendorId)
    return vendorBills.reduce((sum, b) => sum + (b.due || 0), 0)
}
