//Update Note: Lain's original backend, adapted for Erica's integration.

//Note: This document contains scripts for task set up and calendar display. In the future, it may be best
//to figure out a way to seperate these into two files as it quickly has become cumbersome to navigate
//to help with this, I have included headers followed by forward slashes to help visually seperate the file
//edit: subheaders will be included as astricks


//Decision / Design Change Note:
// For a period, dictionaries were attempted as the save system to store tasks alongside a id number
// the dictionaries proved to be a challenge to properly fecth from localstorage json format and 
// the team determined that overhalling every single function to handle the new set up of the dictionary formats 
// was simply not worth it for a project of this scope. Instead, id was included as a field of the task object and is initialized and built when the 
// task item is initilialized (avoiding reinitialazation issues and keeping multiple data structures for the sole purpose of assigning them to dict keys). 
// Now, we simply save the list of tasks to local storage, and when looking for object we just say "if task.id = (id we are looking for)"
// The team acknowledges that this system is slightly less efficient than searching for dict keys without looking inside each tasks
// but the marginal addition to overhead is not a noticible effect on the predicted and intended scale that users will be making tasks (likely <100 objects at a time)
// this trade off was weighed to be worth it against creating a multitude of problems, and requiring many additional processes within functions and helpers to parse the dict


// Integration note (Erica): planner_logic.js imports this module and registers
// callbacks for its new UI. No duplicate storage or event handlers are needed.
let hooks;
function configurePlanner(hookFunctions) { hooks = hookFunctions; }
function setCurrentWeek(value) { currentWeek = value; }
// index.html variable connections
const prevWeekButton = document.getElementById("prev-week");
const nextWeekButton = document.getElementById("next-week");
const calendarGrid = document.getElementById("calendar-grid");
const taskList = document.getElementById("task-list");
const weekTabs = document.querySelectorAll(".week-tab");//this targets all buttons with week-tab class
const weekHeading = document.getElementById("week-heading");
const weekRange = document.getElementById("week-range");
const taskQuantity = document.getElementById("task-count");


// TASK SETUP  ///////////////////////////////////////////////////////////////////////

class Task {
    constructor(key, title, course, category, status, priority, dueDate, dueTime, notes) {
        this.key = key; //used to identify unique task items
        this.title = title;
        this.course = course;
        this.category = category;
        this.status = status;
        this.priority = priority;
        this.dueDate = dueDate;
        this.dueTime = dueTime;
        this.notes = notes;
        
    }

    //add() and delete(), which were originally planned to be within this structure, proved more useful outside of it.
    //both functions can be found below alongside updateTasks
}
    
function initKey() {
    const dict_key = crypto.randomUUID(); //this uses the crypto module to generate a task id (36 char long)
//       the chance of this system generating two identical ids is practically 0. We can add a function to prevent this, but this addition should be low priority as it is very unlikely to be needed, and failure has minimal stakes 
    return dict_key;
    }

function updateTaskQuantity(tasklist) {
    taskQuantity.innerHTML = tasklist.length;
}

// Sample data setup ****************************************************

 // in future sprints I would like to change the dates using logic that sets the dates to values
 // within the current week so the user can always see the sample data no matter when they start using the webapp
 // need to set up how to remove, and to pair this to the button

const sampletask1 = new Task(
    "b6c20a7d-5959-47d6-a3ed-f92eb4077cde",//pre generated key using the initKey() func
    "Calculus 2 Worksheet", 
    "Math", 
    "Other",
    "Not Started",
    "Medium",
    find_start_date(1), //this ensures the task will always be on the first day of the week for a user
    "23:59",
    "Need to ask Mr. Park about #3")
    
function demodatecalc(){
    const weekstart = find_start_date(1)
    const duedate2 = globalThis.moment
        ? moment().add(2, 'days').format('YYYY-MM-DD')
        : CalendarViews.shiftDay(PlannerRules.localDate(new Date()), 2)
    return duedate2
}

const sampletask2 = new Task(
    "d3bb8c6f-1b92-4056-a537-617fa5aa00ef", //pre generated key using the initKey() func
    "Shakespeare Powerpoint", 
    "English", 
    "Project",
    "In Progress",
    "Medium",
    demodatecalc(), 
    "17:00",
    "Mary Hata is available to work on Wed")

//(these are used in the task list)

