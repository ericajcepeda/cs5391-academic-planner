// Sprint 3 integration: keep Lain's Task model, UUIDs, local storage, and
// rolling eight-week calendar. Connect Erica's validation and card UI.
// Design decision: keep the array of tasks under the existing "tasks" key.
// Each task has a unique key, so similar assignment titles can coexist.
const rules = PlannerRules;
const byId = id => document.getElementById(id);
const prevWeekButton = byId('prev-week');
const nextWeekButton = byId('next-week');
const calendarGrid = byId('calendar-grid');
const taskList = byId('task-list');
const weekTabs = document.querySelectorAll('.week-tab');
const form = byId('task-form');
const editor = byId('task-editor');
const search = byId('task-search');
const courseFilter = byId('course-filter');
const priorityFilter = byId('priority-filter');
const typeFilter = byId('type-filter');
const filterButtons = document.querySelectorAll('.filter');
let activeFilter = 'all';
let currentWeek = 0;
let calendarView = 'week';
let selectedDate = CalendarViews.key(new Date());
let editorTrigger = null;
let draftAttachments = [];
let editorVersion = 0;
let readingFiles = false;

// Keep attachment edits temporary until the assignment is saved.
function renderAttachments() {
    const list = byId('attached-files');
    list.replaceChildren();
    draftAttachments.forEach((file, index) => {
        const item = document.createElement('li');
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = 'Remove';
        remove.setAttribute('aria-label', 'Remove ' + file.name);
        remove.addEventListener('click', () => {
            draftAttachments.splice(index, 1);
            renderAttachments();
        });
        item.append(document.createTextNode(file.name + ' '), remove);
        list.append(item);
    });
}
byId('task-files').addEventListener('change', async event => {
    const files = Array.from(event.target.files);
    event.target.value = '';
    const version = editorVersion;
    const error = byId('file-error');
    error.textContent = '';
    if (readingFiles) return;
    if (draftAttachments.length + files.length > 5 || files.some(file => file.size > 1048576)) {
        error.textContent = 'Choose up to 5 files, each 1 MB or smaller.';
        return;
    }
    readingFiles = true;
    byId('save-task').disabled = true;
    byId('task-files').disabled = true;
    try {
        const additions = await Promise.all(files.map(file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({name: file.name, data: String(reader.result).split(',')[1]});
            reader.onerror = () => reject(Error('Could not read ' + file.name));
            reader.readAsDataURL(file);
        })));
        if (version === editorVersion) {
            draftAttachments = PlannerExtras.validateAttachments([...draftAttachments, ...additions]);
            renderAttachments();
        }
    } catch (err) {
        if (version === editorVersion) error.textContent = err.message;
    } finally {
        readingFiles = false;
        byId('save-task').disabled = false;
        byId('task-files').disabled = false;
    }
});

