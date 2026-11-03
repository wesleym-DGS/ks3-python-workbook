(function () {
    /*
     * Mount on a container with [data-ide-editor], [data-ide-gutter],
     * [data-ide-highlight], and [data-ide-highlight-code] children.
     * Instances emit ide-change and ide-run events from their container.
     */
    const KEYWORDS = new Set([
        'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
        'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
        'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
        'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try',
        'while', 'with', 'yield'
    ]);
    const BUILTINS = new Set([
        'abs', 'bool', 'dict', 'enumerate', 'float', 'input', 'int', 'len',
        'list', 'max', 'min', 'print', 'range', 'set', 'str', 'sum', 'tuple'
    ]);
    const TOKEN_PATTERN = /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[^\n]*|\b(?:False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b|\b(?:abs|bool|dict|enumerate|float|input|int|len|list|max|min|print|range|set|str|sum|tuple)\b|\b\d+(?:\.\d+)?\b)/g;
    const INDENT = '    ';

    function escapeHTML(text) {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    class PythonIDE {
        constructor(root) {
            this.root = root;
            this.textarea = root.querySelector('[data-ide-editor]');
            this.gutter = root.querySelector('[data-ide-gutter]');
            this.highlight = root.querySelector('[data-ide-highlight]');
            this.highlightCode = root.querySelector('[data-ide-highlight-code]');

            if (!this.textarea || !this.gutter || !this.highlight || !this.highlightCode) {
                throw new Error('PythonIDE requires editor, gutter, and syntax-highlight elements.');
            }

            this.textarea.addEventListener('input', () => this.refresh(true));
            this.textarea.addEventListener('keydown', event => this.handleKeyDown(event));
            this.textarea.addEventListener('scroll', () => this.syncScroll());
            this.refresh(false);
        }

        get value() {
            return this.textarea.value;
        }

        setValue(value) {
            this.textarea.value = value;
            this.refresh(true);
        }

        focus() {
            this.textarea.focus();
        }

        format() {
            this.setValue(this.value.split('\n').map(line => line.trimEnd()).join('\n'));
        }

        clear() {
            this.setValue('');
        }

        run(options) {
            if (!window.pythonRuntime) {
                throw new Error('Load python-runtime.js before running Python code.');
            }
            return window.pythonRuntime.run(this.value, options);
        }

        refresh(notify) {
            const code = this.value;
            this.renderLineNumbers(code);
            this.renderSyntaxHighlighting(code);
            this.syncScroll();

            if (notify) {
                this.root.dispatchEvent(new CustomEvent('ide-change', {
                    bubbles: true,
                    detail: { value: code }
                }));
            }
        }

        syncScroll() {
            this.highlight.scrollTop = this.textarea.scrollTop;
            this.highlight.scrollLeft = this.textarea.scrollLeft;
            this.gutter.scrollTop = this.textarea.scrollTop;
        }

        renderLineNumbers(code) {
            const lineCount = code.split('\n').length;
            const numbers = [];
            for (let line = 1; line <= lineCount; line++) {
                numbers.push(`<div class="python-ide-line-number">${line}</div>`);
            }
            this.gutter.innerHTML = numbers.join('');
        }

        renderSyntaxHighlighting(code) {
            let highlighted = '';
            let lastIndex = 0;
            let match;

            TOKEN_PATTERN.lastIndex = 0;
            while ((match = TOKEN_PATTERN.exec(code)) !== null) {
                highlighted += escapeHTML(code.slice(lastIndex, match.index));
                const token = match[0];
                let className = 'tok-number';

                if (token.startsWith('#')) {
                    className = 'tok-comment';
                } else if (token.startsWith('"') || token.startsWith("'")) {
                    const stringContent = escapeHTML(token).replace(
                        /(\\[\\'"abfnrtv])/g,
                        '<span class="tok-escape">$1</span>'
                    );
                    highlighted += `<span class="tok-string">${stringContent}</span>`;
                    lastIndex = TOKEN_PATTERN.lastIndex;
                    continue;
                } else if (KEYWORDS.has(token)) {
                    className = 'tok-keyword';
                } else if (BUILTINS.has(token)) {
                    className = 'tok-builtin';
                }

                highlighted += `<span class="${className}">${escapeHTML(token)}</span>`;
                lastIndex = TOKEN_PATTERN.lastIndex;
            }

            highlighted += escapeHTML(code.slice(lastIndex));
            this.highlightCode.innerHTML = highlighted + '\n';
        }

        replaceSelection(text, selectionStart, selectionEnd, cursorOffset) {
            const value = this.value;
            this.textarea.value = value.slice(0, selectionStart) + text + value.slice(selectionEnd);
            const cursor = selectionStart + cursorOffset;
            this.textarea.setSelectionRange(cursor, cursor);
            this.refresh(true);
        }

        handleKeyDown(event) {
            const textarea = this.textarea;
            const value = textarea.value;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;

            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                this.root.dispatchEvent(new CustomEvent('ide-run', { bubbles: true }));
                return;
            }

            if (event.key === 'Tab') {
                event.preventDefault();
                if (event.shiftKey) {
                    this.outdentSelection(start, end);
                } else if (start !== end && value.slice(start, end).includes('\n')) {
                    this.indentSelection(start, end);
                } else {
                    this.replaceSelection(INDENT, start, end, INDENT.length);
                }
                return;
            }

            if (start === end && value[start] === event.key && ')]}\'"'.includes(event.key)) {
                event.preventDefault();
                textarea.setSelectionRange(start + 1, start + 1);
                return;
            }

            if (event.key === 'Enter') {
                event.preventDefault();
                this.insertNewline(start, end);
                return;
            }

            if (event.key === 'Backspace' && start === end && start > 0) {
                const lineStart = value.lastIndexOf('\n', start - 1) + 1;
                const beforeCursor = value.slice(lineStart, start);
                if (/^ *$/.test(beforeCursor) && beforeCursor.length > 0) {
                    event.preventDefault();
                    const removeCount = beforeCursor.length % INDENT.length || INDENT.length;
                    this.replaceSelection('', start - removeCount, end, 0);
                    return;
                }
            }

            const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
            if (pairs[event.key]) {
                const closing = pairs[event.key];
                if (start === end && value[start] === closing) {
                    event.preventDefault();
                    textarea.setSelectionRange(start + 1, start + 1);
                    return;
                }
                event.preventDefault();
                const selected = value.slice(start, end);
                const insertion = selected ? `${event.key}${selected}${closing}` : `${event.key}${closing}`;
                this.replaceSelection(insertion, start, end, selected ? 1 + selected.length : 1);
            }
        }

        insertNewline(start, end) {
            const value = this.value;
            const lineStart = value.lastIndexOf('\n', start - 1) + 1;
            const currentLine = value.slice(lineStart, start);
            const indentation = (currentLine.match(/^ */) || [''])[0];
            const isBlockHeader = /:\s*(?:#.*)?$/.test(currentLine.trimEnd());
            const isClause = /^(?:else|elif|except|finally)\b/.test(currentLine.trim());
            const nextIndent = isClause && !isBlockHeader
                ? indentation.slice(0, Math.max(0, indentation.length - INDENT.length))
                : indentation + (isBlockHeader ? INDENT : '');
            this.replaceSelection(`\n${nextIndent}`, start, end, 1 + nextIndent.length);
        }

        indentSelection(start, end) {
            const value = this.value;
            const lineStart = value.lastIndexOf('\n', start - 1) + 1;
            const selectionEndLine = value.indexOf('\n', end);
            const lineEnd = selectionEndLine === -1 ? value.length : selectionEndLine;
            const selectedLines = value.slice(lineStart, lineEnd).split('\n');
            const updated = selectedLines.map(line => INDENT + line).join('\n');
            this.textarea.value = value.slice(0, lineStart) + updated + value.slice(lineEnd);
            const addedBeforeStart = INDENT.length;
            const addedWithinSelection = INDENT.length * (selectedLines.length - 1);
            this.textarea.setSelectionRange(start + addedBeforeStart, end + addedBeforeStart + addedWithinSelection);
            this.refresh(true);
        }

        outdentSelection(start, end) {
            const value = this.value;
            const lineStart = value.lastIndexOf('\n', start - 1) + 1;
            const selectionEndLine = value.indexOf('\n', end);
            const lineEnd = selectionEndLine === -1 ? value.length : selectionEndLine;
            const selectedLines = value.slice(lineStart, lineEnd).split('\n');
            let removedBeforeStart = 0;
            let removedInSelection = 0;
            const updated = selectedLines.map((line, index) => {
                const removeCount = line.startsWith(INDENT) ? INDENT.length : line.startsWith(' ') ? 1 : 0;
                if (index === 0) removedBeforeStart = removeCount;
                removedInSelection += removeCount;
                return line.slice(removeCount);
            }).join('\n');
            this.textarea.value = value.slice(0, lineStart) + updated + value.slice(lineEnd);
            this.textarea.setSelectionRange(
                start - removedBeforeStart,
                Math.max(start - removedBeforeStart, end - removedInSelection)
            );
            this.refresh(true);
        }
    }

    window.PythonIDE = {
        mount(root) {
            if (!root) {
                throw new Error('PythonIDE mount target was not found.');
            }
            return new PythonIDE(root);
        },
        mountAll(scope = document) {
            return Array.from(scope.querySelectorAll('[data-python-ide]'), root => new PythonIDE(root));
        }
    };
})();
