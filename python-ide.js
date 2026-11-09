(function () {
    const CODEMIRROR_VERSION = '6.0.1';
    const PYTHON_LANGUAGE_VERSION = '6.2.1';
    const CODEMIRROR_VIEW_VERSION = '6.36.5';
    const CODEMIRROR_LANGUAGE_VERSION = '6.13.1';
    const LEZER_HIGHLIGHT_VERSION = '1.2.5';
    let editorModules;

    function loadEditorModules() {
        if (!editorModules) {
            editorModules = Promise.all([
                import(`https://esm.sh/codemirror@${CODEMIRROR_VERSION}`),
                import(`https://esm.sh/@codemirror/lang-python@${PYTHON_LANGUAGE_VERSION}`),
                import(`https://esm.sh/@codemirror/view@${CODEMIRROR_VIEW_VERSION}`),
                import(`https://esm.sh/@codemirror/language@${CODEMIRROR_LANGUAGE_VERSION}`),
                import(`https://esm.sh/@lezer/highlight@${LEZER_HIGHLIGHT_VERSION}`)
            ]).then(([codemirror, pythonLanguage, view, language, highlight]) => ({
                EditorView: codemirror.EditorView,
                basicSetup: codemirror.basicSetup,
                python: pythonLanguage.python,
                placeholder: view.placeholder,
                HighlightStyle: language.HighlightStyle,
                syntaxHighlighting: language.syntaxHighlighting,
                tags: highlight.tags
            }));
        }
        return editorModules;
    }

    class PythonIDE {
        constructor(root) {
            this.root = root;
            this.valueBeforeReady = root.querySelector('[data-ide-editor]')?.value || '';
            this.placeholderText = root.dataset.placeholder ||
                root.querySelector('[data-ide-editor]')?.placeholder ||
                '# Write Python code here';
            this.view = null;
            this.loadError = null;

            this.root.replaceChildren();
            this.root.setAttribute('aria-label', 'Python code editor');
            this.root.setAttribute('aria-busy', 'true');
            this.root.innerHTML = '<div class="python-ide-loading" role="status">Loading code editor…</div>';
            this.root.addEventListener('keydown', event => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                    event.preventDefault();
                    this.dispatch('ide-run');
                }
            });

            this.ready = loadEditorModules().then(modules => {
                this.root.replaceChildren();
                this.view = new modules.EditorView({
                    doc: this.valueBeforeReady,
                    extensions: [
                        modules.basicSetup,
                        modules.python(),
                        modules.placeholder(this.placeholderText),
                        modules.syntaxHighlighting(modules.HighlightStyle.define([
                            { tag: [modules.tags.keyword, modules.tags.controlKeyword], color: 'var(--python-ide-keyword)' },
                            { tag: modules.tags.operatorKeyword, color: 'var(--python-ide-constant)' },
                            { tag: modules.tags.string, color: 'var(--python-ide-string)' },
                            { tag: [modules.tags.number, modules.tags.bool, modules.tags.null], color: 'var(--python-ide-number)' },
                            { tag: modules.tags.comment, color: 'var(--python-ide-comment)' },
                            { tag: modules.tags.function(modules.tags.variableName), color: 'var(--python-ide-function)' },
                            { tag: modules.tags.definition(modules.tags.variableName), color: 'var(--python-ide-variable)' },
                            { tag: modules.tags.variableName, color: 'var(--python-ide-variable)' },
                            { tag: modules.tags.typeName, color: 'var(--python-ide-type)' },
                            { tag: [modules.tags.operator, modules.tags.punctuation, modules.tags.bracket], color: 'var(--python-ide-foreground)' }
                        ])),
                        modules.EditorView.updateListener.of(update => {
                            if (!update.docChanged) return;
                            this.valueBeforeReady = update.state.doc.toString();
                            this.dispatch('ide-change', { value: this.valueBeforeReady });
                        }),
                        modules.EditorView.theme({
                            '&': {
                                height: '100%',
                                minHeight: '300px',
                                backgroundColor: '#1e1e1e',
                                color: '#d4d4d4',
                                fontSize: '13px'
                            },
                            '&.cm-focused': { outline: 'none' },
                            '.cm-content': {
                                fontFamily: "'Fira Code', monospace",
                                caretColor: '#0e8e6f'
                            },
                            '.cm-gutters': {
                                backgroundColor: '#252526',
                                color: '#64748b',
                                borderRight: '1px solid #334155'
                            },
                            '.cm-activeLineGutter': { backgroundColor: '#2a2d2e' },
                            '.cm-activeLine': { backgroundColor: 'rgba(255, 255, 255, 0.035)' },
                            '.cm-cursor': { borderLeftColor: '#0e8e6f' },
                            '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
                                backgroundColor: 'rgba(79, 70, 229, 0.45)'
                            }
                        })
                    ],
                    parent: this.root
                });
                this.root.removeAttribute('aria-busy');
                return this.view;
            }).catch(error => {
                this.loadError = error;
                this.root.removeAttribute('aria-busy');
                this.root.classList.add('python-ide-load-failed');
                this.root.innerHTML = '<div class="python-ide-load-error" role="alert">The code editor could not load. Check your internet connection and reload this page.</div>';
                console.error('Could not load the CodeMirror editor.', error);
                return null;
            });
        }

        get value() {
            return this.view ? this.view.state.doc.toString() : this.valueBeforeReady;
        }

        set value(value) {
            this.setValue(value);
        }

        setValue(value) {
            const nextValue = String(value);
            this.valueBeforeReady = nextValue;
            if (this.view) {
                this.view.dispatch({
                    changes: { from: 0, to: this.view.state.doc.length, insert: nextValue }
                });
            } else {
                this.dispatch('ide-change', { value: nextValue });
            }
        }

        focus() {
            if (this.view) {
                this.view.focus();
            } else {
                this.ready.then(view => view?.focus());
            }
        }

        format() {
            this.setValue(this.value.split('\n').map(line => line.trimEnd()).join('\n'));
        }

        clear() {
            this.setValue('');
        }

        run(options) {
            return this.ready.then(view => {
                if (!view) {
                    throw new Error('The CodeMirror editor is unavailable.');
                }
                if (!window.pythonRuntime) {
                    throw new Error('Load python-runtime.js before running Python code.');
                }
                return window.pythonRuntime.run(this.value, options);
            });
        }

        dispatch(name, detail = {}) {
            this.root.dispatchEvent(new CustomEvent(name, {
                bubbles: true,
                detail
            }));
        }

        static mount(root) {
            if (!root) {
                throw new Error('PythonIDE requires an editor container.');
            }
            return new PythonIDE(root);
        }
    }

    window.PythonIDE = PythonIDE;
})();
