// Optional planner features. Existing Task records remain compatible.
const PlannerExtras = (() => {
    function summary(tasks, today, now = new Date()) {
        const end = CalendarViews.shiftDay(today, 6);
        const pending = tasks.filter(t => PlannerRules.status(t.status) !== 'Completed');
        const completed = tasks.length - pending.length;
        return { total: tasks.length, completed, pending: pending.length,
            today: pending.filter(t => t.dueDate === today).length,
            week: pending.filter(t => t.dueDate >= today && t.dueDate <= end).length,
            overdue: pending.filter(t => PlannerRules.urgency(t, now) === 'overdue').length,
            percent: tasks.length ? Math.round(completed * 100 / tasks.length) : 0 };
    }
    function courseColor(course) {
        const colors = ['#501214', '#265c40', '#31536e', '#77510a', '#694a85', '#8d4030'];
        let hash = 0;
        for (const char of PlannerRules.normalize(course)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
        return colors[hash % colors.length];
    }
    function parseSubtasks(text, previous = []) {
        return [...new Set(String(text || '').split(/\r?\n/).map(t => t.trim()).filter(Boolean))].map(title => ({ title, done: previous.some(t => t.title === title && t.done) }));
    }
    function repeatTasks(task, count, makeKey) {
        return Array.from({ length: count }, (_, i) => ({ ...task, key: i ? makeKey() : task.key, dueDate: CalendarViews.shiftDay(task.dueDate, i * 7), subtasks: (task.subtasks || []).map(s => ({ ...s })) }));
    }
    // Store files as base64 so existing JSON backups include their contents.
    function validateAttachments(files = []) {
        if (!Array.isArray(files) || files.length > 5) throw Error('Choose up to five attachments per assignment.');
        return files.map(file => {
            if (!file || typeof file.name !== 'string' || !file.name.trim() || file.name.length > 255 ||
                typeof file.data !== 'string' || file.data.length > 1398104 ||
                file.data.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(file.data))
                throw Error('Invalid attachment.');
            const size = file.data.length * 3 / 4 - (file.data.endsWith('==') ? 2 : file.data.endsWith('=') ? 1 : 0);
            if (size > 1048576) throw Error('Attachments must be 1 MB or smaller.');
            return {name: file.name, data: file.data, size};
        });
    }
    function importRecords(data) {
        if (!Array.isArray(data)) throw Error('Expected an array of assignments.');
        if (data.length > 5000) throw Error('Too many assignments.');
        const keys = new Set();
        return data.map(t => {
            if (!t || typeof t !== 'object' || typeof t.key !== 'string' || !t.key || keys.has(t.key) || Object.keys(PlannerRules.validate(t)).length) throw Error('Invalid assignment or duplicate ID.');
            keys.add(t.key);
            const attachments = validateAttachments(t.attachments);
            return { key: t.key, title: PlannerRules.clean(t.title), course: PlannerRules.clean(t.course), category: PlannerRules.clean(t.category), status: PlannerRules.status(t.status), priority: PlannerRules.priority(t.priority), dueDate: t.dueDate, dueTime: t.dueTime, notes: PlannerRules.clean(t.notes), estimate: Number.isInteger(t.estimate) && t.estimate > 0 && t.estimate <= 10080 ? t.estimate : 0, subtasks: Array.isArray(t.subtasks) ? t.subtasks.filter(s => s && typeof s.title === 'string').map(s => ({ title: s.title, done: s.done === true })) : [], attachments };
        });
    }
    return { summary, courseColor, parseSubtasks, repeatTasks, importRecords, validateAttachments };
})();
if (typeof module !== 'undefined') module.exports = PlannerExtras;
