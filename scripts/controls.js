// buttons
const startButton = document.getElementById("start-button");
const autoPlayButton = document.getElementById("auto-play-button");
const nextButton = document.getElementById("next-button");
const backButton = document.getElementById("back-button");
const skipAheadButton = document.getElementById("skip-ahead-button");
const skipBackButton = document.getElementById("skip-back-button");

const clearButton = document.getElementById("clear-button");
const randomButton = document.getElementById("add-random-button");
const random5Button = document.getElementById("add-5-random-button");

// slider
const speedSlider = document.getElementById("speed-slider");
const speedDisplay = document.getElementById("speed-display");
const speedUpButton = document.getElementById("speed-up");
const slowDownButton = document.getElementById("slow-down");

// checkboxes
const showBeachlineCheckbox = document.getElementById("show-beachline");
const showCircleEventsCheckbox = document.getElementById("show-circle-events");
const smoothTransitionCheckbox = document.getElementById("smooth-transition");

// functions to manage buttons
function enableButton(button) {
    button.disabled = false;
}

function disableButton(button) {
    button.disabled = true;
}


startButton.addEventListener("click", () => {
    if (!canvasWrapper.IsInAlgorithm()) {
        console.log("Algorithm started");
        canvasWrapper.ToggleInAlgorithm();
        canvasWrapper.NextTransition();
        updateAll();
    } else {
        console.log("Algorithm exited");
        canvasWrapper.ToggleInAlgorithm();
        updateAll();
    }
});

autoPlayButton.addEventListener("click", () => {
    if (canvasWrapper.inAlgorithm) {
        if (!canvasWrapper.isAutoPlaying) {
            console.log("Auto-play started");
            canvasWrapper.NextTransition(true, true);
            updateAll();
        } else {
            console.log("Auto-play stopped.");
            canvasWrapper.PauseAutoPlay();
            updateAll();
        }
    } else {
        throw new Error("Auto-play button clicked while not in algorithm. Should have been disabled.");
    }
});


nextButton.addEventListener("click", () => {
    console.log("Next.");
    canvasWrapper.NextTransition(true);
    updateAll();
});

document.addEventListener("keyup", (event) => {
    if (event.key === "ArrowRight") {
        console.log("Right arrow key released.");
        if (!nextButton.disabled) {
            nextButton.click();
        }
    } else if (event.key === "ArrowLeft") {
        console.log("Left arrow key released.");
        if (!backButton.disabled) {
            backButton.click();
        }
    }
});



skipAheadButton.addEventListener("click", () => {
    console.log("Fast forward.");
    canvasWrapper.SkipTransition(3);
    updateAll();
});


skipBackButton.addEventListener("click", () => {
    console.log("Skip back.");
    canvasWrapper.SkipTransition(-3);
    updateAll();
});

backButton.addEventListener("click", () => {
    console.log("Back.");
    canvasWrapper.PreviousTransition(true);
    updateAll();
});

// Event listeners for buttons
clearButton.addEventListener("click", () => {
    console.log("Clear button clicked.");
    canvasWrapper.ClearAllPoints();
    updateAll();
});

randomButton.addEventListener("click", () => {
    console.log("Add random point button clicked.");
    canvasWrapper.AddRandomPoint()
    updateAll();
});

random5Button.addEventListener("click", () => {
    console.log("Add random 5 points button clicked.");
    canvasWrapper.AddRandomPoints(5);
    updateAll();
});

showBeachlineCheckbox.addEventListener("change", (event) => {
    console.log("Show beachline.");
    canvasWrapper.ToggleShowBeachline();
});

showCircleEventsCheckbox.addEventListener("change", (event) => {
    console.log("Show circles.");
    canvasWrapper.ToggleShowCircles();
});

smoothTransitionCheckbox.addEventListener("change", (event) => {
    console.log("Show circles.");
    canvasWrapper.ToggleSmoothTransitions()
});

// Speed mapping
const speedMap = {
    1: 0.2,
    2: 0.3,
    3: 0.5,
    4: 0.75,
    5: 1,
    6: 1.5,
    7: 2,
    8: 2.5,
    9: 3
};

let animationSpeed = speedMap[5]; // Default speed for value 5
let currentSpeed = 5;

// Event listener to update speed
speedSlider.addEventListener("input", () => {
    const sliderValue = parseInt(speedSlider.value, 10);
    currentSpeed = sliderValue;
    animationSpeed = speedMap[sliderValue];
    // speedDisplay.textContent = `${animationSpeed}x`;
    console.log(`Current animation speed: ${animationSpeed}x`);
    canvasWrapper.UpdateSpeed(animationSpeed);
    updateAll();
});