function downloadAttachment(file) {
    // Force a download, never execute or embed uploaded documents.
    const bytes = Uint8Array.from(atob(file.data), char => char.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], {type: 'application/octet-stream'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

class Task {
    constructor(key, title, course, category, status, priority, dueDate, dueTime, notes) {
        this.key = key;
        this.title = title;
        this.course = course;
        this.category = category;
        this.status = status;
        this.priority = priority;
        this.dueDate = dueDate;
        this.dueTime = dueTime;
        this.notes = notes;
    }
}

function initKey() { return crypto.randomUUID(); }

function announce(message) { byId('planner-message').textContent = message; }

function pullstoredlist() {
    try {
        const tasks = JSON.parse(localStorage.getItem('tasks'));
        return Array.isArray(tasks) ? tasks.filter(task => task && typeof task === 'object') : [];
    } catch (error) {
        announce('Saved assignments could not be read. Check your browser storage.');
        return [];
    }
}

function updateTasks(tasklist) {
    try {
        localStorage.setItem('tasks', JSON.stringify(tasklist));
    } catch (error) {
        announce('Unable to save assignments. Check your browser storage.');
        return false;
    }
    refreshPlanner();
    return true;
}

function addTask(taskObj) {
    const tasklist = pullstoredlist();
    tasklist.push(taskObj);
    return updateTasks(tasklist);
}

// FORM: show the existing field errors and keep invalid tasks out of storage.
const validationFields = { title: 'task-title', dueDate: 'task-due-date', dueTime: 'task-due-time' };
function showErrors(errors) {
    for (const [name, id] of Object.entries(validationFields)) {
        const field = byId(id);
        const message = byId(`${id}-error`);
        field.setAttribute('aria-invalid', String(Boolean(errors[name])));
        message.hidden = !errors[name];
        if (errors[name]) message.textContent = errors[name];
    }
    byId('task-form-error').hidden = Object.keys(errors).length === 0;
}

function clearEditor() {
    form.reset();
    editorVersion++;
    draftAttachments = [];
    byId('file-error').textContent = '';
    renderAttachments();
    byId('task-repeat').disabled = false;
    byId('task-id').value = '';
    byId('task-editor-title').textContent = 'Add assignment';
    showErrors({});
}

byId('add-task').addEventListener('click', () => {
    editorTrigger = byId('add-task');
    clearEditor();
});

function editTask(task, trigger) {
    editorTrigger = trigger;
    clearEditor();
    byId('task-editor-title').textContent = 'Edit assignment';
    byId('task-id').value = task.key;
    byId('task-title').value = task.title;
    byId('task-course').value = task.course || '';
    byId('task-type').value = rules.normalize(task.category);
    byId('task-priority').value = rules.normalize(task.priority) || 'medium';
    byId('task-due-date').value = task.dueDate;
    byId('task-due-time').value = task.dueTime || '23:59';
    byId('task-notes').value = task.notes || '';
    byId('task-estimate').value = task.estimate || '';
    byId('task-subtasks').value = (task.subtasks || []).map(s => s.title).join('\n');
    byId('task-repeat').disabled = true;
    draftAttachments = [...(task.attachments || [])];
    renderAttachments();
    editor.showPopover();
    byId('task-title').focus();
}

form.addEventListener('input', () => {
    if (!byId('task-form-error').hidden) showErrors(rules.validate(Object.fromEntries(new FormData(form))));
});

form.addEventListener('submit', event => {
    event.preventDefault();
    if (readingFiles) return;
    const data = Object.fromEntries(new FormData(form));
    if (!byId('task-estimate').validity.valid) {
        byId('task-estimate').reportValidity();
        return;
    }
    const errors = rules.validate(data);
    showErrors(errors);
    if (Object.keys(errors).length) {
        byId(validationFields[Object.keys(errors)[0]]).focus();
        return;
    }
    const tasks = pullstoredlist();
    const existing = tasks.find(task => task.key === data.taskId);
    if (data.taskId && !existing) {
        announce('This assignment no longer exists. Close the form and try again.');
        return;
    }
    const task = new Task(existing ? existing.key : initKey(), rules.clean(data.title),
        rules.clean(data.course), data.assignmentType, existing ? rules.status(existing.status) : 'Not Started',
        data.priority, data.dueDate, data.dueTime, rules.clean(data.notes));
    task.estimate = Number(data.estimate) || 0;
    task.subtasks = PlannerExtras.parseSubtasks(data.subtasks, existing?.subtasks);
    task.attachments = [...draftAttachments];
    const repeat = [2, 4, 8].includes(Number(data.repeat)) ? Number(data.repeat) : 1;
    const saved = existing ? updateTasks(tasks.map(item => item.key === task.key ? task : item)) : updateTasks([...tasks, ...PlannerExtras.repeatTasks(task, repeat, initKey)]);
    if (!saved) {
        byId('file-error').textContent = 'Could not save. Browser storage may be full; try removing attachments.';
        return;
    }
    editor.hidePopover();
    clearEditor();
    byId('add-task').focus();
    announce(existing ? 'Assignment updated.' : 'Assignment added.');
});

// FILTERS: always use saved tasks, and combine status, search and course.
function updateCourseOptions(tasks) {
    const selected = courseFilter.value;
    const courses = new Map();
    tasks.forEach(task => {
        const name = rules.clean(task.course);
        if (name && !courses.has(rules.normalize(name))) courses.set(rules.normalize(name), name);
    });
    courseFilter.replaceChildren(new Option('All courses', ''));
    [...courses.values()].sort((a, b) => a.localeCompare(b)).forEach(name => courseFilter.add(new Option(name, rules.normalize(name))));
    courseFilter.value = courses.has(selected) ? selected : '';
    const selectedType = typeFilter.value;
    const types = [...new Set(tasks.map(t => rules.normalize(t.category) || 'other'))].sort();
    typeFilter.replaceChildren(new Option('All types', ''));
    types.forEach(type => typeFilter.add(new Option(capitalize(type), type)));
    typeFilter.value = types.includes(selectedType) ? selectedType : '';
}

function renderFilteredTasks(tasks = pullstoredlist()) {
    const visible = rules.filterTasks(tasks, activeFilter, search.value, courseFilter.value, new Date(), priorityFilter.value).filter(t => !typeFilter.value || (rules.normalize(t.category) || 'other') === typeFilter.value);
    byId('task-count').textContent = tasks.length;
    byId('filter-summary').textContent = `Showing ${visible.length} of ${tasks.length} assignments`;
    displayTasks(visible);
}

filterButtons.forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach(item => {
        const selected = item === button;
        item.classList.toggle('active', selected);
        item.setAttribute('aria-pressed', String(selected));
    });
    renderFilteredTasks();
}));
search.addEventListener('input', () => renderFilteredTasks());
courseFilter.addEventListener('change', () => renderFilteredTasks());
priorityFilter.addEventListener('change', () => renderFilteredTasks());
typeFilter.addEventListener('change', () => renderFilteredTasks());

