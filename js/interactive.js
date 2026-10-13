const tasks = [
    {
        description:
            'Komplettera koden så att den skriver ut exakt: Hej, världen!',
        starter: 'print("")',
        expected: "Hej, världen!"
    },
    {
        description:
            'Ändra koden så att den skriver ut exakt: Jag lär mig Python!',
        starter: 'print("Hej, världen!")',
        expected: "Jag lär mig Python!"
    }
];

const taskSelect = document.querySelector("#task-select");
const taskDescription = document.querySelector("#task-description");
const codeInput = document.querySelector("#code-input");
const progress = document.querySelector("#progress");
const output = document.querySelector("#output");
const feedback = document.querySelector("#feedback");
const statusText = document.querySelector("#python-status");

const runButton = document.querySelector("#run-button");
const stopButton = document.querySelector("#stop-button");
const resetButton = document.querySelector("#reset-button");
const retryButton = document.querySelector("#retry-button");

let currentTask = 0;
let completed = [false, false];
let drafts = tasks.map(task => task.starter);

let worker = null;
let ready = false;
let running = false;
let timer = null;

function showFeedback(message, state = "") {
    feedback.textContent = message;
    feedback.dataset.state = state;
}

function updateButtons() {
    runButton.disabled = !ready || running;
    stopButton.disabled = !running;
    taskSelect.disabled = running;
    codeInput.readOnly = running;
}

function showTask() {
    taskDescription.textContent = tasks[currentTask].description;
    codeInput.value = drafts[currentTask];
    output.textContent = "Här visas din utskrift.";
    showFeedback("");
}

function updateProgress() {
    const count = completed.filter(Boolean).length;
    progress.textContent = `${count} av 2 uppgifter avklarade`;
}

function loadingFailed() {
    clearTimeout(timer);

    if (worker) {
        worker.terminate();
        worker = null;
    }

    ready = false;
    running = false;

    statusText.textContent =
        "Python kunde inte laddas. Kontrollera internetanslutningen och försök igen.";

    retryButton.hidden = false;
    updateButtons();
}

function startPython(message = "Laddar Python… Första gången kan det ta en stund.") {
    clearTimeout(timer);

    if (worker) {
        worker.terminate();
        worker = null;
    }

    ready = false;
    running = false;
    retryButton.hidden = true;
    statusText.textContent = message;
    updateButtons();

    let activeWorker;

    try {
        activeWorker = new Worker("js/python-worker.js", {
            type: "module"
        });
    } catch (error) {
        loadingFailed();
        return;
    }

    worker = activeWorker;

    // Avbryt om laddningen inte blir klar.
    timer = setTimeout(loadingFailed, 120000);

    activeWorker.onerror = () => {
        if (worker === activeWorker) {
            loadingFailed();
        }
    };

    activeWorker.onmessage = event => {
        // Ignorera svar från en gammal, stoppad worker.
        if (worker !== activeWorker) {
            return;
        }

        const data = event.data;

        if (data.type === "ready") {
            clearTimeout(timer);
            ready = true;
            statusText.textContent = "Python är redo.";
            updateButtons();
            return;
        }

        if (data.type === "load-error") {
            loadingFailed();
            return;
        }

        if (data.type !== "result" || !running) {
            return;
        }

        clearTimeout(timer);
        running = false;
        statusText.textContent = "Python är redo.";
        updateButtons();

        output.textContent = data.output || "(Ingen utskrift)";

        if (data.error) {
            showFeedback(`Pythonfel: ${data.error}`, "error");
            return;
        }

        // print() lägger normalt till en radbrytning sist.
        const actual = data.output
            .replace(/\r\n/g, "\n")
            .replace(/\n$/, "");

        if (actual === tasks[currentTask].expected) {
            completed[currentTask] = true;
            updateProgress();

            const message = completed.every(Boolean)
                ? "Rätt! Du har klarat båda uppgifterna."
                : "Rätt! Välj uppgift 2 i listan för att fortsätta.";

            showFeedback(message, "success");
        } else {
            showFeedback(
                "Koden kördes, men utskriften matchar inte uppgiften. Kontrollera text, mellanslag och skiljetecken.",
                "error"
            );
        }
    };
}

function stopExecution(message) {
    startPython("Körningen stoppades. Laddar Python igen…");
    output.textContent = "Körningen avbröts.";
    showFeedback(message, "error");
}

taskSelect.addEventListener("change", () => {
    drafts[currentTask] = codeInput.value;
    currentTask = Number(taskSelect.value);
    showTask();
});

runButton.addEventListener("click", () => {
    if (!ready || running) {
        return;
    }

    if (!codeInput.value.trim()) {
        showFeedback("Skriv lite Pythonkod först.", "error");
        return;
    }

    drafts[currentTask] = codeInput.value;
    running = true;
    updateButtons();

    output.textContent = "Kör koden…";
    statusText.textContent = "Python arbetar.";
    showFeedback("");

    // Uppgifterna är små: stoppa efter fem sekunder.
    timer = setTimeout(() => {
        stopExecution("Koden tog för lång tid. Kontrollera den och försök igen.");
    }, 5000);

    worker.postMessage({
        code: codeInput.value
    });
});

stopButton.addEventListener("click", () => {
    stopExecution("Du stoppade körningen.");
});

resetButton.addEventListener("click", () => {
    if (running) {
        startPython();
    }

    currentTask = 0;
    completed = [false, false];
    drafts = tasks.map(task => task.starter);
    taskSelect.value = "0";

    updateProgress();
    showTask();
});

retryButton.addEventListener("click", () => {
    startPython();
});

showTask();
updateProgress();
startPython();