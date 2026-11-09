import React, { useRef } from 'react';
import './CodeEditorWithSyntax.css';

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Single-pass deterministic lexers — guarantees zero HTML tag corruption or "token" leaks
const CPP_TOKEN_REGEX = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(#include\b[^\n]*|#define\b[^\n]*)|(\b(?:int|long|double|float|char|bool|void|string|vector|pair|map|set|unordered_map|unordered_set|queue|stack|deque|priority_queue|TreeNode|ListNode|size_t)\b)|(\b(?:class|public|private|protected|struct|return|while|for|if|else|switch|case|break|continue|new|delete|nullptr|true|false|using|namespace|const|auto|template|typename)\b)|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_]\w*(?=\s*\())|([a-zA-Z_]\w*)|([^\s\w]+|\s+)/g;

const PY_TOKEN_REGEX = /(#[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|"""[\s\S]*?"""|'''[\s\S]*?''')|(\b(?:import|from)\b[^\n]*)|(\b(?:int|float|str|bool|list|dict|set|tuple)\b)|(\b(?:def|class|return|while|for|if|elif|else|in|is|not|and|or|pass|as|try|except|finally|with|yield|lambda|self|True|False|None)\b)|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_]\w*(?=\s*\())|([a-zA-Z_]\w*)|([^\s\w]+|\s+)/g;

function highlightCode(code, language) {
  if (!code) return '&nbsp;';

  const regex = language === 'python' ? PY_TOKEN_REGEX : CPP_TOKEN_REGEX;
  regex.lastIndex = 0;

  let output = '';
  let match;

  while ((match = regex.exec(code)) !== null) {
    const [full, comment, str, prep, type, kw, num, fn] = match;

    if (comment) {
      output += `<span class="tok-comment">${escapeHtml(comment)}</span>`;
    } else if (str) {
      output += `<span class="tok-string">${escapeHtml(str)}</span>`;
    } else if (prep) {
      output += `<span class="tok-preprocessor">${escapeHtml(prep)}</span>`;
    } else if (type) {
      output += `<span class="tok-type">${escapeHtml(type)}</span>`;
    } else if (kw) {
      output += `<span class="tok-keyword">${escapeHtml(kw)}</span>`;
    } else if (num) {
      output += `<span class="tok-number">${escapeHtml(num)}</span>`;
    } else if (fn) {
      output += `<span class="tok-function">${escapeHtml(fn)}</span>`;
    } else {
      output += escapeHtml(full);
    }
  }

  // Preserve trailing newline if user just pressed Enter
  if (code.endsWith('\n')) {
    output += '\n&nbsp;';
  }

  return output || '&nbsp;';
}

const BRACKET_PAIRS = {
  '(': ')',
  '{': '}',
  '[': ']',
  '"': '"',
  "'": "'",
  '`': '`'
};

const CLOSING_CHARS = new Set([')', '}', ']', '"', "'", '`']);

export const CodeEditorWithSyntax = ({ code, setCode, language }) => {
  const textareaRef = useRef(null);
  const preRef = useRef(null);
  const gutterRef = useRef(null);

  const handleScroll = (e) => {
    if (preRef.current) {
      preRef.current.scrollTop = e.target.scrollTop;
      preRef.current.scrollLeft = e.target.scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.target.scrollTop;
    }
  };

  const updateCodeWithCursor = (newCode, cursorPosition) => {
    setCode(newCode);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = cursorPosition;
        textareaRef.current.selectionEnd = cursorPosition;
      }
    }, 0);
  };

  const handleKeyDown = (e) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const isSelected = start !== end;
    const prevChar = start > 0 ? code[start - 1] : '';
    const nextChar = start < code.length ? code[start] : '';

    // 1. TAB & SHIFT+TAB HANDLING (Indent / Unindent)
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!isSelected) {
        const newCode = code.substring(0, start) + '    ' + code.substring(end);
        updateCodeWithCursor(newCode, start + 4);
      } else {
        // Multi-line indent/unindent
        const lines = code.substring(start, end).split('\n');
        const updated = e.shiftKey
          ? lines.map(line => line.startsWith('    ') ? line.substring(4) : (line.startsWith(' ') ? line.trimStart() : line)).join('\n')
          : lines.map(line => '    ' + line).join('\n');
        const newCode = code.substring(0, start) + updated + code.substring(end);
        setCode(newCode);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = start;
            textareaRef.current.selectionEnd = start + updated.length;
          }
        }, 0);
      }
      return;
    }

    // 2. COMMENT TOGGLE (Ctrl+/ or Cmd+/)
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      const commentPrefix = language === 'python' ? '# ' : '// ';
      const lineStart = code.lastIndexOf('\n', start - 1) + 1;
      let lineEnd = code.indexOf('\n', end);
      if (lineEnd === -1) lineEnd = code.length;

      const lines = code.substring(lineStart, lineEnd).split('\n');
      const allCommented = lines.every(l => l.trim().startsWith(commentPrefix.trim()));

      const modifiedLines = allCommented
        ? lines.map(l => l.replace(new RegExp('^(\\s*)' + (language === 'python' ? '# ?' : '\\/\\/ ?')), '$1'))
        : lines.map(l => {
            const indentMatch = l.match(/^(\s*)/);
            const indent = indentMatch ? indentMatch[1] : '';
            return indent + commentPrefix + l.substring(indent.length);
          });

      const updatedBlock = modifiedLines.join('\n');
      const newCode = code.substring(0, lineStart) + updatedBlock + code.substring(lineEnd);
      setCode(newCode);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = lineStart;
          textareaRef.current.selectionEnd = lineStart + updatedBlock.length;
        }
      }, 0);
      return;
    }

    // 3. ENTER KEY HANDLING (Smart Indentation & Brace Expansion)
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentLineStart = code.lastIndexOf('\n', start - 1) + 1;
      const currentLine = code.substring(currentLineStart, start);
      const indentMatch = currentLine.match(/^(\s*)/);
      let indent = indentMatch ? indentMatch[1] : '';

      // Special Case: Enter pressed between { and }
      if (prevChar === '{' && nextChar === '}') {
        const extraIndent = '    ';
        const insertion = '\n' + indent + extraIndent + '\n' + indent;
        const newCode = code.substring(0, start) + insertion + code.substring(end);
        updateCodeWithCursor(newCode, start + 1 + indent.length + extraIndent.length);
        return;
      }

      // If line ends with opening brace/colon, increase indent
      const trimmedLine = currentLine.trim();
      if (trimmedLine.endsWith('{') || trimmedLine.endsWith(':') || trimmedLine.endsWith('(')) {
        indent += '    ';
      }

      const insertion = '\n' + indent;
      const newCode = code.substring(0, start) + insertion + code.substring(end);
      updateCodeWithCursor(newCode, start + insertion.length);
      return;
    }

    // 4. AUTO-CLOSING BRACKETS & QUOTES: ( ) { } [ ] " " ' ' ` `
    if (BRACKET_PAIRS[e.key]) {
      const closingPair = BRACKET_PAIRS[e.key];

      // If text is highlighted, wrap it in the pair (VS Code feature)
      if (isSelected) {
        e.preventDefault();
        const selectedText = code.substring(start, end);
        const wrapped = e.key + selectedText + closingPair;
        const newCode = code.substring(0, start) + wrapped + code.substring(end);
        setCode(newCode);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = start + 1;
            textareaRef.current.selectionEnd = end + 1;
          }
        }, 0);
        return;
      }

      // If quote typed and already right before matching quote, skip over it
      if ((e.key === '"' || e.key === "'" || e.key === '`') && nextChar === e.key) {
        e.preventDefault();
        updateCodeWithCursor(code, start + 1);
        return;
      }

      // Insert pair and place cursor in the middle
      e.preventDefault();
      const insertion = e.key + closingPair;
      const newCode = code.substring(0, start) + insertion + code.substring(end);
      updateCodeWithCursor(newCode, start + 1);
      return;
    }

    // 5. SKIP-OVER CLOSING CHARACTERS: ) } ]
    if (CLOSING_CHARS.has(e.key) && !isSelected) {
      if (nextChar === e.key) {
        e.preventDefault();
        updateCodeWithCursor(code, start + 1);
        return;
      }
    }

    // 6. SMART BACKSPACE (Delete both brackets/quotes if cursor is between them)
    if (e.key === 'Backspace' && !isSelected && start > 0) {
      const pair = prevChar + nextChar;
      if (pair === '()' || pair === '{}' || pair === '[]' || pair === '""' || pair === "''" || pair === '``') {
        e.preventDefault();
        const newCode = code.substring(0, start - 1) + code.substring(start + 1);
        updateCodeWithCursor(newCode, start - 1);
        return;
      }
    }
  };

  const lineCount = Math.max((code || '').split('\n').length, 18);
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="syntax-editor-container">
      {/* Line Numbers Gutter */}
      <div className="syntax-editor-gutter" ref={gutterRef}>
        {lineNumbers.map(n => (
          <div key={n} className="gutter-line-num">{n}</div>
        ))}
      </div>

      {/* Editor Body */}
      <div className="syntax-editor-workspace">
        {/* Background Highlighting Layer */}
        <pre 
          className="syntax-highlight-layer" 
          ref={preRef}
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: highlightCode(code, language) }}
        />

        {/* Foreground Transparent Textarea for Typing */}
        <textarea
          ref={textareaRef}
          className="syntax-input-textarea"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          spellCheck="false"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
        />
      </div>
    </div>
  );
};
