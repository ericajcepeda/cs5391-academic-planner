// Calendar date helpers. Use local noon to avoid UTC date shifts.
const CalendarViews = (() => {
    function date(value) { return new Date(`${value}T12:00:00`); }
    function key(value) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; }
    function shiftDay(value, amount) {
        const result = date(value);
        result.setDate(result.getDate() + amount);
        return key(result);
    }
    function shiftMonth(value, amount) {
        const result = date(value);
        // Start at day 1 so January 31 cannot accidentally skip February.
        result.setDate(1);
        result.setMonth(result.getMonth() + amount);
        return key(result);
    }
    function monthDays(value) {
        const start = date(value);
        start.setDate(1);
        const first = key(start);
        const next = shiftMonth(first, 1);
        const total = date(shiftDay(next, -1)).getDate();
        const padding = start.getDay();
        return Array.from({ length: Math.ceil((padding + total) / 7) * 7 }, (_, i) => shiftDay(first, i - padding));
    }
    return { date, key, shiftDay, shiftMonth, monthDays };
})();
if (typeof module !== 'undefined') module.exports = CalendarViews;
