(function () {
    const PYODIDE_VERSION = '0.27.7';
    const PYODIDE_BASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
    const MAX_RUN_TIME_MS = 10000;
    const MAX_OUTPUT_LENGTH = 100000;

    class PythonRuntime {
        constructor() {
            this.worker = null;
            this.activeRun = null;
            this.ready = false;
        }

        get isReady() {
            return this.ready;
        }

        createWorker() {
            const workerSource = `
                const PYODIDE_BASE_URL = ${JSON.stringify(PYODIDE_BASE_URL)};
                let pyodide = null;
                let nextInputId = 0;
                const pendingInputs = new Map();

                self.onmessage = async event => {
                    if (event.data.type === 'input-response') {
                        const resolveInput = pendingInputs.get(event.data.id);
                        if (!resolveInput) return;
                        pendingInputs.delete(event.data.id);
                        resolveInput(event.data.value);
                        self.postMessage({ type: 'input-resumed' });
                        return;
                    }
                    if (event.data.type !== 'run') return;

                    try {
                        if (!pyodide) {
                            self.postMessage({ type: 'status', status: 'loading' });
                            importScripts(PYODIDE_BASE_URL + 'pyodide.js');
                            pyodide = await loadPyodide({ indexURL: PYODIDE_BASE_URL });
                            self.postMessage({ type: 'ready' });
                        }

                        const stderr = [];
                        pyodide.setStdout({ batched: text => self.postMessage({ type: 'stdout', text }) });
                        pyodide.setStderr({ batched: text => stderr.push(text) });
                        pyodide.setStdin({
                            stdin: () => null
                        });
                        pyodide.globals.set('_lesson_code', event.data.code);
                        pyodide.globals.set('_interactive_input', prompt => new Promise(resolve => {
                            const id = ++nextInputId;
                            pendingInputs.set(id, resolve);
                            self.postMessage({ type: 'input-request', id, prompt: String(prompt ?? '') });
                        }));
                        pyodide.globals.set('_lesson_setup_code', event.data.setupCode || '');
                        self.postMessage({ type: 'started' });

                        try {
                            await pyodide.runPythonAsync(\`
import ast as _ast

async def _workbook_input(prompt=''):
    return await _interactive_input(str(prompt))

_lesson_namespace = {
    '__builtins__': __builtins__,
    '_workbook_input': _workbook_input
}
try:
    if _lesson_setup_code:
        exec(_lesson_setup_code, _lesson_namespace)

    class _InputAwaitTransformer(_ast.NodeTransformer):
        def visit_Call(self, node):
            self.generic_visit(node)
            if isinstance(node.func, _ast.Name) and node.func.id == 'input':
                replacement = _ast.Await(value=_ast.Call(
                    func=_ast.Name(id='_workbook_input', ctx=_ast.Load()),
                    args=node.args,
                    keywords=node.keywords
                ))
                return _ast.copy_location(replacement, node)
            return node

    _lesson_tree = _InputAwaitTransformer().visit(_ast.parse(_lesson_code))
    _lesson_main = _ast.AsyncFunctionDef(
        name='_lesson_main',
        args=_ast.arguments(
            posonlyargs=[], args=[], vararg=None, kwonlyargs=[],
            kw_defaults=[], kwarg=None, defaults=[]
        ),
        body=_lesson_tree.body or [_ast.Pass()],
        decorator_list=[]
    )
    _lesson_module = _ast.fix_missing_locations(_ast.Module(body=[_lesson_main], type_ignores=[]))
    exec(compile(_lesson_module, '<student code>', 'exec'), _lesson_namespace)
    await _lesson_namespace['_lesson_main']()
finally:
    if '_test_original_randint' in _lesson_namespace:
        _lesson_namespace['_test_random'].randint = _lesson_namespace['_test_original_randint']
\`);
                            self.postMessage({ type: 'complete' });
                        } catch (error) {
                            self.postMessage({
                                type: 'python-error',
                                error: stderr.join('\\n') || (error instanceof Error ? error.message : String(error))
                            });
                        } finally {
                            pyodide.globals.delete('_lesson_code');
                            pyodide.globals.delete('_interactive_input');
                            pyodide.globals.delete('_lesson_setup_code');
                            pyodide.globals.delete('_workbook_input');
                            pyodide.globals.delete('_InputAwaitTransformer');
                            pyodide.globals.delete('_lesson_tree');
                            pyodide.globals.delete('_lesson_main');
                            pyodide.globals.delete('_lesson_module');
                            pyodide.globals.delete('_lesson_namespace');
                        }
                    } catch (error) {
                        self.postMessage({
                            type: 'runtime-error',
                            error: error instanceof Error ? error.message : String(error)
                        });
                    }
                };
            `;
            const blobUrl = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
            const worker = new Worker(blobUrl);
            URL.revokeObjectURL(blobUrl);

            worker.addEventListener('message', event => this.handleWorkerMessage(worker, event.data));
            worker.addEventListener('error', event => {
                if (worker !== this.worker) return;
                event.preventDefault();
                this.finish({
                    output: event.message || 'The Python worker failed unexpectedly.',
                    hasError: true
                });
                this.terminateWorker();
            });
            return worker;
        }

        run(code, {
            onStatus = () => {},
            onInput = (prompt, respond) => respond(window.prompt(prompt) ?? ''),
            setupCode = ''
        } = {}) {
            if (this.activeRun) {
                return Promise.reject(new Error('Python is already running.'));
            }

            if (!this.worker) {
                this.worker = this.createWorker();
                this.ready = false;
            }

            onStatus('loading');
            return new Promise(resolve => {
                this.activeRun = {
                    resolve,
                    onStatus,
                    onInput,
                    output: [],
                    programOutput: [],
                    inputCount: 0,
                    outputLength: 0,
                    timeoutId: null
                };
                this.worker.postMessage({ type: 'run', code, setupCode });
            });
        }

        async runTests(code, cases, { onStatus = () => {} } = {}) {
            if (this.activeRun) {
                return cases.map(testCase => ({
                    name: testCase.name,
                    output: 'Python is already running.',
                    programOutput: '',
                    inputCount: 0,
                    hasError: true
                }));
            }
            const results = [];
            for (const testCase of cases) {
                let inputIndex = 0;
                const result = await this.run(code, {
                    setupCode: testCase.setupCode || '',
                    onStatus,
                    onInput: (prompt, respond, transcript) => {
                        if (testCase.inputProvider) {
                            respond(String(testCase.inputProvider(prompt, transcript, inputIndex++)));
                            return;
                        }
                        const inputs = testCase.inputs || [];
                        if (inputIndex >= inputs.length) {
                            this.stop('The behavior test ran out of supplied input values.');
                            return;
                        }
                        respond(String(inputs[inputIndex++]));
                    }
                });
                results.push({ name: testCase.name, ...result });
                if (result.hasError) break;
            }
            return results;
        }

        handleWorkerMessage(worker, message) {
            if (worker !== this.worker) return;

            if (message.type === 'status') {
                this.activeRun?.onStatus(message.status);
            } else if (message.type === 'ready') {
                this.ready = true;
            } else if (message.type === 'started') {
                if (!this.activeRun) return;
                this.activeRun.onStatus('running');
                this.startExecutionTimeout();
            } else if (message.type === 'input-request') {
                if (!this.activeRun) return;
                this.activeRun.inputCount += 1;
                clearTimeout(this.activeRun.timeoutId);
                this.activeRun.timeoutId = null;
                try {
                    this.activeRun.onInput(message.prompt, value => {
                        if (worker !== this.worker || !this.activeRun) return;
                        this.appendOutput(`${message.prompt}${value}`);
                        if (this.activeRun) worker.postMessage({ type: 'input-response', id: message.id, value });
                    }, this.activeRun.output.join('\n'));
                } catch (error) {
                    this.stop(`Could not collect input: ${error instanceof Error ? error.message : String(error)}`);
                }
            } else if (message.type === 'input-resumed') {
                if (this.activeRun) this.startExecutionTimeout();
            } else if (message.type === 'stdout') {
                this.activeRun?.programOutput.push(message.text);
                this.appendOutput(message.text);
            } else if (message.type === 'complete') {
                this.finish({ output: this.activeRun?.output.join('\n') || '', hasError: false });
            } else if (message.type === 'python-error') {
                const output = [this.activeRun?.output.join('\n'), message.error].filter(Boolean).join('\n');
                this.finish({ output, hasError: true });
            } else if (message.type === 'runtime-error') {
                this.finish({ output: message.error, hasError: true, runtimeError: true });
                this.terminateWorker();
            }
        }

        appendOutput(text) {
            if (!this.activeRun) return;
            const separator = this.activeRun.output.length ? '\n' : '';
            const remaining = MAX_OUTPUT_LENGTH - this.activeRun.outputLength - separator.length;
            if (remaining <= 0) {
                this.stop('Output exceeded the 100,000 character safety limit.');
                return;
            }
            const chunk = text.slice(0, remaining);
            this.activeRun.output.push(chunk);
            this.activeRun.outputLength += separator.length + chunk.length;
            if (chunk.length < text.length || this.activeRun.outputLength >= MAX_OUTPUT_LENGTH) {
                this.stop('Output exceeded the 100,000 character safety limit.');
            }
        }

        startExecutionTimeout() {
            if (!this.activeRun) return;
            clearTimeout(this.activeRun.timeoutId);
            this.activeRun.timeoutId = setTimeout(() => {
                this.stop(`Execution exceeded ${MAX_RUN_TIME_MS / 1000} seconds and was stopped to keep the editor responsive.`);
            }, MAX_RUN_TIME_MS);
        }

        createTerminalInputHandler(consoleElement) {
            return (prompt, respond, transcript = '') => {
                const output = document.createElement('div');
                output.textContent = transcript;
                const form = document.createElement('form');
                form.className = 'python-terminal-input';
                const label = document.createElement('label');
                label.textContent = prompt || 'Input:';
                const field = document.createElement('input');
                field.type = 'text';
                field.autocomplete = 'off';
                field.setAttribute('aria-label', prompt || 'Python input');
                const submit = document.createElement('button');
                submit.type = 'submit';
                submit.textContent = 'Enter';
                form.append(label, field, submit);
                consoleElement.replaceChildren(output, form);

                form.addEventListener('submit', event => {
                    event.preventDefault();
                    field.disabled = true;
                    submit.disabled = true;
                    const enteredValue = field.value;
                    output.textContent = `${transcript}${transcript ? '\n' : ''}${prompt}${enteredValue}`;
                    form.remove();
                    respond(enteredValue);
                }, { once: true });
                field.focus();
            };
        }

        finish(result) {
            if (!this.activeRun) return;
            clearTimeout(this.activeRun.timeoutId);
            const { resolve } = this.activeRun;
            const programOutput = this.activeRun.programOutput.join('\n');
            const inputCount = this.activeRun.inputCount;
            this.activeRun = null;
            resolve({ ...result, programOutput, inputCount });
        }

        terminateWorker() {
            if (!this.worker) return;
            this.worker.terminate();
            this.worker = null;
            this.ready = false;
        }

        stop(reason = 'Execution stopped.') {
            if (!this.activeRun) return false;
            const output = this.activeRun.output.join('\n');
            this.terminateWorker();
            this.finish({
                output: [output, reason].filter(Boolean).join('\n'),
                hasError: true,
                stopped: true
            });
            return true;
        }
    }

    window.pythonRuntime = new PythonRuntime();
})();
