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

function updateTaskQuantity() {
    taskQuantity.innerHTML = tasks.length;
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
    "2026-10-08", 
    "11:59 PM",
    "Need to ask Mr. Park about #3")
const sampletask2 = new Task(
    "d3bb8c6f-1b92-4056-a537-617fa5aa00ef", //pre generated key using the initKey() func
    "Shakespeare Powerpoint", 
    "English", 
    "Project",
    "In Progress",
    "Medium",
    "2026-10-09", 
    "5:00 PM",
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
    localStorage.setItem("tasks", JSON.stringify(tasklist)); //local storage only holds strings
    displayTasks();
}

//puts the fields in the correct format
//within addTask, update tasklist in localstorage
//display based on local storage
function addTask(taskObj){
    const rawtasklist = localStorage.getItem("tasks");
    const tasklist = JSON.parse(rawtasklist) || [];
    tasklist.push(taskObj)
    updateTasks(tasklist) //write the tasks to local storage again 
}

//get task data from form
const form = document.getElementById('task-form');

form.addEventListener('submit', (event) => {
    event.preventDefault(); //this just prevents a page reload we may not need this
    const taskData = new FormData(form); //uses formData to get the fields
    const data = Object.fromEntries(taskData.entries()); //this in intended to pull in each field
    key = initKey(); //makes a new key to be used
    title = data.title;
    course = data.course;
    category = data.assignmentType;
    stat = "Not Started"; //cannot use status
    priority = data.priority;
    dueDate = data.dueDate;
    dueTime = data.dueTime;
    notes = data.notes;
    newTask = new Task(key, title, course, category, stat, priority, dueDate, dueTime, notes);
    addTask(newTask);
    }
)


//DISPLAYING TASK LIST ////////////////////////////////////////////

//add event listener that waits for the submission of the task form


function displayTasks() {
    //fetching data
    const rawtasklist = localStorage.getItem("tasks");
    const tasklist = JSON.parse(rawtasklist) || [];

    taskList.innerHTML = "";
    //use the attributes of the tasks to make an element
    for (let task of tasklist) {
        const taskElement = document.createElement("div");
        taskElement.classList.add("task");

        const title = document.createElement("h3"); //these labels can be updated to match UI in future sprint
        title.textContent = task.title;

        const courseandtype = document.createElement("h4");
        courseandtype.textContent = `${task.course} • ${task.category}`;

        const priorgency = document.createElement("h5");
        priorgency.textContent = `${task.status} • Priority: ${task.priority}`;

        const due = document.createElement("p");
        due.textContent = `Due ${task.dueDate} at ${task.dueTime}`;

        const notes = document.createElement("h6");
        notes.textContent = task.notes;

        taskElement.appendChild(title);
        taskElement.appendChild(courseandtype);
        taskElement.appendChild(priorgency);
        taskElement.appendChild(due);
        taskElement.appendChild(notes);

        taskList.appendChild(taskElement);
    }
}


// Display by status
const filterButtons = document.querySelectorAll(".filter")
const filterAll = document.getElementById("all-filter")
const filterCompleted = document.getElementById("completed-filter")
const filterOverdue = document.getElementById("overdue-filter")
const filterUpcoming = document.getElementById("upcoming-filter")


filterAll.addEventListener("click", function() {
    displayTasks(tasks); //just display full list of tasks
    //remove active from previous button
    filterButtons.forEach(button => button.classList.remove('active'));
    //add active to clicked tab
    filterAll.classList.add("active");
})

filterCompleted.addEventListener("click", function() {
    let filteredTasks = []
    for (const task of tasks){
        if (task.status == "Complete"){ 
            filteredTasks.push(task);
    }};
    displayTasks(filteredTasks);
    //remove active from previous button
    filterButtons.forEach(button => button.classList.remove('active'));
    //add active to clicked tab
    filterCompleted.classList.add("active");
})

