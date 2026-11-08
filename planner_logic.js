// access variables
const prevWeekButton = document.getElementById("prev-week");
const nextWeekButton = document.getElementById("next-week");
const calendarGrid = document.getElementById("calendar-grid");
const taskList = document.getElementById("task-list");

//Task Class
class Task {
    constructor(title, category, status, dueDate, notes) {
        this.title = title;
        this.category = category;
        this.status = status;
        this.dueDate = dueDate;
        this.notes = notes;}

    add(){

    }

    delete(){

    }

    edit(){

    }
    

}

// week setup:
let currentWeek = 0;

// sample data
 // in future sprints I would like to change the dates
 // using logic that sets these to the current week so the user
 // can always see it (no matter when they start using the webapp)
 // need to set up how to remove

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

//display task list

function displayTasks() {
    taskList.innerHTML = "";
    //use the attributes of the tasks to make a card
    for (let task of tasks) {
        const taskElement = document.createElement("div");
        taskElement.classList.add("task");

        const title = document.createElement("h3");
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


//navigation

function seeNextWeek() {
    // figure out which week the user is on

    // change the week
    // rerender the calendar
}

function seePreviousWeek() {
    // figure out which week the user is on
    // change the week
    // rerender calendar
}


displayTasks();