const urgencyLabels = { completed: 'Completed', overdue: 'Overdue', 'due-soon': 'Due within 48 hours', upcoming: 'Upcoming', unknown: 'Check deadline' };
function capitalize(value) { return value ? value.charAt(0).toUpperCase() + value.slice(1) : ''; }
function formatDeadline(task) {
    const due = rules.taskDeadline(task);
    return due ? due.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Invalid deadline';
}

function displayTasks(tasklist) {
    taskList.replaceChildren();
    if (!tasklist.length) {
        const empty = document.createElement('p');
        empty.className = 'planner-empty';
        empty.textContent = 'No assignments match this view. Try another filter or add an assignment.';
        taskList.append(empty);
    }
    for (const task of tasklist) {
        const card = document.createElement('article');
        card.className = 'task task-card';
        card.style.borderLeftColor = PlannerExtras.courseColor(task.course);
        const title = document.createElement('h3');
        title.textContent = task.title;
        card.append(title);
        const details = byId('task-details-template').content.cloneNode(true);
        details.querySelector('.task-course-label').textContent = task.course || 'No course specified';
        const type = details.querySelector('.task-type-chip');
        type.textContent = capitalize(rules.normalize(task.category)) || 'Other';
        type.hidden = false;
        const priority = details.querySelector('.task-priority-chip');
        const priorityName = rules.priority(task.priority);
        priority.textContent = `${capitalize(priorityName)} priority`;
        priority.classList.add(`priority-${priorityName}`);
        priority.hidden = false;
        const urgency = rules.urgency(task);
        const chip = details.querySelector('.task-urgency-chip');
        chip.textContent = urgencyLabels[urgency];
        chip.classList.add(`urgency-${urgency}`);
        chip.hidden = false;
        const time = details.querySelector('time');
        time.textContent = formatDeadline(task);
        if (rules.taskDeadline(task)) time.dateTime = `${task.dueDate}T${task.dueTime || '23:59'}`;
        card.append(details);
        if (task.estimate) {
            const estimate = document.createElement('p');
            estimate.className = 'task-estimate';
            estimate.textContent = `Estimated time: ${task.estimate} min`;
            card.append(estimate);
        }
        if (task.subtasks?.length) {
            const group = document.createElement('div');
            group.className = 'subtask-list';
            task.subtasks.forEach((subtask, index) => {
                const label = document.createElement('label');
                const check = document.createElement('input');
                check.type = 'checkbox';
                check.checked = subtask.done;
                check.addEventListener('change', () => {
                    const list = pullstoredlist();
                    const record = list.find(t => t.key === task.key);
                    if (record?.subtasks?.[index]) { record.subtasks[index].done = check.checked; updateTasks(list); }
                });
                label.append(check, document.createTextNode(subtask.title));
                group.append(label);
            });
            card.append(group);
        }
        if (task.attachments?.length) {
            const list = document.createElement('ul');
            list.className = 'attachment-list';
            task.attachments.forEach(file => {
                const item = document.createElement('li');
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = 'Download ' + file.name;
                button.addEventListener('click', () => downloadAttachment(file));
                item.append(button);
                list.append(item);
            });
            card.append(list);
        }
        if (task.notes) {
            const notes = document.createElement('p');
            notes.className = 'task-notes';
            notes.textContent = task.notes;
            card.append(notes);
        }
        const actions = byId('task-actions-template').content.cloneNode(true);
        const status = actions.querySelector('select');
        status.value = rules.status(task.status);
        status.setAttribute('aria-label', `Status for ${task.title}`);
        status.addEventListener('change', () => {
            const tasks = pullstoredlist();
            const item = tasks.find(item => item.key === task.key);
            if (!item) return;
            item.status = status.value;
            if (updateTasks(tasks)) {
                announce(`Status updated for ${task.title}.`);
                const replacement = [...taskList.querySelectorAll('select')].find(control => control.dataset.key === task.key);
                (replacement || byId(`${activeFilter}-filter`)).focus();
            }
        });
        status.dataset.key = task.key;
        const edit = actions.querySelector('[data-action="edit"]');
        edit.setAttribute('aria-label', `Edit ${task.title}`);
        edit.addEventListener('click', () => editTask(task, edit));
        const remove = actions.querySelector('[data-action="delete"]');
        remove.setAttribute('aria-label', `Delete ${task.title}`);
        remove.addEventListener('click', () => {
            if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
            if (updateTasks(pullstoredlist().filter(item => item.key !== task.key))) {
                announce('Assignment deleted.');
                byId('add-task').focus();
            }
        });
        card.append(actions);
        taskList.append(card);
    }
}