//task list:
let tasks = [
    sampletask1, sampletask2
]

//dictionary initialization (so the tasks in the list can each have an id)
// function initDictionary(tasklist){
//     let taskDict = {};
//     for (let task of tasklist) {
//         const dict_key = crypto.randomUUID(); //this uses the crypto module to generate a task id (36 char long)
//         taskDict[dict_key] = task;        
//     }
//     return taskDict
// }

function updateTasks(tasklist){ //I didnt strictly use the global variable and instead opted for an input. This is to leave us options for later, but at this current stage is not nessesary
    try {
        localStorage.setItem("tasks", JSON.stringify(tasklist)); //local storage only holds strings
    } catch (error) {
        hooks.announce("Unable to save assignments. Check your browser storage.");
        return false;
    }
    // Erica: refresh filters, summary and the currently selected calendar view.
    hooks.refreshPlanner();
    return true;
}

//puts the fields in the correct format
//within addTask, update tasklist in localstorage
//display based on local storage
function addTask(taskObj, additionalTasks = []){
    const tasklist = pullstoredlist();
    tasklist.push(taskObj, ...additionalTasks)
    return updateTasks(tasklist) //write the tasks to local storage again
}

//get task data from form
const form = document.getElementById('task-form');

// Erica: the separate form handler validates, builds the Task, and calls addTask/updateTasks.
form.addEventListener('submit', event => hooks.submitPlannerForm(event));

// Construct the task from the form fields (Lain's original field mapping).
// Erica: take validated values and retain the existing key/status when editing.
function taskFromForm(data, existing) {
    const key = existing ? existing.key : initKey(); //makes a new key to be used
    const title = PlannerRules.clean(data.title);
    const course = PlannerRules.clean(data.course);
    const category = data.assignmentType;
    const stat = existing ? PlannerRules.status(existing.status) : "Not Started"; //cannot use status
    const priority = data.priority;
    const dueDate = data.dueDate;
    const dueTime = data.dueTime;
    const notes = PlannerRules.clean(data.notes);
    const newTask = new Task(key, title, course, category, stat, priority, dueDate, dueTime, notes);
    return newTask;
}

//DISPLAYING TASK LIST ////////////////////////////////////////////

//add event listener that waits for the submission of the task form
function pullstoredlist(){
    // Erica: guard against malformed or unavailable browser storage.
    try {
        const rawtasklist = localStorage.getItem("tasks");
        const tasklist = JSON.parse(rawtasklist) || [];
        return Array.isArray(tasklist) ? tasklist.filter(task => task && typeof task === "object") : [];
    } catch (error) {
        hooks.announce("Saved assignments could not be read. Check your browser storage.");
        return [];
    }
}

function displayTasks(tasklist) {
    //fetching data
    taskList.innerHTML = "";
    if (!tasklist.length) hooks.showEmptyTasks();
    //use the attributes of the tasks to make an element
    for (let task of tasklist) {
        const taskElement = document.createElement("div");
        taskElement.classList.add("task", "task-card");

        const title = document.createElement("h3"); //these labels can be updated to match UI in future sprint
        title.textContent = task.title;

        const courseandtype = document.createElement("p");
        courseandtype.textContent = `${task.course} • ${task.category}`;

        const priorgency = document.createElement("div");
        priorgency.textContent = `${task.status} • Priority: ${task.priority}`;

        const due = document.createElement("p");
        due.textContent = `Due ${hooks.formatDeadline(task)}`;

        const notes = document.createElement("p");
        notes.textContent = task.notes;

        const delbutton = document.createElement('button');
        delbutton.textContent = "Delete";
        delbutton.className = 'del-btn task-action task-action-delete';
        delbutton.type = 'button';
        delbutton.setAttribute('aria-label', 'Delete ' + task.title);
        delbutton.id = task.key;
        //need to add a popup check
        // Erica: confirmation now runs in loadbuttons below.

        taskElement.appendChild(title);
        // Erica: the separate presentation helper formats these fields as accessible badges
        // and adds status/edit controls, while the original delete button stays connected.
        hooks.decorateTaskCard(taskElement, task, courseandtype, priorgency, due, notes, delbutton);

        taskList.appendChild(taskElement);
    }
    
    loadbuttons();
}


