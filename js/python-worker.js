let pyodide = null;

async function initializePython() {
    try {
        const { loadPyodide } = await import(
            "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs"
        );

        pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/"
        });

        self.postMessage({ type: "ready" });
    } catch (error) {
        self.postMessage({ type: "load-error" });
    }
}

self.onmessage = async event => {
    if (!pyodide) {
        return;
    }

    // Skicka koden som data, inte som del av vår Pythontext.
    pyodide.globals.set("__student_code", event.data.code);

    try {
        const result = await pyodide.runPythonAsync(`
def __run_lesson(source):
    import contextlib
    import io
    import json

    class LimitedOutput(io.StringIO):
        def write(self, text):
            if self.tell() + len(text) > 5000:
                raise RuntimeError("För mycket utskrift. Förkorta koden.")
            return super().write(text)

    output = LimitedOutput()
    error = None

    try:
        with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
            exec(
                compile(source, "<din kod>", "exec"),
                {"__name__": "__main__"}
            )
    except BaseException as problem:
        error = f"{type(problem).__name__}: {problem}"

    return json.dumps({
        "output": output.getvalue(),
        "error": error
    })

__run_lesson(__student_code)
        `);

        self.postMessage({
            type: "result",
            ...JSON.parse(result)
        });
    } catch (error) {
        self.postMessage({
            type: "result",
            output: "",
            error: "Ett tekniskt fel uppstod. Ladda om sidan och försök igen."
        });
    } finally {
        pyodide.globals.delete("__student_code");
    }
};

initializePython();