// CALENDAR: keep Lain's rolling eight weeks, starting with today's local date.
function dateOffset(days) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return rules.localDate(date);
}
function termDateOffset(days) {
    return byId('term-start').value ? CalendarViews.shiftDay(byId('term-start').value, days) : dateOffset(days);
}
function formatDate(dateString) {
    return new Date(`${dateString}T12:00:00`).toLocaleDateString('en-US', { dateStyle: 'medium' });
}
function displayWeekHeading(weekNo) {
    currentWeek = Math.max(0, Math.min(7, weekNo));
    if (calendarView !== 'week') {
        displayAlternateCalendar();
        return;
    }
    calendarGrid.classList.remove('month-view', 'day-view');
    prevWeekButton.setAttribute('aria-label', 'Previous week');
    nextWeekButton.setAttribute('aria-label', 'Next week');
    const start = termDateOffset(currentWeek * 7);
    const end = termDateOffset(currentWeek * 7 + 6);
    byId('week-heading').textContent = `Week ${currentWeek + 1} of 8`;
    byId('week-range').textContent = `${formatDate(start)} – ${formatDate(end)}`;
    prevWeekButton.disabled = currentWeek === 0;
    nextWeekButton.disabled = currentWeek === 7;
    weekTabs.forEach(tab => {
        const selected = Number(tab.dataset.week) === currentWeek;
        tab.classList.toggle('active', selected);
        if (selected) tab.setAttribute('aria-current', 'true');
        else tab.removeAttribute('aria-current');
    });
    displayCalendar();
}

weekTabs.forEach(tab => tab.addEventListener('click', () => displayWeekHeading(Number(tab.dataset.week))));
function navigateCalendar(amount) {
    if (calendarView === 'week') displayWeekHeading(currentWeek + amount);
    else {
        selectedDate = calendarView === 'month' ? CalendarViews.shiftMonth(selectedDate, amount) : CalendarViews.shiftDay(selectedDate, amount);
        displayAlternateCalendar();
    }
}
prevWeekButton.addEventListener('click', () => navigateCalendar(-1));
nextWeekButton.addEventListener('click', () => navigateCalendar(1));