speedUpButton.addEventListener("click", () => {
    if (currentSpeed < 9) {
        currentSpeed++;
        animationSpeed = speedMap[currentSpeed];
        // speedDisplay.textContent = `${animationSpeed}x`;
        speedSlider.value = currentSpeed;
        console.log(`Current animation speed: ${animationSpeed}x`);
        canvasWrapper.UpdateSpeed(animationSpeed);
        updateAll();
    } else {
        throw new Error("Speed up button clicked while at max speed. Should have been disabled.");
    }
});

slowDownButton.addEventListener("click", () => {
    if (currentSpeed > 1) {
        currentSpeed--;
        animationSpeed = speedMap[currentSpeed];
        // speedDisplay.textContent = `${animationSpeed}x`;
        speedSlider.value = currentSpeed;
        console.log(`Current animation speed: ${animationSpeed}x`);
        canvasWrapper.UpdateSpeed(animationSpeed);
        updateAll();
    } else {
        throw new Error("Slow down button clicked while at min speed. Should have been disabled.");
    }
});


function updateAll() {
    updateNextAndSkipButtons();
    updateBackAndSkipBackButtons();
    updateAutoPlayPauseButton();
    updateStartExitButton();
    updateAddRandomButton();
    updateClearButton();
    updateSpeedButtons();
}

function updateNextAndSkipButtons() {
    if (canvasWrapper.IsInAlgorithm() && !canvasWrapper.isAutoPlaying) {
        if (canvasWrapper.GetStep() < canvasWrapper.numSteps) {
            enableButton(nextButton);
        } else {
            disableButton(nextButton);
        }
        if (canvasWrapper.GetStep() < canvasWrapper.numSteps - 3) {
            enableButton(skipAheadButton);
        } else {
            disableButton(skipAheadButton);
        }
    } else {
        disableButton(nextButton);
        disableButton(skipAheadButton)
    }
}

function updateBackAndSkipBackButtons() {
    if (canvasWrapper.IsInAlgorithm() && !canvasWrapper.isAutoPlaying) {
        if (canvasWrapper.GetStep() >= 0) {
            enableButton(backButton);
        } else {
            disableButton(backButton);
        }
        if (canvasWrapper.GetStep() >= 3) {
            enableButton(skipBackButton);
        } else {
            disableButton(skipBackButton);
        }
    } else {
        disableButton(backButton);
        disableButton(skipBackButton);
    }
}

function updateAutoPlayPauseButton() {
    let play = "<i class=\"fa-solid fa-play\"></i>";
    let pause = "<i class=\"fa-solid fa-pause\"></i>";
    if (canvasWrapper.IsInAlgorithm()) {
        enableButton(autoPlayButton);
        if (canvasWrapper.isAutoPlaying) {
            autoPlayButton.innerHTML = pause;
            document.getElementById("auto-play-label").innerHTML = "Pause<br>&nbsp;";
        } else {
            autoPlayButton.innerHTML = play;
            document.getElementById("auto-play-label").innerHTML = "Auto<br>Play";
        }
    } else {
        disableButton(autoPlayButton);
        autoPlayButton.innerHTML = play;
        document.getElementById("auto-play-label").innerHTML = "Auto<br>Play";

    }
}

function updateStartExitButton() {
    if (canvasWrapper.IsInAlgorithm()) {
        startButton.innerText = "Exit";
    } else {
        startButton.innerText = "Start";
    }
    if (canvasWrapper.points.length > 1) {
        enableButton(startButton);
    } else {
        disableButton(startButton);
    }
}

function updateAddRandomButton() {
    if (!canvasWrapper.IsInAlgorithm()) {
        enableButton(randomButton);
        enableButton(random5Button)
    } else {
        disableButton(randomButton);
        disableButton(random5Button);
    }
}

function updateClearButton() {
    if (!canvasWrapper.IsInAlgorithm() && canvasWrapper.points.length > 0) {
        enableButton(clearButton);
    } else {
        disableButton(clearButton);
    }
}

function updateSpeedButtons() {
    if (!canvasWrapper.IsInAlgorithm()) {
        disableButton(speedUpButton);
        disableButton(slowDownButton);
        document.getElementById("speed-slider").disabled = true;
        return;
    } else {
        document.getElementById("speed-slider").disabled = false;
    }
    if (currentSpeed === 1) {
        disableButton(slowDownButton);
        enableButton(speedUpButton);
    } else if (currentSpeed === 9) {
        disableButton(speedUpButton);
        enableButton(slowDownButton);
    } else {
        enableButton(speedUpButton);
        enableButton(slowDownButton);
    }
}