// Display by status
const filterButtons = document.querySelectorAll(".filter")
const filterAll = document.getElementById("all-filter")
const filterCompleted = document.getElementById("completed-filter")
const filterOverdue = document.getElementById("overdue-filter")
const filterUpcoming = document.getElementById("upcoming-filter")


// Erica: all four existing buttons now use the same combined filtering helper.
filterAll.addEventListener("click", function() { hooks.selectTaskFilter("all", filterAll); });
filterCompleted.addEventListener("click", function() { hooks.selectTaskFilter("completed", filterCompleted); });
filterUpcoming.addEventListener("click", function() { hooks.selectTaskFilter("upcoming", filterUpcoming); });
filterOverdue.addEventListener("click", function() { hooks.selectTaskFilter("overdue", filterOverdue); });

// CALENDAR ///////////////////////////////////////////////////////////////////

let currentWeek = 0; //starts at 0 

//currently, the weeks are static as a proof of concept for the first sprint, to get things set up. 
// in later iterations, these dates will be pulled 


function find_start_date(x){
    // Erica: retain Moment when available, with a local-date fallback.
    var week_multi = x -1;
    var week_add = week_multi * 7
    const start_week = globalThis.moment
        ? moment().add(week_add, 'days').format('YYYY-MM-DD')
        : CalendarViews.shiftDay(PlannerRules.localDate(new Date()), week_add)
    return start_week
}

function find_end_week(x){
    var week_multi = x -1;
    var week_add = week_multi * 7
    var week_end = week_add + 6 //for end of the week
    const end_week = globalThis.moment
        ? moment().add(week_end, 'days').format('YYYY-MM-DD')
        : CalendarViews.shiftDay(PlannerRules.localDate(new Date()), week_end)
    return end_week
}

const weeks = [
    {
        week: 1,
        start: find_start_date(1),
        end: find_end_week(1)
    },
    {
        week: 2,
        start: find_start_date(2),
        end: find_end_week(2)
    },
    {
        week: 3,
        start: find_start_date(3),
        end: find_end_week(3)
    },
    {
        week: 4,
        start: find_start_date(4),
        end: find_end_week(4)
    },
    {
        week: 5,
        start: find_start_date(5),
        end: find_end_week(5)
    },
    {
        week: 6,
        start: find_start_date(6),
        end: find_end_week(6)
    },
    {
        week: 7,
        start: find_start_date(7),
        end: find_end_week(7)
    },
    {
        week: 8,
        start: find_start_date(8),
        end: find_end_week(8)
    }
];

// DISPLAY  /////////////////////////////////////////////////////////////////////////