function selectCalendarView(view) {
    if (calendarView === 'week' && view !== 'week') selectedDate = termDateOffset(currentWeek * 7);
    calendarView = view;
    byId('week-tabs').hidden = view !== 'week';
    document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
    displayWeekHeading(currentWeek);
}
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => selectCalendarView(button.dataset.view)));
byId('calendar-today').addEventListener('click', () => {
    selectedDate = CalendarViews.key(new Date());
    const index = Array.from({length: 56}, (_, i) => termDateOffset(i)).indexOf(selectedDate);
    currentWeek = index < 0 ? 0 : Math.floor(index / 7);
    if (calendarView === 'week' && index < 0) { calendarView = 'day'; selectCalendarView('day'); }
    displayWeekHeading(currentWeek);
});
function quickAdd(date) {
    clearEditor();
    byId('task-due-date').value = date;
    editorTrigger = document.activeElement;
    editor.showPopover();
    byId('task-title').focus();
}
function quickButton(date) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'quick-add'; button.textContent = '+ Add';
    button.setAttribute('aria-label', `Add assignment for ${date}`);
    button.addEventListener('click', () => quickAdd(date));
    return button;
}

function displayAlternateCalendar() {
    const date = CalendarViews.date(selectedDate);
    const tasks = rules.sortTasks(pullstoredlist());
    calendarGrid.replaceChildren();
    calendarGrid.classList.toggle('month-view', calendarView === 'month');
    calendarGrid.classList.toggle('day-view', calendarView === 'day');
    prevWeekButton.disabled = false;
    nextWeekButton.disabled = false;
    prevWeekButton.setAttribute('aria-label', `Previous ${calendarView}`);
    nextWeekButton.setAttribute('aria-label', `Next ${calendarView}`);
    if (calendarView === 'month') {
        byId('week-heading').textContent = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        byId('week-range').textContent = 'Select a date to view assignments';
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(name => {
            const label = document.createElement('div');
            label.className = 'month-weekday';
            label.textContent = name;
            calendarGrid.append(label);
        });
        CalendarViews.monthDays(selectedDate).forEach(key => {
            const day = CalendarViews.date(key);
            const count = tasks.filter(task => task.dueDate === key).length;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'month-date';
            button.classList.toggle('outside-month', day.getMonth() !== date.getMonth());
            button.classList.toggle('is-today', key === CalendarViews.key(new Date()));
            button.setAttribute('aria-label', `${day.toLocaleDateString('en-US', { dateStyle: 'full' })}, ${count} assignments`);
            button.textContent = day.getDate();
            if (count) {
                const badge = document.createElement('span');
                badge.className = 'month-count';
                badge.textContent = count;
                button.append(badge);
            }
            button.addEventListener('click', () => {
                selectedDate = key;
                selectCalendarView('day');
                byId('calendar-today').focus();
            });
            calendarGrid.append(button);
        });
    } else {
        byId('week-heading').textContent = date.toLocaleDateString('en-US', { weekday: 'long' });
        byId('week-range').textContent = formatDate(selectedDate);
        const body = document.createElement('div');
        body.className = 'day-body';
        body.append(quickButton(selectedDate));
        const due = tasks.filter(task => task.dueDate === selectedDate);
        if (!due.length) {
            const empty = document.createElement('p');
            empty.className = 'planner-empty';
            empty.textContent = 'No assignments due on this date.';
            body.append(empty);
        }
        due.forEach(task => {
            const entry = document.createElement('div');
            entry.className = `calendar-task calendar-${rules.urgency(task)}`;
            entry.style.borderLeftColor = PlannerExtras.courseColor(task.course);
            entry.textContent = `${task.title} · ${formatDeadline(task)} · ${rules.status(task.status)}`;
            body.append(entry);
        });
        calendarGrid.append(body);
    }
}

