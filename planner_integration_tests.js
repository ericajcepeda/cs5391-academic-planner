// Quick integration checks without a browser. The DOM stub checks script loading,
// storage, calendar refresh, and event wiring; it is not a visual browser test.
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
class Element {
    constructor() {
        this.children = []; this.listeners = {}; this.dataset = {};
        this.value = ''; this.style = {}; this.hidden = false;
        this.classList = {add(){}, remove(){}, toggle(){}};
        this.validity = {valid:true};
    }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    fire(type) { for (const fn of this.listeners[type] || []) fn({target:this, preventDefault(){}}); }
    setAttribute() {} removeAttribute() {} focus() {}
    append(...children) { this.children.push(...children); }
    appendChild(child) { this.append(child); return child; }
    replaceChildren(...children) { this.children = children; }
    replaceWith() {}
    add(child) { this.append(child); }
    set innerHTML(value) { this.children = []; this.textContent = value; }
    querySelector() { return new Element(); }
    querySelectorAll() { return []; }
    get content() { return {cloneNode: () => new Element()}; }
}
const ids = new Map();
const byId = id => { if (!ids.has(id)) ids.set(id, new Element()); return ids.get(id); };
const tabs = Array.from({length:8}, (_, i) => { const e = new Element(); e.dataset.week = String(i); return e; });
const filters = ['all','completed','upcoming','overdue'].map(name => byId(name+'-filter'));
const document = {
    getElementById: byId, createElement: () => new Element(),
    createTextNode: text => text, addEventListener(){},
    querySelectorAll: selector => selector === '.week-tab' ? tabs : selector === '.filter' ? filters : [],
};
const storage = new Map();
const sandbox = vm.createContext({document, console, crypto:{randomUUID},
    localStorage:{getItem:key=>storage.get(key) ?? null,setItem:(key,value)=>storage.set(key,value)},
    Option: class {constructor(text,value){this.text=text;this.value=value;}},
    confirm:()=>true, Date, setTimeout, window:{confirm:()=>true}
});
for (const name of ['planner_validation.js','calendar_views.js','planner_extras.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname,name),'utf8'),sandbox,{filename:name});
}
async function main() {
const backend = new vm.SourceTextModule(fs.readFileSync(path.join(__dirname, 'lain_planner_logic.js'), 'utf8'), {context:sandbox});
const app = new vm.SourceTextModule(fs.readFileSync(path.join(__dirname, 'planner_logic.js'), 'utf8'), {context:sandbox});
await app.link(specifier => { assert.equal(specifier, './lain_planner_logic.js'); return backend; });
await app.evaluate();
const api = backend.namespace;
const { selectCalendarView } = app.namespace;
const run = code => vm.runInContext(code, sandbox);
Object.assign(sandbox, {Task:api.Task, initKey:api.initKey, addTask:api.addTask, pullstoredlist:api.pullstoredlist, find_start_date:api.find_start_date, selectCalendarView});
assert.equal(byId('week-heading').textContent, 'Week 1 of 8');
assert.equal(byId('calendar-grid').children.length, 7);
byId('sample-button').fire('click');
assert.equal(run('pullstoredlist().length'), 2);
assert.equal(byId('task-list').children.length, 2);
tabs[7].fire('click');
assert.equal(byId('week-heading').textContent, 'Week 8 of 8');
assert.equal(byId('next-week').disabled, true);
run('addTask(new Task(initKey(), "Test", "CS", "Other", "Not Started", "Medium", find_start_date(1), "23:59", ""))');
assert.equal(run('pullstoredlist().length'), 3);
assert.equal(byId('week-heading').textContent, 'Week 8 of 8');
byId('completed-filter').fire('click');
assert.equal(byId('filter-summary').textContent, 'Showing 0 of 3 assignments');
byId('all-filter').fire('click');
assert.equal(byId('filter-summary').textContent, 'Showing 3 of 3 assignments');
run('selectCalendarView("month")');
assert.ok(byId('calendar-grid').children.length >= 35);
run('selectCalendarView("day")');
assert.equal(byId('calendar-grid').children.length, 1);
byId('reset-button').fire('click');
assert.equal(run('pullstoredlist().length'), 0);
console.log('PASS: both scripts load together, original add/storage/sample/reset functions, week preservation, filters and alternate views.');

}
main().catch(error => { console.error(error); process.exitCode = 1; });
