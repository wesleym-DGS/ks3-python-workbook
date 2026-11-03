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

                self.onmessage = async event => {
                    if (event.data.type !== 'run') return;

                    try {
                        if (!pyodide) {
                            self.postMessage({ type: 'status', status: 'loading' });
                            importScripts(PYODIDE_BASE_URL + 'pyodide.js');
                            pyodide = await loadPyodide({ indexURL: PYODIDE_BASE_URL });
                            self.postMessage({ type: 'ready' });
                        }

                        const stderr = [];
                        const inputBytes = new TextEncoder().encode(event.data.stdin || '');
                        let inputIndex = 0;
                        pyodide.setStdout({ batched: text => self.postMessage({ type: 'stdout', text }) });
                        pyodide.setStderr({ batched: text => stderr.push(text) });
                        pyodide.setStdin({
                            stdin: () => inputIndex < inputBytes.length ? inputBytes[inputIndex++] : null
                        });
                        pyodide.globals.set('_lesson_code', event.data.code);
                        self.postMessage({ type: 'started' });

                        try {
                            await pyodide.runPythonAsync('exec(_lesson_code, {})');
                            self.postMessage({ type: 'complete' });
                        } catch (error) {
                            self.postMessage({
                                type: 'python-error',
                                error: stderr.join('\\n') || (error instanceof Error ? error.message : String(error))
                            });
                        } finally {
                            pyodide.globals.delete('_lesson_code');
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

        run(code, { onStatus = () => {}, stdin = '' } = {}) {
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
                    output: [],
                    outputLength: 0,
                    timeoutId: null
                };
                this.worker.postMessage({ type: 'run', code, stdin });
            });
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
                this.activeRun.timeoutId = setTimeout(() => {
                    this.stop(`Execution exceeded ${MAX_RUN_TIME_MS / 1000} seconds and was stopped to keep the editor responsive.`);
                }, MAX_RUN_TIME_MS);
            } else if (message.type === 'stdout') {
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

        finish(result) {
            if (!this.activeRun) return;
            clearTimeout(this.activeRun.timeoutId);
            const { resolve } = this.activeRun;
            this.activeRun = null;
            resolve(result);
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