function displayCalendar() {
    calendarGrid.replaceChildren();
    const tasks = rules.sortTasks(pullstoredlist());
    for (let i = 0; i < 7; i++) {
        const dateString = termDateOffset(currentWeek * 7 + i);
        const date = new Date(`${dateString}T12:00:00`);
        const day = document.createElement('div');
        day.className = 'day';
        const heading = document.createElement('div');
        heading.className = 'day-heading';
        const weekday = document.createElement('strong');
        weekday.textContent = date.toLocaleDateString('en-US', { weekday: 'short' });
        heading.append(weekday, document.createTextNode(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })));
        const body = document.createElement('div');
        body.className = 'day-body';
        body.append(quickButton(dateString));
        tasks.filter(task => task.dueDate === dateString).forEach(task => {
            const entry = document.createElement('div');
            entry.className = `calendar-task calendar-${rules.urgency(task)}`;
            entry.style.borderLeftColor = PlannerExtras.courseColor(task.course);
            const due = rules.taskDeadline(task);
            entry.textContent = `${task.title}${due ? ' · ' + due.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}${rules.status(task.status) === 'Completed' ? ' · Done' : ''}`;
            body.append(entry);
        });
        day.append(heading, body);
        calendarGrid.append(day);
    }
}

function refreshPlanner() {
    const tasks = pullstoredlist();
    updateCourseOptions(tasks);
    const summary = PlannerExtras.summary(tasks, CalendarViews.key(new Date()));
    byId('progress-stats').replaceChildren();
    for (const [label, value] of Object.entries({ Total: summary.total, Completed: summary.completed, Pending: summary.pending, 'Due today': summary.today, 'Next 7 days': summary.week, Overdue: summary.overdue })) {
        const tile = document.createElement('div'); tile.className = 'progress-stat';
        const number = document.createElement('strong'); number.textContent = value;
        const text = document.createElement('span'); text.textContent = label;
        tile.append(number, text); byId('progress-stats').append(tile);
    }
    byId('completion-progress').value = summary.percent;
    byId('progress-percent').textContent = `${summary.percent}%`;
    renderFilteredTasks(tasks);
    displayWeekHeading(currentWeek);
}

byId('reset-button').addEventListener('click', () => {
    if (window.confirm('Reset the planner? All saved assignments will be removed.')) {
        if (updateTasks([])) announce('Planner reset.');
    }
});
// Store term preferences separately; reset only removes assignments.
try { byId('term-start').value = localStorage.getItem('plannerTermStart') || ''; } catch (error) { /* optional setting */ }
byId('term-start').addEventListener('change', () => {
    try { localStorage.setItem('plannerTermStart', byId('term-start').value); } catch (error) { announce('Term setting could not be saved.'); }
    currentWeek = 0; refreshPlanner();
});
byId('clear-term').addEventListener('click', () => {
    byId('term-start').value = ''; byId('term-start').dispatchEvent(new Event('change'));
});
byId('export-tasks').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(pullstoredlist(), null, 2)], {type:'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = 'academic-planner-backup.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
});
byId('import-tasks').addEventListener('click', () => byId('import-file').click());
byId('import-file').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
        if (file.size > 5000000) throw Error('File is too large.');
        const imported = PlannerExtras.importRecords(JSON.parse(await file.text()));
        if (confirm(`Import ${imported.length} assignments and replace your existing assignments?`)) updateTasks(imported);
    } catch (error) { announce(`Import failed: ${error.message}`); }
    finally { event.target.value = ''; }
});

byId('sample-button').addEventListener('click', () => {
    if (!window.confirm('Load sample data? This replaces any saved assignments.')) return;
    const samples = [
        new Task(initKey(), 'Calculus 2 Worksheet', 'Math', 'Other', 'Not Started', 'Medium', dateOffset(0), '23:59', 'Need to ask Mr. Park about #3'),
        new Task(initKey(), 'Shakespeare Powerpoint', 'English', 'Project', 'In Progress', 'Medium', dateOffset(2), '17:00', 'Mary Hata is available to work on Wed')
    ];
    if (updateTasks(samples)) announce('Sample assignments loaded.');
});

// Refresh on return to the tab so deadlines reflect the current local time.
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshPlanner();
});
editor.addEventListener('toggle', event => {
    if (event.newState === 'closed' && editorTrigger?.isConnected && document.activeElement === document.body) editorTrigger.focus();
});
refreshPlanner();