filterUpcoming.addEventListener("click", function() {
    let filteredTasks = []
    for (const task of tasks){
        if (task.status != "Complete"){//we currently do not have a way to pin point the current date, but in the future, this function should include && dueDate is after currentDate
            filteredTasks.push(task);
    }};
    displayTasks(filteredTasks);
    //remove active from previous button
    filterButtons.forEach(button => button.classList.remove('active'));
    //add active to clicked tab
    filterUpcoming.classList.add("active");
})

filterOverdue.addEventListener("click", function() {
    let filteredTasks = []
    for (const task of tasks){
        if (task.status != "Complete" && task.dueDate == "2026-10-05"){//we currently do not have a way to pin point the current date, but in the future, this function should include && dueDate is before current date
            filteredTasks.push(task);
    }};
    displayTasks(filteredTasks);
    //remove active from previous button
    filterButtons.forEach(button => button.classList.remove('active'));
    //add active to clicked tab
    filterOverdue.classList.add("active");
})


// CALENDAR ///////////////////////////////////////////////////////////////////

let currentWeek = 0; //starts at 0 

//currently, the weeks are static as a proof of concept for the first sprint, to get things set up. 
// in later iterations, these dates will be pulled 


function find_start_date(x){
    const today = moment().format('YYYY-MM-DD');
    var week_multi = x -1;
    var week_add = week_multi * 7
    const start_week = moment().add(week_add, 'days').format('YYYY-MM-DD')
    return start_week
}

function find_end_week(x){
    const today = moment().format('YYYY-MM-DD');
    var week_multi = x -1;
    var week_add = week_multi * 7
    var week_end = week_add + 6 //for end of the week
    const end_week = moment().add(week_end, 'days').format('YYYY-MM-DD')
    return end_week
}


//     const d = new Date();
//     let day = d.getDate();
//     let month = d.getMonth();
//     let year = d.getFullYear();
//     let end_week = d.getDate() + 7;
//     console.log(end_week)
// }
console.log(find_start_date(2))
console.log(find_end_week(2))


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
    const week = weeks[weekNo];
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
        //remove active from previous button
        weekTabs.forEach(wTab => wTab.classList.remove('active'));
        //add active to clicked tab
        wTab.classList.add("active");
    });
});

// Next week button 
nextWeekButton.addEventListener("click", function(){
    let nextWeekNo = currentWeek + 1; //right now the data is static and has a limit, but in the future, it will not be static. For this reason, a limit on the week number has not been enforced.
    displayWeekHeading(nextWeekNo);
    });

// last week button
prevWeekButton.addEventListener("click", function(){
    let prevWeekNo = currentWeek - 1; //right now the data is static and has a limit, but in the future, it will not be static. For this reason, a limit on the week number has not been enforced.
    displayWeekHeading(prevWeekNo)
    });

    //at the moment, this logic seems not essential, but I would like to keep it included for next sprint. 
    // if (prevWeekNo < 0){
    //     displayWeekHeading(0)
    // };  //if you are already on the current week, you cannot go further back. 
    //     //We may decide to change this in a future sprint to be mroe similar to the style of Apple Calendar or Google Calendar 
    //     //where you can view previous points in time, but for now this is straight forward and makes sense
    // else{
    //     displayWeekHeading(prevWeekNo);
    // };

// Display calendar by week *************************************************************

function displayCalendar(week){
    calendarGrid.innerHTML = ""; 
    const startDate = new Date(week.start + "T00:00:00");
    //loop through weeks
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i); //set date
        const dateString = currentDate.toISOString().split("T")[0]; //makes string from date

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
        //fetch the tasks
        const rawtasklist = localStorage.getItem("tasks");
        const tasklist = JSON.parse(rawtasklist) || [];

        const tasksDueOnDay = tasklist.filter(function(task) {
            return task.dueDate === dateString;
        });
        tasksDueOnDay.forEach(function(task) {
            const taskElement = document.createElement("div");
            taskElement.classList.add("calendar-task");
            taskElement.textContent = task.title;
            body.appendChild(taskElement);
        });

        day.appendChild(dayHeading);
        day.appendChild(body);
        calendarGrid.appendChild(day);
    }
}

//LETS GET THIS PARTY STARTED! 
displayTasks();
displayWeekHeading(0);
updateTaskQuantity();