//format date for display
function formatDate(dateString) {
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function displayWeekHeading(weekNo) { //this function refers to the header part of the calender
    // Erica: bound the week index and respect alternate views and custom term dates.
    weekNo = Math.max(0, Math.min(weeks.length - 1, weekNo));
    currentWeek = weekNo;
    if (hooks.getCalendarView() !== 'week') { hooks.displayAlternateCalendar(); return; }
    const week = { ...weeks[weekNo], start: hooks.termDateOffset(weekNo * 7), end: hooks.termDateOffset(weekNo * 7 + 6) };
    hooks.updateWeekControls();
    weekHeading.textContent = `Week ${week.week} of 8`;
    weekRange.textContent =`${formatDate(week.start)} – ${formatDate(week.end)}`;
    currentWeek = weekNo;
    displayCalendar(week);
}


// WEEK NAVIGATION *************************************************
const wTab = document.getElementById("wTab");

weekTabs.forEach(function(wTab) {
    wTab.addEventListener("click", function() {
        const weekNo = Number(wTab.dataset.week);
        displayWeekHeading(weekNo);
        // Active tab and accessibility state are updated by hooks.updateWeekControls().
    });
});

// Next week button 
nextWeekButton.addEventListener("click", function(){
    let nextWeekNo = currentWeek + 1; //right now the data is static and has a limit, but in the future, it will not be static. For this reason, a limit on the week number has not been enforced.
    if (hooks.getCalendarView() === 'week') displayWeekHeading(nextWeekNo);
    else hooks.navigateCalendar(1);
    });

// last week button
prevWeekButton.addEventListener("click", function(){
    let prevWeekNo = currentWeek - 1; //right now the data is static and has a limit, but in the future, it will not be static. For this reason, a limit on the week number has not been enforced.
    if (hooks.getCalendarView() === 'week') displayWeekHeading(prevWeekNo);
    else hooks.navigateCalendar(-1);
    });


// Display calendar by week *************************************************************

function displayCalendar(week){
    calendarGrid.innerHTML = ""; 
    const startDate = new Date(week.start + "T00:00:00");
    //loop through weeks
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i); //set date
        const dateString = PlannerRules.localDate(currentDate); //local date avoids UTC shifts

        const day = document.createElement("div"); //creating day element
        day.classList.add("day");                   

        const dayHeading = document.createElement("div");//headers for days labeled
        dayHeading.classList.add("day-heading");       

        const weekdayName = document.createElement("strong");//labels day of week (like Monday, Tuesday, ect)
        weekdayName.textContent =
            currentDate.toLocaleDateString("en-US", {
                weekday: "short"});

        const dateText = document.createTextNode( //date without year for labeling
            currentDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric"})
        );

        //day / date displayed
        dayHeading.appendChild(weekdayName); // day of week
        dayHeading.appendChild(dateText);  //   date (ex. October 5)
        
        //task display (within day)
        const body = document.createElement("div");
        body.classList.add("day-body");
        body.appendChild(hooks.quickButton(dateString)); // Erica: quick-add on this date
        //fetch the tasks
        const tasklist = pullstoredlist();
        updateTaskQuantity(tasklist);
        const tasksDueOnDay = PlannerRules.sortTasks(tasklist).filter(function(task) {
            return task.dueDate === dateString;
        });
        tasksDueOnDay.forEach(function(task) {
            const taskElement = document.createElement("div");
            taskElement.classList.add("calendar-task");
            hooks.decorateCalendarTask(taskElement, task); // Erica: time, urgency and course color
            body.appendChild(taskElement);
        });

        day.appendChild(dayHeading);
        day.appendChild(body);
        calendarGrid.appendChild(day);
    }
}

//clear data
// uses: const taskList = document.getElementById('task-list');
const resetButton = document.getElementById("reset-button");

resetButton.addEventListener("click", function(){
    // it would be best to add a warning pop up 
    // localStorage.clear();
    if (!confirm("Reset the planner? All saved assignments will be removed.")) return;
    const emptytasks = []
    //leaves the "tasks" key active
    if (updateTasks(emptytasks)) hooks.announce("Planner reset.");
    });

//load demo 
const demoDataButton = document.getElementById("sample-button");

demoDataButton.addEventListener("click", function(){
    // it would be best to add a warning pop up 
    if (!confirm("Load sample data? This replaces any saved assignments.")) return;
    // Erica: refresh sample dates on demand, using the original Task instances.
    sampletask1.dueDate = find_start_date(1);
    sampletask2.dueDate = demodatecalc();
    if (updateTasks(tasks)) hooks.announce("Sample assignments loaded.");
    });

//LETS GET THIS PARTY STARTED! 
// Initial display is triggered by planner_logic.js after the hooks are configured.



function loadbuttons(){
    const delbuttons = document.querySelectorAll(".del-btn")
    delbuttons.forEach(button => button.addEventListener('click', (event) => {
        if (!confirm('Delete this assignment? This cannot be undone.')) return;
        let targetkey = button.id;
        const tasklist = pullstoredlist();
        for (let task of tasklist){
            if (task.key == targetkey){
                const index = tasklist.indexOf(task);
                if (index > -1) { // https://stackoverflow.com/questions/5767325/how-can-i-remove-a-specific-item-from-an-array-in-javascript
                    tasklist.splice(index, 1); // remove on item (task) at index
                }
            }
        }
        if (updateTasks(tasklist)) { //reload the tasks with an updated list
            hooks.announce('Assignment deleted.');
            document.getElementById('add-task').focus();
        }

    }))};

// Functions and shared elements imported by Erica's integration module.
export { Task, initKey, updateTaskQuantity, demodatecalc, updateTasks, addTask,
    taskFromForm, pullstoredlist, displayTasks, find_start_date, find_end_week,
    formatDate, displayWeekHeading, displayCalendar, loadbuttons,
    configurePlanner, setCurrentWeek, currentWeek, form, filterButtons, taskList,
    calendarGrid, prevWeekButton, nextWeekButton, weekTabs };
