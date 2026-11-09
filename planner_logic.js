//Note: This document contains scripts for task set up and calendar display. In the future, it may be best
//to figure out a way to seperate these into two files as it quickly has become cumbersome to navigate
//to help with this, I have included headers followed by forward slashes to help visually seperate the file
//edit: subheaders will be included as astricks

// access variables
const prevWeekButton = document.getElementById("prev-week");
const nextWeekButton = document.getElementById("next-week");
const calendarGrid = document.getElementById("calendar-grid");
const taskList = document.getElementById("task-list");
const weekTabs = document.querySelectorAll(".week-tab");//this targets all buttons with week-tab class
const weekHeading = document.getElementById("week-heading");
const weekRange = document.getElementById("week-range");


// TASK SETUP  ///////////////////////////////////////////////////////////////////////

class Task {
    constructor(title, category, status, dueDate, notes) {
        this.title = title;
        this.category = category;
        this.status = status;
        this.dueDate = dueDate;
        this.notes = notes;}
    add(){
// planned addition for sprint 2, for adding tasks
    }
    delete(){
// planned addition for sprint 2, for removing tasks
    }
    edit(){
// planned addition for future sprint, for editting tasks
    }
}

// Sample data setup ****************************************************

 // in future sprints I would like to change the dates using logic that sets the dates to values
 // within the current week so the user can always see the sample data no matter when they start using the webapp
 // need to set up how to remove, and to pair this to the button

 const sampletask1 = new Task(
    "Calculus 2 Worksheet", 
    "Math", 
    "Not Started",
    "2026-10-08", 
    "Need to ask Mr. Park about #3")
const sampletask2 = new Task(
    "Shakespeare Powerpoint", 
    "English", 
    "In Progress",
    "2026-10-09", 
    "Mary Hata is available to work on Wed")

//(these are used in the task list)

//task list:
let tasks = [
    sampletask1, sampletask2
]

//Display task list ******************************************************

function displayTasks() {
    taskList.innerHTML = "";
    //use the attributes of the tasks to make a card
    for (let task of tasks) {
        const taskElement = document.createElement("div");
        taskElement.classList.add("task");

        const title = document.createElement("h3"); //these labels can be updated to match UI in future sprint
        title.textContent = task.title;

        const category = document.createElement("h4");
        category.textContent = task.category;

        const status = document.createElement("h5");
        status.textContent = task.status;

        const dueDate = document.createElement("p");
        dueDate.textContent = `Due ${task.dueDate}`;

        const notes = document.createElement("h5");
        notes.textContent = task.notes;

        taskElement.appendChild(title);
        taskElement.appendChild(category);
        taskElement.appendChild(status);
        taskElement.appendChild(dueDate);
        taskElement.appendChild(notes);

        taskList.appendChild(taskElement);
    }
}

// WEEK SETUP ///////////////////////////////////////////////////////////////////

let currentWeek = 0; //starts at 0 

//currently, the weeks are static as a proof of concept for the first sprint, to get things set up. 
// in later iterations, these dates will be pulled 

const weeks = [
    {
        week: 1,
        start: "2026-10-08",
        end: "2026-10-14"
    },
    {
        week: 2,
        start: "2026-10-15",
        end: "2026-10-21"
    },
    {
        week: 3,
        start: "2026-10-22",
        end: "2026-10-28"
    },
    {
        week: 4,
        start: "2026-10-29",
        end: "2026-11-04"
    },
    {
        week: 5,
        start: "2026-11-05",
        end: "2026-11-11"
    },
    {
        week: 6,
        start: "2026-11-12",
        end: "2026-11-18"
    },
    {
        week: 7,
        start: "2026-11-19",
        end: "2026-11-25"
    },
    {
        week: 8,
        start: "2026-11-26",
        end: "2026-12-02"
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


// Week navigation *************************************************

weekTabs.forEach(function(wTab) {
    wTab.addEventListener("click", function() {
        const weekNo = Number(wTab.dataset.week);
        displayWeekHeading(weekNo);
    });
});

function seeNextWeek() { //tied to arrow button 
    //plan for future sprint :
    // figure out which week the user is on
    // change the week
    // rerender the calendar
}

function seePreviousWeek() {//tied to arrow button
    //plan for future sprint:
    // figure out which week the user is on
    // change the week
    // rerender calendar
}

// Display calendar by week *************************************************************

function displayCalendar(week){
    calendarGrid.innerHTML = ""; 
    const startDate = new Date(week.start + "T00:00:00");
    //loop through weeks
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i); //set date
        const dateString = currentDate.toISOString().split("T")[0]; //makes string from date

        const day = document.createElement("div"); //make day element
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
        
        const tasksDueOnDay = tasks.filter(function(task) {
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


displayTasks();
displayWeekHeading(0);