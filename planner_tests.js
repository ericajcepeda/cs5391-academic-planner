// Run with: node --test planner_tests.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const rules = require('./planner_validation.js');
const calendar = require('./calendar_views.js');
const now = new Date('2026-11-22T12:00:00');
global.PlannerRules = rules;
global.CalendarViews = calendar;
const extras = require('./planner_extras.js');
test('attachment backup retains file contents and reports decoded size', () => {
    const record = {key:'a',title:'Reading',dueDate:'2026-11-22',dueTime:'23:59',attachments:[{name:'reading.txt',data:'SGVsbG8='}]};
    assert.deepEqual(extras.importRecords([record])[0].attachments,[{name:'reading.txt',data:'SGVsbG8=',size:5}]);
});
test('attachment validation rejects invalid contents, oversized files and too many files', () => {
    assert.throws(() => extras.validateAttachments([{name:'bad',data:'<html>'}]));
    assert.throws(() => extras.validateAttachments([{name:'large',data:'A'.repeat(1398108)}]));
    assert.throws(() => extras.validateAttachments(Array(6).fill({name:'a',data:'YQ=='})));
});
test('progress counts completed and overdue work separately', () => {
    const result = extras.summary(tasks, '2026-11-22', now);
    assert.deepEqual(result, {total:4, completed:1, pending:3, today:3, week:3, overdue:1, percent:25});
});
test('course colors are stable regardless of capitalization', () => assert.equal(extras.courseColor('CS 5391'), extras.courseColor('cs 5391')));
test('subtasks keep completion and remove blank or duplicate lines', () => assert.deepEqual(extras.parseSubtasks('Read\nRead\n\nWrite', [{title:'Read',done:true}]), [{title:'Read',done:true},{title:'Write',done:false}]));
test('weekly repeats have independent IDs and checklists', () => {
    const records = extras.repeatTasks({key:'first',dueDate:'2026-12-28',subtasks:[{title:'Read',done:false}]}, 2, () => 'second');
    assert.equal(records[1].dueDate, '2027-01-04');
    assert.equal(records[1].key, 'second');
    assert.notEqual(records[0].subtasks[0],records[1].subtasks[0]);
});
test('backup import retains optional fields and rejects duplicate IDs', () => {
    const record = {key:'a', title:'Quiz', dueDate:'2026-11-22',dueTime:'23:59',estimate:45,subtasks:[{title:'Read',done:true}]};
    assert.equal(extras.importRecords([record])[0].estimate,45);
    assert.throws(() => extras.importRecords([record,record]));
});
test('month navigation works across short months and years', () => {
    assert.equal(calendar.shiftMonth('2026-01-31', 1), '2026-02-01');
    assert.equal(calendar.shiftMonth('2026-12-31', 1), '2027-01-01');
});
test('month grid includes every leap-year date and complete weeks', () => {
    const dates = calendar.monthDays('2028-02-15');
    assert.equal(dates.filter(day => day.startsWith('2028-02')).length, 29);
    assert.equal(dates.length % 7, 0);
});
test('day navigation crosses month and year boundaries', () => {
    assert.equal(calendar.shiftDay('2026-12-31', 1), '2027-01-01');
    assert.equal(calendar.shiftDay('2026-03-01', -1), '2026-02-28');
});
const task = (title, dueTime, status = 'Not Started', course = 'CS 5391') => ({ title, dueDate: '2026-11-22', dueTime, status, course });
const tasks = [task('Morning quiz', '09:00'), task('Evening project', '23:59'), task('Finished lab', '08:00', 'Complete'), task('Reading', '17:00', 'In Progress', 'English')];
test('past and future deadlines on the same day are different', () => {
    assert.equal(rules.urgency(tasks[0], now), 'overdue');
    assert.equal(rules.urgency(tasks[1], now), 'due-soon');
});
test('completed assignments are never overdue', () => assert.equal(rules.urgency(tasks[2], now), 'completed'));
test('four filters read the provided assignment list', () => {
    assert.equal(rules.filterTasks(tasks, 'all', '', '', now).length, 4);
    assert.deepEqual(rules.filterTasks(tasks, 'upcoming', '', '', now).map(t => t.title), ['Reading', 'Evening project']);
    assert.deepEqual(rules.filterTasks(tasks, 'overdue', '', '', now).map(t => t.title), ['Morning quiz']);
    assert.deepEqual(rules.filterTasks(tasks, 'completed', '', '', now).map(t => t.title), ['Finished lab']);
});
test('course and text search combine with status filters', () => assert.deepEqual(rules.filterTasks(tasks, 'upcoming', 'PROJECT', 'cs 5391', now).map(t => t.title), ['Evening project']));
test('invalid dates and times are rejected', () => {
    assert.equal(rules.deadline('2026-02-30', '12:00'), null);
    assert.equal(rules.deadline('2026-11-22', '24:00'), null);
    assert.ok(rules.deadline('2028-02-29', '23:59'));
});
test('validation rejects blank titles and missing dates and times', () => assert.deepEqual(Object.keys(rules.validate({ title: '  ', dueDate: '', dueTime: '' })), ['title', 'dueDate', 'dueTime']));
test('valid overdue assignments can be entered to track missed work', () => assert.deepEqual(rules.validate({ title: 'Missed quiz', dueDate: '2026-11-01', dueTime: '23:59' }), {}));
test('deadline ordering does not mutate the original list', () => {
    assert.equal(rules.sortTasks(tasks)[0].title, 'Finished lab');
    assert.equal(tasks[0].title, 'Morning quiz');
});
test('deadline equality is not overdue', () => assert.equal(rules.urgency(task('Due now', '12:00'), now), 'due-soon'));
test('priority filter handles all three levels and older records', () => {
    const records = [{ ...tasks[0], priority: 'HIGH' }, { ...tasks[1], priority: 'low' }, tasks[2]];
    assert.deepEqual(rules.filterTasks(records, 'all', '', '', now, 'high').map(t => t.title), ['Morning quiz']);
    assert.deepEqual(rules.filterTasks(records, 'all', '', '', now, 'low').map(t => t.title), ['Evening project']);
    assert.deepEqual(rules.filterTasks(records, 'all', '', '', now, 'medium').map(t => t.title), ['Finished lab']);
    assert.equal(rules.filterTasks(records, 'all', '', '', now, '').length, 3);
});
test('priority combines with course, search and completion filters', () => {
    const records = [{ ...tasks[1], priority: 'High' }, { ...tasks[2], priority: 'High' }, { ...tasks[3], priority: 'Low' }];
    assert.deepEqual(rules.filterTasks(records, 'upcoming', 'project', 'CS 5391', now, 'high').map(t => t.title), ['Evening project']);
    assert.equal(rules.filterTasks(records, 'upcoming', 'project', 'CS 5391', now, 'low').length, 0);
});
