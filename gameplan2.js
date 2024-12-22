class Gameplan {
    #startTime;
    #endTime;
    #breakTimeArray;
    #timeGoal;
    #productivityGoal;
    #timeTicks;
    #productivityTicks
    #init;
    #timeGoalTimeout
    #productivityGoalTimeout
    #breakTimeout

    #totalTimeCache;
    #totalBreakTimeCache;
    constructor() {
        this.#startTime = null; // Date object. Start time of the gameplan.
        this.#endTime = null; // Date object. End time of the gameplan. 
        this.#breakTimeArray = []; // Date objects. Array of break times. 
        this.#timeGoal = null; // Number of milliseconds. Time goal of the gameplan. 
        this.#productivityGoal = null; // Number. Productivity goal of the gameplan. 
        this.#timeTicks = []; // Array of integers. Precomputed milliseconds time-representations for the gameplan.
        this.#productivityTicks = []; // Array of integers. Precomputed milliseconds time-representations for the productivity goal.
        this.#init = false; // Boolean. Initialization status of the gameplan.
        this.#timeGoalTimeout = null; // Interval. Interval for updating the time goal.
        this.#productivityGoalTimeout = null; // Interval. Interval for updating the productivity goal.
        this.#breakTimeout = null; // Interval. Interval for updating the break status.

        this.#totalTimeCache = 0;
        this.#totalBreakTimeCache = 0;
    }

    static get MINUTE() {
        return 60000;
    }
    static get FIVE_MINUTES() {
        return 300000;
    }
    static get HOUR() {
        return 3600000;
    }
    static get DAY() {
        return 86400000;
    }

    get startTime() { //returns the start time of the gameplan in "HH:MM" format.
        if(this.#startTime === null) {
            return null;
        }
        return Gameplan.#dateToTimeString(this.#startTime);
    }
    get startTimeMS() { //returns the start time of the gameplan in milliseconds
        if(this.#startTime === null) {
            return null;
        }
        return this.#startTime.getTime();
    }    
    get endTime() { //returns the end time of the gameplan in "HH:MM" format.
        if(this.#endTime === null) {
            return null;
        }
        return Gameplan.#dateToTimeString(this.#endTime);
    }
    get endTimeMS() { //returns the end time of the gameplan in milliseconds
        if(this.#endTime === null) {
            return null;
        };
        return this.#endTime.getTime();
    }
    get timeGoal() { //returns the time goal of the gameplan in "HH:MM" format
        return `${(Math.floor((this.#timeGoal / Gameplan.HOUR) % 24) + '').padStart(2, '0')}:${(Math.floor((this.#timeGoal / Gameplan.MINUTE) % 60) + '').padStart(2, '0')}`;
    }
    get timeGoalMS() { //returns the time goal of the gameplan in milliseconds
        return this.#timeGoal;
    }
    get productivityGoal() { //returns the productivity goal of the gameplan
        return this.#productivityGoal;
    }
    get tpmPercent() { //Time Per Minute in Percent. returns the percent per minute needed to reach the time goal
        return (this.#timeGoal / this.#totalTimeCache);
    }
    get tpm() { //Time Per Minute. returns the milliseconds per minute needed to reach the time goal
        return (this.#timeGoal / this.#totalTimeCache) * Gameplan.MINUTE;
    }
    get minuteTick() { //return the millseconds between each tick of goal time.
        const totalGoalTicks = Math.round(this.#timeGoal / Gameplan.MINUTE); // Total goal time in minutes
        return this.#totalTimeCache / totalGoalTicks; // Divide by intervals, not total ticks. Using the full tick-count to account for 0-based indexing, as well as the last tick for the end time.
    }
    get productivityTick() { //returns the milliseconds for each productivity task.
        return this.#totalTimeCache / this.#productivityGoal;
    }
    get timeTicks() { //returns the precomputed ticks for the gameplan
        return this.#timeTicks;
    }
    get timeTicksDate() { //returns the precomputed ticks for the gameplan in Date objects
        return this.#timeTicks.map(tick => new Date(tick));
    }
    get productivityTicks() { //returns the precomputed ticks for the productivity goal
        return this.#productivityTicks;
    }
    get productivityTicksDate() { //returns the precomputed ticks for the productivity goal in Date objects
        return this.#productivityTicks.map(tick => new Date(tick));
    }
    get totalBreakTime() { //returns the total break time of the gameplan in milliseconds
        return this.#totalBreakTimeCache;
    }
    get totalActiveTime() { //returns the total active time of the gameplan in milliseconds
        return this.#totalTimeCache;
    }
    get breakDate() { //returns the break times in an array.
        return this.#breakTimeArray;
    }
    get breakString() { //returns the break times in an array of "HH:MM" strings.
        return this.#breakTimeArray.map(breakTime => Gameplan.#dateToTimeString(breakTime));
    }
    get breakMS() { //returns the break times in an array of "HH:MM" strings.
        return this.#breakTimeArray.map(breakTime => breakTime.getTime());
    }

    get currentBreakStatus() {
        const nowMS = Date.now();
    
        // Convert break times to an array of timestamps
        const breakTimesMS = this.#breakTimeArray.map(breakTime => breakTime.getTime());
    
        // Find the index of the highest break time that has passed
        const lastPassedIndex = breakTimesMS.findIndex(time => time > nowMS) - 1;
    
        // If no breaks have passed, calculate the time until the first break
        if (lastPassedIndex < 0) {
            return {
                breaktimeCount: breakTimesMS[0] - nowMS,
                status: false,
            };
        }
    
        // Check if we are currently in a break
        const lastBreakTime = breakTimesMS[lastPassedIndex];
        const breakEnd = lastBreakTime + Gameplan.FIVE_MINUTES; // Each break interval is 5 minutes
    
        if (nowMS < breakEnd) {
            // Currently on a break, calculate consecutive breaks
            let currentIndex = lastPassedIndex;
            let totalBreakDuration = Gameplan.FIVE_MINUTES; // Start with the duration of the current break
    
            while (
                currentIndex + 1 < breakTimesMS.length &&
                breakTimesMS[currentIndex + 1] === breakTimesMS[currentIndex] + Gameplan.FIVE_MINUTES
            ) {
                totalBreakDuration += Gameplan.FIVE_MINUTES;
                currentIndex++;
            }
    
            const timeElapsedInCurrentBreak = nowMS - lastBreakTime;
    
            return {
                breaktimeCount: totalBreakDuration - timeElapsedInCurrentBreak,
                status: true,
            };
        }
    
        // Not on a break, calculate time until the next break
        const nextBreakTime = breakTimesMS[lastPassedIndex + 1];
        return {
            breaktimeCount: nextBreakTime - nowMS,
            status: false,
        };
    }

    set startTime(newValue) { //sets the start time of the gameplan
        const oldValue = this.#startTime;
        this.#startTime = Gameplan.#timeStringToDate(newValue);
        if(this.#init) { //if the gameplan has already been initialized, reinitialize it.
            this.init();
        }
        this.#totalTimeCache = (this.#endTime - this.#startTime) - this.totalBreakTime;
        window.dispatchEvent(new CustomEvent("gameplan-starttime-change", { detail: {originalValue: oldValue, newValue: this.#startTime } }));
    }
    set endTime(newValue) { //sets the end time of the gameplan
        const oldValue = this.#endTime;
        this.#endTime = Gameplan.#timeStringToDate(newValue);
        if(this.#init) {
            this.init();
        }
        this.#totalTimeCache = (this.#endTime - this.#startTime) - this.totalBreakTime;
        window.dispatchEvent(new CustomEvent("gameplan-endtime-change", { detail: {originalValue: oldValue, newValue: this.#endTime } }));
    }
    set timeGoal(newValue) { //sets the time goal of the gameplan
        const oldValue = this.#timeGoal;
        const timeArr = newValue.split(':').map(Number);
        this.#timeGoal = (timeArr[0] * Gameplan.HOUR) + (timeArr[1] * Gameplan.MINUTE);
        if(this.#init) {
            this.init();
        }
        window.dispatchEvent(new CustomEvent("gameplan-timegoal-change", { detail: {originalValue: oldValue, newValue: this.#timeGoal } }));
    }
    set productivityGoal(newValue) { //sets the productivity goal of the gameplan
        const oldValue = this.#productivityGoal;
        if(isNaN(newValue)) {
            throw new Error("Invalid productivity goal");
        }
        this.#productivityGoal = newValue;
        if(this.#init) {
            this.init();
        }
        window.dispatchEvent(new CustomEvent("gameplan-productivitygoal-change", { detail: {originalValue: oldValue, newValue: this.#productivityGoal } }));
    }

    init() { //initializes the gameplan
        this.#timeTicks = this.#computeTicks("time");
        this.#productivityTicks = this.#computeTicks("productivity");
        this.#init = true;
        clearTimeout(this.#timeGoalTimeout);
        clearTimeout(this.#productivityGoalTimeout);
        clearTimeout(this.#breakTimeout);
        this.#startSchedule();
    }

    getCurrentGoal(time) {
        if (typeof time === "string") {
            time = Gameplan.#timeStringToDate(time).getTime();
        }
        if (typeof time === "object") {
            time = time.getTime();
        }
        
        const nowMS = time || Date.now();
    
        // Time Goal
        const { timeGoal, timeToNextTimeUpdateMS } = this.#timeGoalCalc(nowMS);
    
        // Productivity Goal
        const { productivityGoal, timeToNextProductivityUpdateMS } = this.#productivityGoalCalc(nowMS);
    
        return {
            timeGoal: {
                currentGoalTimeMS: timeGoal,
                currentGoalTimeString: Gameplan.#msToTimeString(timeGoal),
                timeToNextUpdateMS: timeToNextTimeUpdateMS,
            },
            productivityGoal: {
                currentGoalProductivity: productivityGoal,
                timeToNextUpdateMS: timeToNextProductivityUpdateMS,
            },
        };
    }
    
    #timeGoalCalc(nowMS) {
        const lastTimeTickIndex = this.#timeTicks.findIndex(tick => tick > nowMS) - 1;
        const timeGoal = lastTimeTickIndex >= 0 ? lastTimeTickIndex * Gameplan.MINUTE : 0;
        const timeToNextTimeUpdateMS = lastTimeTickIndex + 1 < this.#timeTicks.length
            ? this.#timeTicks[lastTimeTickIndex + 1] - nowMS
            : this.#startTime.getTime() + Gameplan.DAY;
        return { timeGoal, timeToNextTimeUpdateMS };
    }

    #productivityGoalCalc(nowMS) {
        const lastProductivityTickIndex = this.#productivityTicks.findIndex(tick => tick > nowMS) - 1;
        const productivityGoal = lastProductivityTickIndex >= 0 ? lastProductivityTickIndex + 1 : 0;
        const timeToNextProductivityUpdateMS = lastProductivityTickIndex + 1 < this.#productivityTicks.length
            ? this.#productivityTicks[lastProductivityTickIndex + 1] - nowMS
            : this.#startTime.getTime() + Gameplan.DAY;
        return { productivityGoal, timeToNextProductivityUpdateMS };
    }

    #computeTicks(tickCategory) {
        const ticks = [];
        const startTimeMS = this.#startTime.getTime();
        const endTimeMS = this.#endTime.getTime();
        const minuteTickMS = tickCategory === "productivity" ? this.productivityTick : this.minuteTick;

    
        // Calculate the number of expected ticks
        const totalGoalTicks = tickCategory === "productivity" ? this.productivityGoal : Math.round(this.#timeGoal / Gameplan.MINUTE); // Total goal time in minutes
        let currentTimeMS = startTimeMS;
    
        while (ticks.length < totalGoalTicks) {
            // Skip if the current time is within a break
            const isBreak = this.#breakTimeArray.some(
                breakTime => currentTimeMS >= breakTime.getTime() && currentTimeMS < breakTime.getTime() + Gameplan.FIVE_MINUTES
            );
            if (!isBreak) {
                ticks.push(currentTimeMS); // Add the current time to the array
                currentTimeMS += minuteTickMS;
            }else{
                currentTimeMS += Gameplan.FIVE_MINUTES;
            }
        }
    
        // Ensure we add an extra tick for the end time due to 0-based indexing
        ticks.push(endTimeMS);
        // Add an "end of day" tick to ensure we always have a tick after the last working tick.
        ticks.push(this.#startTime.getTime() - 1 - ((this.#startTime.getHours() * Gameplan.HOUR) - (this.#startTime.getMinutes() * Gameplan.MINUTE)) + Gameplan.DAY);
    
        return ticks;
    }

    addBreakTime(newValue) { //adds a break time to the gameplan
        this.#breakTimeArray.push(Gameplan.#timeStringToDate(newValue));
        this.#breakTimeArray = this.#breakTimeArray.sort((a, b) => a - b);
        if(this.#init) {
            this.init();
        }
        this.#totalTimeCache = (this.#endTime - this.#startTime) - this.totalBreakTime;
        this.#totalBreakTimeCache = this.#breakTimeArray.length * Gameplan.FIVE_MINUTES;
        window.dispatchEvent(new CustomEvent("gameplan-breaktime-add", { detail: {valueName: 'breakTime', originalValue: -1, newValue: Gameplan.#timeStringToDate(newValue) } }));
    }

    removeBreakTime(newValue) { //removes a break time from the gameplan
        const removeBreakDate = Gameplan.#timeStringToDate(newValue).getTime();
        const index = this.breakMS.indexOf(removeBreakDate);
        if (index > -1) {
            this.#breakTimeArray.splice(index, 1);
        }
        if(this.#init) {
            this.init();
        }
        this.#totalTimeCache = (this.#endTime - this.#startTime) - this.totalBreakTime;
        this.#totalBreakTimeCache = this.#breakTimeArray.length * Gameplan.FIVE_MINUTES;
        window.dispatchEvent(new CustomEvent("gameplan-breaktime-remove", { detail: {valueName: 'breakTime', originalValue: -1, newValue: Gameplan.#timeStringToDate(newValue) } }));
    }

    #startSchedule() {
        const runTimeTick = () => {
            const { timeGoal } = this.getCurrentGoal();
    
            // Perform the time tick actions
            this.#onTick("gameplan-goaltime-tick");
    
            // Schedule the next time tick if timeToNextUpdateMS is valid
            if (timeGoal.timeToNextUpdateMS !== Infinity) {
                this.#timeGoalTimeout = setTimeout(runTimeTick, Math.floor(timeGoal.timeToNextUpdateMS) + 1);
            } else {
                // Stop the time schedule if no further updates are needed
                this.#timeGoalTimeout = null;
            }
        };
    
        const runProductivityTick = () => {
            const { productivityGoal } = this.getCurrentGoal();
    
            // Perform the productivity tick actions
            this.#onTick("gameplan-productivity-tick");
    
            // Schedule the next productivity tick if timeToNextUpdateMS is valid
            if (productivityGoal.timeToNextUpdateMS !== Infinity) {
                this.#productivityGoalTimeout = setTimeout(runProductivityTick, Math.floor(productivityGoal.timeToNextUpdateMS) + 1);
            } else {
                // Stop the productivity schedule if no further updates are needed
                this.#productivityGoalTimeout = null;
            }
        };

        const scheduleBreakEvents = () => {
            const { breaktimeCount, status } = this.currentBreakStatus;
    
            // Dispatch the current break status
            const breakEvent = new CustomEvent(`gameplan-break-${status ? "start" : "end"}`, {
                detail: { status, time: new Date(Date.now() + breaktimeCount) },
            });
            window.dispatchEvent(breakEvent);
    
            // Schedule the next break event
            if (breaktimeCount !== Infinity && breaktimeCount > 0) {
                this.#breakTimeout = setTimeout(scheduleBreakEvents, Math.floor(breaktimeCount) + 1);
            } else {
                this.#breakTimeout = null; // No more breaks for today
            }
        };
    
        // Start both schedules
        runTimeTick();
        runProductivityTick();
        scheduleBreakEvents();
    }
    
    #onTick(eventName) {
        // Get the current goal details
        const details = this.getCurrentGoal();
        const timeGoal = details.timeGoal;
        const productivityGoal = details.productivityGoal;

        // Create and dispatch the custom event
        const tickEvent = new CustomEvent(eventName, {
            detail: {
                timeGoal,
                productivityGoal
            }
        });
    
        // Dispatch the event on the window object
        window.dispatchEvent(tickEvent);
    }

    static #timeStringToDate(timeString) { //converts a time string in "HH:MM" format to a Date object
        const now = new Date();
        const [hours, minutes = 0, seconds = 0] = timeString.split(':').map(Number);
    
        // Ensure valid hours, minutes, and seconds
        if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
            throw new Error("Invalid time format");
        }
    
        // Create a Date object with the current date and parsed time
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, seconds);
    }

    static #dateToTimeString(date) { //converts a Date object to a time string in "HH:MM" format
        if (!(date instanceof Date)) {
            throw new Error("Invalid Date object");
        }
    
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
    
        return `${hours}:${minutes}`;
    }

    static #msToTimeString(ms) {
        const hours = Math.floor((ms / Gameplan.HOUR) % 24);
        const minutes = Math.floor((ms / Gameplan.MINUTE) % 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }    
}