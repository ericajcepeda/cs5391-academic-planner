// Shared rules for deadlines, form checks, and assignment filters.
// Dates and times are interpreted in the student's browser time zone.
const PlannerRules = (() => {
    const statuses = ['Not Started', 'In Progress', 'Completed'];
    const clean = value => String(value ?? '').trim();
    const normalize = value => clean(value).toLowerCase();
    // Older tasks may not have a priority. Match the card's Medium default.
    const priority = value => ['low', 'medium', 'high'].includes(normalize(value)) ? normalize(value) : 'medium';
    const status = value => ['complete', 'completed'].includes(normalize(value)) ? 'Completed' :
        normalize(value) === 'in progress' ? 'In Progress' : 'Not Started';
    const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    function deadline(date, time = '23:59') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
        const result = new Date(`${date}T${time}:00`);
        // Reject impossible dates and times instead of letting JS roll them over.
        if (!Number.isFinite(result.getTime()) || localDate(result) !== date ||
            result.getHours() !== Number(time.slice(0, 2)) || result.getMinutes() !== Number(time.slice(3))) return null;
        return result;
    }

    function validate(data) {
        const errors = {};
        if (!clean(data.title) || clean(data.title).length > 120) errors.title = 'Enter an assignment title (1–120 characters).';
        if (!deadline(data.dueDate, '12:00')) errors.dueDate = 'Select a valid due date.';
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.dueTime ?? '') ||
            (!errors.dueDate && !deadline(data.dueDate, data.dueTime))) errors.dueTime = 'Choose a valid local due time.';
        return errors;
    }

    function taskDeadline(task) { return deadline(task.dueDate, task.dueTime || '23:59'); }

    function urgency(task, now = new Date()) {
        if (status(task.status) === 'Completed') return 'completed';
        const due = taskDeadline(task);
        if (!due) return 'unknown';
        if (due < now) return 'overdue';
        if (due - now <= 48 * 60 * 60 * 1000) return 'due-soon';
        return 'upcoming';
    }

    function sortTasks(tasks) {
        return [...tasks].sort((a, b) => (taskDeadline(a)?.getTime() ?? Infinity) -
            (taskDeadline(b)?.getTime() ?? Infinity) || clean(a.title).localeCompare(clean(b.title)));
    }

    function filterTasks(tasks, filter = 'all', query = '', course = '', now = new Date(), selectedPriority = '') {
        return sortTasks(tasks.filter(task => {
            const state = urgency(task, now);
            if (filter === 'completed' && state !== 'completed') return false;
            if (filter === 'overdue' && state !== 'overdue') return false;
            if (filter === 'upcoming' && !['upcoming', 'due-soon'].includes(state)) return false;
            if (course && normalize(task.course) !== normalize(course)) return false;
            if (selectedPriority && priority(task.priority) !== normalize(selectedPriority)) return false;
            return [task.title, task.course, task.category, task.notes].some(value => normalize(value).includes(normalize(query)));
        }));
    }

    return { statuses, clean, normalize, priority, status, localDate, deadline, validate, taskDeadline, urgency, sortTasks, filterTasks };
})();

// Allows the same rules to be tested with Node without opening a browser.
if (typeof module !== 'undefined') module.exports = PlannerRules;
