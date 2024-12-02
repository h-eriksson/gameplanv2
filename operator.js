(function () {

    let milestoneTimeout; // Global variable to store the timeout reference
    let milestoneCheck;
    let milestoneInterval = 5; // Default interval in minutes
    let darkmodeCheck;

    // Function to get system default brightness
    const getSystemDefaultBrightness = () => {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    // Set data properties on the <body> element
    const setBodyDataProperties = (theme, brightness) => {
        const body = document.body;
        if (theme) body.setAttribute('data-theme', theme);
        if (brightness) body.setAttribute('data-brightness', brightness);
    };

    // Initialize data properties
    const initDataProperties = () => {
        const body = document.body;
        const storedTheme = localStorage.getItem('theme');
        const storedBrightness = localStorage.getItem('Brightness');

        let theme = body.getAttribute('data-theme') || storedTheme || null;
        let brightness = body.getAttribute('data-brightness') || storedBrightness || getSystemDefaultBrightness();

        // Save to localStorage if data properties were empty
        if (!storedTheme && theme) localStorage.setItem('theme', theme);
        if (!storedBrightness && brightness) localStorage.setItem('Brightness', brightness);

        // Apply the resolved properties to the <body>
        setBodyDataProperties(theme, brightness);
    };

    // Run the initialization
    document.addEventListener('DOMContentLoaded', event =>{
        initDataProperties();
    });


    // Update "Last updated" date
    fetch(location.href)
    .then(response => {
        const lastModified = response.headers.get('Last-Modified');
        if (lastModified) {
            // Format the date as needed
            const date = new Date(lastModified);
            document.getElementById('updated').textContent = date.toLocaleString();
        } else {
            document.getElementById('updated').textContent = 'Unknown';
        }
    })
    .catch(error => {
        console.error('Failed to fetch last modified date:', error);
        document.getElementById('updated').textContent = 'Error';
    });

    // Tooltip functionality
    const icons = document.querySelectorAll(".icon");
    icons.forEach(icon => {
        let iconTimeout = null;
        icon.addEventListener("mouseover", (event) => {
            const section = icon.parentElement;
            const tooltip = section.lastElementChild;
            iconTimeout = setTimeout(() => {
                tooltip.style.display = "block";
            }, 500);
        });
        icon.addEventListener("mouseout", (event) => {
            const section = icon.parentElement;
            const tooltip = section.lastElementChild;
            tooltip.style.display = "none";
            clearTimeout(iconTimeout);
        });
    });
    
    // Add event listeners for the input fields
    const startTimeElement = document.getElementById('startTime');
    startTimeElement.addEventListener("change", (event) => {
        gp.startTime = event.target.value;
        localStorage.setItem("StartTime", event.target.value);
        buildBreakTimeList();
    });
    
    const endTimeElement = document.getElementById('endTime');
    endTimeElement.addEventListener("change", (event) => {
        gp.endTime = event.target.value;
        localStorage.setItem("EndTime", event.target.value);
        buildBreakTimeList();
    });
    
    const timeGoalElement = document.getElementById('timeGoal');
    timeGoalElement.addEventListener("change", (event) => {
        gp.timeGoal = event.target.value;
        localStorage.setItem("TimeGoal", event.target.value);
    });
    
    const productivityGoalElement = document.getElementById('goalTasks');
    productivityGoalElement.addEventListener("change", (event) => {
        gp.productivityGoal = event.target.value;
        localStorage.setItem("ProductivityGoal", event.target.value);
    });
    
    const darkModeToggle = document.getElementById("darkMode");
    darkModeToggle.addEventListener("click", (event) => {
        updateBrightness();
    });

    // Settings Menu items
    const darkModeToggleMenu = document.getElementById("darkModeCheck");
    darkModeToggleMenu.addEventListener("change", (event) => {
        updateBrightness();
    });

    const milestoneToggleMenu = document.getElementById("milestonesCheck");
    milestoneToggleMenu.addEventListener("change", (event) => {
        const milestoneSection = document.getElementById("sidePanel");
        milestoneSection.style.display = event.target.checked ? "block" : "none";
        localStorage.setItem("Milestones", event.target.checked);
    });

    const milestoneIntervals = document.getElementsByClassName("milestoneIntervalMin");
    Array.from(milestoneIntervals).forEach((interval) => {
        interval.addEventListener("click", (event) => {
            milestoneInterval = parseInt(interval.dataset.interval);
            Array.from(milestoneIntervals).forEach((interval) => {
                interval.classList.remove("selected");
            });
            interval.classList.add("selected");
            document.getElementById("milestoneTitleMinutes").innerHTML = milestoneInterval;
            localStorage.setItem("MilestoneInterval", milestoneInterval);
            buildMilestones();
        });
    });

    // Tick events from the Gamplan-class
    window.addEventListener("gameplan-starttime-change", (event) => {
        const element = document.getElementById('startTime');
        element.value = `${String(new Date(event.detail.newValue).getHours()).padStart(2, '0')}:${String(new Date(event.detail.newValue).getMinutes()).padStart(2, '0')}`;
        buildMilestones();
    });

    window.addEventListener("gameplan-endtime-change", (event) => {
        const element = document.getElementById('endTime');
        element.value = `${String(new Date(event.detail.newValue).getHours()).padStart(2, '0')}:${String(new Date(event.detail.newValue).getMinutes()).padStart(2, '0')}`;
        buildMilestones();
    });
    
    window.addEventListener("gameplan-timegoal-change", (event) => {
        const element = document.getElementById('timeGoal');
        const hours = Math.floor((event.detail.newValue / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((event.detail.newValue / (1000 * 60)) % 60);
        element.value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        buildMilestones();
    });
    
    window.addEventListener("gameplan-productivitygoal-change", (event) => {
        const element = document.getElementById('goalTasks');
        element.value = event.detail.newValue;
        buildMilestones();
    });
    
    window.addEventListener("gameplan-break-start", (event) => {
        const breakString = document.getElementById("breakString");
        breakString.style.display = "block";
        buildMilestones();
    });
    
    window.addEventListener("gameplan-break-end", (event) => {
        const breakString = document.getElementById("breakString");
        breakString.style.display = "none";
        buildMilestones();
    });

    // Add an event listener for when the break-dropdown is opened
    const breakTimeSection = document.getElementById("breakTimeSection");
    const breakTimesContainer = document.getElementById("breakTimes");
    breakTimeSection.addEventListener("focus", () => {
        const now = new Date();
        const minutes = Math.floor(now.getMinutes() / 5) * 5; // Round to nearest 5-minute interval
        const currentTimeString = `${String(now.getHours()).padStart(2, "0")}-${String(minutes).padStart(2, "0")}`;
    
        // Find the checkbox or label for the current time
        const currentTimeElement = breakTimesContainer.querySelector(`#breakLabel_${currentTimeString}`);
        if (currentTimeElement) {
            currentTimeElement.scrollIntoView({
                behavior: "smooth", // Smooth scrolling
                block: "center",   // Center the element in the visible area
            });
        }
    });

    // Event handler to handle the tick-events of the the gameplan object
    window.addEventListener("gameplan-goaltime-tick", (event) => {
        // Update the UI with the current goal time
        const timeElement = document.getElementById('time');
        timeElement.innerHTML = event.detail.timeGoal.currentGoalTimeString;

        const timeProgress = document.getElementById("timeProgress");

        // Reset the progress bar immediately
        timeProgress.style.transitionDuration = "0s";
        timeProgress.style.width = "0%";
    
        // Use requestAnimationFrame to force the browser to render the reset state
        requestAnimationFrame(() => {
            const elapsedRatio =
                (gp.minuteTick - event.detail.timeGoal.timeToNextUpdateMS) / gp.minuteTick;
    
            // Set the current progress width without transition
            timeProgress.style.width = `${elapsedRatio * 100}%`;
    
            // Apply the animation to 100% width
            requestAnimationFrame(() => {
                timeProgress.style.transitionProperty = "width";
                timeProgress.style.transitionDuration = `${event.detail.timeGoal.timeToNextUpdateMS}ms`;
                timeProgress.style.width = "100%";
            });
        });
    });
    
    window.addEventListener("gameplan-productivity-tick", (event) => {
        // Update the UI with the current goal time
        const taskElement = document.getElementById('tasks');
        taskElement.innerHTML = event.detail.productivityGoal.currentGoalProductivity;

        const taskProgress = document.getElementById("taskProgress");

        // Reset the progress bar immediately
        taskProgress.style.transitionDuration = "0s";
        taskProgress.style.width = "0%";
    
        // Use requestAnimationFrame to force the browser to render the reset state
        requestAnimationFrame(() => {
            const elapsedRatio =
                (gp.productivityTick - event.detail.productivityGoal.timeToNextUpdateMS) / gp.productivityTick;
    
            // Set the current progress width without transition
            taskProgress.style.width = `${elapsedRatio * 100}%`;
    
            // Apply the animation to 100% width
            requestAnimationFrame(() => {
                taskProgress.style.transitionProperty = "width";
                taskProgress.style.transitionDuration = `${event.detail.productivityGoal.timeToNextUpdateMS}ms`;
                taskProgress.style.width = "100%";
            });
        });
    });

    // Function to update the brightness
    function updateBrightness() {
        const body = document.body;
        const currentBrightness = body.getAttribute('data-brightness');
        const newBrightness = currentBrightness === 'dark' ? 'light' : 'dark';
        body.setAttribute('data-brightness', newBrightness);
        localStorage.setItem('Brightness', newBrightness);
    }

    // Create all the breaktime checkboxes
    function buildBreakTimeList(){
        let currentBreaktime = new Date(gp.startTimeMS);
        let breaks = [];
    
        while (currentBreaktime < new Date(gp.endTimeMS)){
            breaks.push(currentBreaktime);
            currentBreaktime = new Date(currentBreaktime.getTime() + 5 * 60 * 1000);
        }
    
        const breakTimes = document.getElementById("breakTimes");
        breakTimes.innerHTML = "";
        breaks.forEach((breakTime) => {
            const hours = String(breakTime.getHours()).padStart(2, '0');
            const minutes = String(breakTime.getMinutes()).padStart(2, '0');
    
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = `break_${hours}-${minutes}`;

            if (gp.breakString.includes(`${hours}:${minutes}`)){
                checkbox.checked = true;
            };

            checkbox.addEventListener("change", (event) => {
                if (event.target.checked){
                    gp.addBreakTime(`${hours}:${minutes}`);
                } else {
                    gp.removeBreakTime(`${hours}:${minutes}`);
                }
                localStorage.setItem("BreakTimes", gp.breakString);
            });

            const checkboxLabel = document.createElement("label");
            checkboxLabel.htmlFor = `break_${hours}-${minutes}`;
            checkboxLabel.innerHTML = `${hours}:${minutes}`;
            checkboxLabel.id = `breakLabel_${hours}-${minutes}`;
            breakTimes.appendChild(checkbox);
            breakTimes.appendChild(checkboxLabel);
        });
    }

    // Create all the milestones-elements
    function buildMilestones(){
        // The milestones needs 2 padded elements at the start of the list, and at the end of the list, so that the current time, if it's the first or last will center properly.

        // Check if the timeTicks and productivityTicks are defined
        if(gp.timeTicks === undefined || gp.productivityTicks === undefined){
            return;
        };

        // Set value from selected or default value.
        const defaultInterval = milestoneInterval * 60 * 1000;
        let milestoneTime = gp.startTimeMS;

        // Set the title of the milestone section and clear the existing milestones.
        document.getElementById("milestoneTitleMinutes").innerHTML = milestoneInterval;
        const milestoneSection = document.getElementById("milestoneList");
        milestoneSection.innerHTML = "";

        // Add milestones every interval minutes
        while (milestoneTime < gp.endTimeMS){
            const currentTimeString = `${String(new Date(milestoneTime).getHours()).padStart(2, '0')}:${String(new Date(milestoneTime).getMinutes()).padStart(2, '0')}`;
            const currentGoal = gp.getCurrentGoal(currentTimeString);
            const milestone = document.createElement("div");
            milestone.classList.add("milestone");
            milestone.dataset.time = milestoneTime;
            milestone.innerHTML = `${currentTimeString} time: ${currentGoal.timeGoal.currentGoalTimeString} tasks: ${currentGoal.productivityGoal.currentGoalProductivity}`;

            milestoneSection.appendChild(milestone);

            milestoneTime += defaultInterval;
        }

        // add a milestone for the end time
        const endTimeString = `${String(new Date(gp.endTimeMS).getHours()).padStart(2, '0')}:${String(new Date(gp.endTimeMS).getMinutes()).padStart(2, '0')}`;
        const endGoal = gp.getCurrentGoal(endTimeString);
        const endMilestone = document.createElement("div");
        endMilestone.classList.add("milestone");
        endMilestone.dataset.time = gp.endTimeMS;
        endMilestone.innerHTML = `${endTimeString} time: ${endGoal.timeGoal.currentGoalTimeString} tasks: ${endGoal.productivityGoal.currentGoalProductivity}`;

        milestoneSection.appendChild(endMilestone);

        centerMilestones(true);
    }

    function centerMilestones(initialization = false) {
        const milestoneSection = document.getElementById("milestoneList");
        const milestones = milestoneSection.querySelectorAll(".milestone");
        const currentTime = new Date().getTime();
    
        Array.from(milestones).forEach((milestone) => {
            const milestoneTime = parseInt(milestone.dataset.time, 10);
    
            if (milestoneTime > currentTime - milestoneInterval * 60 * 1000 && milestoneTime < currentTime) {
                // Center the milestone
                milestone.scrollIntoView({
                    behavior: initialization ? "auto" : "smooth",
                    block: "center",
                });
    
                // Clear any existing timeout
                if (milestoneTimeout) clearTimeout(milestoneTimeout);
    
                // Schedule the next update
                const timeToNextMilestone = milestoneTime - currentTime;
                milestoneTimeout = setTimeout(() => {
                    centerMilestones();

                    const milestoneProgress = document.getElementById("milestoneProgress");

                    // Reset the progress bar immediately
                    milestoneProgress.style.transitionDuration = "0s";
                    milestoneProgress.style.width = "0%";
                
                    // Use requestAnimationFrame to force the browser to render the reset state
                    requestAnimationFrame(() => {
                        const elapsedRatio =
                            (currentTime - milestoneTime) / (milestoneInterval * 60 * 1000);
                
                        // Set the current progress width without transition
                        milestoneProgress.style.width = `${elapsedRatio * 100}%`;
                
                        // Apply the animation to 100% width
                        requestAnimationFrame(() => {
                            milestoneProgress.style.transitionProperty = "width";
                            milestoneProgress.style.transitionDuration = `${milestoneTime - currentTime}ms`;
                            milestoneProgress.style.width = "100%";
                        });
                    });

                }, timeToNextMilestone);
            }
        });
    }
    
    function isDarkMode() {
        const darkMode = localStorage.getItem('Brightness');
        if(darkMode !== null){
            return darkMode === "dark";
        }else{
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
    }

    function initialize(){
        if(localStorage.getItem("StartTime") !== null){
            gp.startTime = localStorage.getItem("StartTime");
        }else{
            gp.startTime = "00:00";
            localStorage.setItem("StartTime", gp.startTime);
        }

        if(localStorage.getItem("EndTime") !== null){
            gp.endTime = localStorage.getItem("EndTime");
        }else{
            gp.endTime = "23:59";
            localStorage.setItem("EndTime", gp.endTime);
        }

        if(localStorage.getItem("TimeGoal") !== null){
            gp.timeGoal = localStorage.getItem("TimeGoal");
        }else{
            gp.timeGoal = "00:00";
            localStorage.setItem("TimeGoal", gp.timeGoal)
        }

        if(localStorage.getItem("ProductivityGoal") !== null){
            gp.productivityGoal = localStorage.getItem("ProductivityGoal");
        }else{
            gp.productivityGoal = 0;
            localStorage.setItem("ProductivityGoal", gp.productivityGoal);
        }

        buildBreakTimeList();
        if(localStorage.getItem("BreakTimes") !== null){
            const breaks = localStorage.getItem("BreakTimes").split(",");
            breaks.forEach((breakTime) => {
                gp.addBreakTime(breakTime);
                const hours = breakTime.split(":")[0];
                const minutes = breakTime.split(":")[1];
                document.getElementById(`break_${hours}-${minutes}`).checked = true;
            });
        }

        if(localStorage.getItem("MilestoneInterval") !== null){
            milestoneInterval = parseInt(localStorage.getItem("MilestoneInterval"));
        }else{
            milestoneInterval = 5;
            localStorage.setItem("MilestoneInterval", milestoneInterval);
        }

        if(localStorage.getItem("Milestones") !== null){
            milestoneCheck = localStorage.getItem("Milestones");
        }else{
            milestoneCheck = "true";
            localStorage.setItem("Milestones", milestoneCheck);
        }

        // Set the milestone interval in the settings menu according to the stored value.
        const milestoneIntervalElements = document.getElementsByClassName("milestoneIntervalMin");
        Array.from(milestoneIntervalElements).forEach((interval) => {
            if (parseInt(interval.dataset.interval) === parseInt(milestoneInterval)){
                interval.classList.add("selected");
            }else{
                interval.classList.remove("selected");
            }
        });

        const milestoneCheckbox = document.getElementById("milestonesCheck");
        milestoneCheckbox.checked = milestoneCheck === "true" ? true : false;

        if(milestoneCheck === "true"){
            const milestoneSection = document.getElementById("sidePanel");
            milestoneSection.style.display = "block";
        }else{
            const milestoneSection = document.getElementById("sidePanel");
            milestoneSection.style.display = "none";
        }

        const darkModeCheckbox = document.getElementById("darkModeCheck");
        darkModeCheckbox.checked = isDarkMode();

        gp.init();
        buildMilestones();
    }

    let gp = new Gameplan();

    initialize();
})();