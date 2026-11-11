window.__ModuleLoader__.load({
  id: '@local/conversation-sticky-note',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'conversation-sticky-note';
    const STORAGE_PREFIX = 'dsh.conversation-sticky-note.v1.';
    const NOTE_VERSION = 2;
    const NOTE_SIZE = 260;
    const NOTE_MIN = 200;
    const NOTE_MAX = 640;
    const COMPACT_WIDTH = 1500;

    function clampSize(value, fallback) {
      const n = Number(value);
      if (!Number.isFinite(n)) return fallback;
      return Math.min(NOTE_MAX, Math.max(NOTE_MIN, Math.round(n)));
    }

    const TONES = [
      { name: 'Blue', head: '#cde9ff', body: '#e2f1ff', edge: '#a9cdec', ink: '#1f2937',
        headDark: '#1f3a57', bodyDark: '#17293d', edgeDark: '#2f5580', inkDark: '#dce9fb' },
      { name: 'Yellow', head: '#ffe7a3', body: '#fff4cf', edge: '#e6cd82', ink: '#3a3220',
        headDark: '#4a3a17', bodyDark: '#3a2d12', edgeDark: '#6b551f', inkDark: '#f7e6b8' },
      { name: 'Pink', head: '#ffd4e3', body: '#ffe9f1', edge: '#eaafc4', ink: '#43222e',
        headDark: '#4a2433', bodyDark: '#3a1c28', edgeDark: '#6d3a4e', inkDark: '#fbd9e6' },
      { name: 'Green', head: '#d4efc4', body: '#e9f7e0', edge: '#b2d79c', ink: '#24361f',
        headDark: '#243a1e', bodyDark: '#1c2d17', edgeDark: '#3d5c33', inkDark: '#dff2d2' },
      { name: 'Purple', head: '#e0d4ff', body: '#f0eaff', edge: '#c6b4ec', ink: '#2f2547',
        headDark: '#34284d', bodyDark: '#281f3c', edgeDark: '#4e3d70', inkDark: '#e8ddfb' },
    ];

    const MARK_COMMANDS = ['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList'];
    const EMPTY_MARKS = MARK_COMMANDS.reduce((acc, name) => { acc[name] = false; return acc; }, {});

    const ZH = {
      title: '便签',
      placeholder: '记笔记...',
      noteLabel: '对话便签',
      newNote: '新建便签',
      more: '更多',
      close: '收起便签',
      expand: '展开便签',
      tone: '便签颜色',
      bold: '加粗',
      italic: '斜体',
      underline: '下划线',
      strike: '删除线',
      list: '项目符号',
      confirmClear: '清空并新建？',
      confirmYes: '新建',
      cancel: '取消',
      toneBlue: '蓝色',
      toneYellow: '黄色',
      tonePink: '粉色',
      toneGreen: '绿色',
      tonePurple: '紫色',
      resize: '拖动调整大小',
    };
    const EN = {
      title: 'Notes',
      placeholder: 'Take a note...',
      noteLabel: 'Conversation sticky note',
      newNote: 'New note',
      more: 'More',
      close: 'Collapse note',
      expand: 'Expand note',
      tone: 'Note colour',
      bold: 'Bold',
      italic: 'Italic',
      underline: 'Underline',
      strike: 'Strikethrough',
      list: 'Bulleted list',
      confirmClear: 'Clear this note?',
      confirmYes: 'New',
      cancel: 'Cancel',
      toneBlue: 'Blue',
      toneYellow: 'Yellow',
      tonePink: 'Pink',
      toneGreen: 'Green',
      tonePurple: 'Purple',
      resize: 'Drag to resize',
    };

    function fallbackT(key) {
      return EN[key] || key;
    }

    /*
     * `shell.overlay` is frame-wide and has no Session, while a composer dock is
     * Session-scoped. A probe there publishes the active Session id to this
     * module store; the overlay card subscribes to it, so switching
     * conversations swaps the note (and its stored content) without leaking one
     * conversation's note into another.
     */
    let store = { sessionId: '' };
    const listeners = new Set();

    function getStore() {
      return store;
    }

    function subscribeStore(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    }

    function updateStore(patch) {
      if (patch.sessionId === store.sessionId) return;
      store = Object.assign({}, store, patch);
      for (const listener of listeners) listener();
    }

    function normaliseTone(value, fallback) {
      if (typeof value !== 'number' || !isFinite(value)) return fallback;
      const index = Math.floor(value) % TONES.length;
      return index < 0 ? index + TONES.length : index;
    }

    function textToHtml(text) {
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
    }

    function htmlIsEmpty(html) {
      if (!html) return true;
      try {
        const probe = document.createElement('div');
        probe.innerHTML = html;
        return probe.textContent.trim() === '' && probe.querySelector('img') === null;
      } catch (error) {
        return true;
      }
    }

    function readNote(sessionId) {
      const base = { html: '', tone: 0, open: true, w: NOTE_SIZE, h: NOTE_SIZE };
      try {
        const raw = window.localStorage.getItem(STORAGE_PREFIX + sessionId);
        if (!raw) return base;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return base;
        let html = typeof parsed.html === 'string' ? parsed.html : '';
        if (!html && typeof parsed.text === 'string') html = textToHtml(parsed.text);
        return {
          html: html,
          tone: normaliseTone(parsed.tone, base.tone),
          open: parsed.v === NOTE_VERSION ? parsed.open !== false : true,
          w: clampSize(parsed.w, base.w),
          h: clampSize(parsed.h, base.h),
        };
      } catch (error) {
        return base;
      }
    }

    function writeNote(sessionId, note) {
      try {
        window.localStorage.setItem(STORAGE_PREFIX + sessionId, JSON.stringify({
          v: NOTE_VERSION,
          html: note.html,
          tone: note.tone,
          open: note.open,
          w: clampSize(note.w, NOTE_SIZE),
          h: clampSize(note.h, NOTE_SIZE),
        }));
      } catch (error) { /* quota or unavailable storage; the note still works in memory */ }
    }

    function PlusIcon() {
      return h('svg', { viewBox: '0 0 20 20', width: 18, height: 18, 'aria-hidden': true },
        h('path', {
          d: 'M10 4.2 V15.8 M4.2 10 H15.8',
          fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round',
        }));
    }

    function MoreIcon() {
      return h('svg', { viewBox: '0 0 20 20', width: 18, height: 18, 'aria-hidden': true },
        h('circle', { cx: 4.6, cy: 10, r: 1.35, fill: 'currentColor' }),
        h('circle', { cx: 10, cy: 10, r: 1.35, fill: 'currentColor' }),
        h('circle', { cx: 15.4, cy: 10, r: 1.35, fill: 'currentColor' }));
    }

    function CloseIcon() {
      return h('svg', { viewBox: '0 0 20 20', width: 16, height: 16, 'aria-hidden': true },
        h('path', {
          d: 'M5.2 5.2 L14.8 14.8 M14.8 5.2 L5.2 14.8',
          fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round',
        }));
    }

    function ListIcon() {
      return h('svg', { viewBox: '0 0 20 20', width: 18, height: 18, 'aria-hidden': true },
        h('circle', { cx: 4.4, cy: 5.4, r: 1.15, fill: 'currentColor' }),
        h('circle', { cx: 4.4, cy: 10, r: 1.15, fill: 'currentColor' }),
        h('circle', { cx: 4.4, cy: 14.6, r: 1.15, fill: 'currentColor' }),
        h('path', {
          d: 'M8 5.4 H16.4 M8 10 H16.4 M8 14.6 H16.4',
          fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round',
        }));
    }

    function NoteGlyph() {
      return h('svg', { viewBox: '0 0 16 16', width: 15, height: 15, 'aria-hidden': true },
        h('path', {
          d: 'M3 2.5 H13 V10 L10 13 H3 Z',
          fill: 'currentColor', opacity: 0.18,
          stroke: 'currentColor', strokeWidth: 1.2, strokeLinejoin: 'round',
        }),
        h('path', { d: 'M10 13 V10 H13', fill: 'none', stroke: 'currentColor', strokeWidth: 1.2 }));
    }

    const TONE_CSS = TONES.map((entry, index) => {
      const light = `--dsn-head:${entry.head};--dsn-body:${entry.body};--dsn-edge:${entry.edge};--dsn-ink:${entry.ink};`;
      const dark = `--dsn-head:${entry.headDark};--dsn-body:${entry.bodyDark};--dsn-edge:${entry.edgeDark};--dsn-ink:${entry.inkDark};`;
      return `.dsn-note[data-tone="${index}"]{${light}}` +
        `:root[data-ds-dark-theme] .dsn-note[data-tone="${index}"],body[data-ds-dark-theme] .dsn-note[data-tone="${index}"]{${dark}}`;
    }).join('');

    const CSS = [
      '.dsn-note{position:fixed;bottom:56px;right:20px;z-index:45;width:var(--dsn-w,260px);',
      'height:var(--dsn-h,260px);max-width:calc(100vw - 32px);max-height:calc(100vh - 104px);',
      'box-sizing:border-box;display:flex;flex-direction:column;border:1px solid var(--dsn-edge);',
      'border-radius:9px;background:var(--dsn-body);color:var(--dsn-ink);pointer-events:auto;',
      'box-shadow:0 10px 22px rgba(16,34,58,.20),0 2px 5px rgba(16,34,58,.10);',
      'font-family:"Segoe UI Variable Text","Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;}',
      '.dsn-resize{position:absolute;left:0;top:0;width:18px;height:18px;z-index:4;cursor:nwse-resize;',
      'border-top-left-radius:8px;opacity:0;transition:opacity .12s ease;background-repeat:no-repeat;',
      'background-position:2px 2px;background-size:14px 14px;',
      'background-image:repeating-linear-gradient(135deg,transparent 0 3px,rgba(20,40,70,.55) 3px 4.5px);}',
      '.dsn-note:hover .dsn-resize{opacity:.5;}',
      '.dsn-resize:hover{opacity:.85;}',
      '.dsn-bar{display:flex;align-items:center;gap:2px;flex:0 0 auto;height:34px;padding:0 6px;',
      'background:var(--dsn-head);border-radius:8px 8px 0 0;border-bottom:1px solid rgba(255,255,255,.5);}',
      '.dsn-bar-spacer{flex:1 1 auto;}',
      '.dsn-bar-btn{width:26px;height:26px;display:grid;place-items:center;padding:0;border:0;',
      'border-radius:6px;background:transparent;color:var(--dsn-ink);cursor:pointer;opacity:.92;}',
      '.dsn-bar-btn:hover{background:rgba(255,255,255,.55);}',
      '.dsn-body{position:relative;flex:1 1 auto;min-height:0;overflow:auto;padding:12px 14px;}',
      '.dsn-editor{min-height:100%;outline:none;font-size:14.5px;line-height:1.55;',
      'white-space:pre-wrap;overflow-wrap:anywhere;caret-color:var(--dsn-ink);}',
      '.dsn-editor img{display:block;max-width:100%;height:auto;border-radius:5px;margin:6px 0;}',
      '.dsn-editor ul{padding-left:0;margin:4px 0;list-style:none;}',
      '.dsn-editor li{position:relative;margin:2px 0;}',
      '.dsn-editor li::before{content:"";position:absolute;left:-10px;top:.62em;width:5px;height:5px;',
      'border-radius:50%;background:currentColor;opacity:.72;}',
      '.dsn-editor ul ul{padding-left:16px;}',
      '.dsn-placeholder{position:absolute;left:14px;top:12px;right:14px;font-size:14.5px;',
      'line-height:1.55;opacity:.42;pointer-events:none;user-select:none;}',
      '.dsn-tools{display:flex;align-items:center;justify-content:space-between;flex:0 0 auto;',
      'height:40px;padding:0 6px;background:var(--dsn-head);border-radius:0 0 8px 8px;',
      'border-top:1px solid rgba(255,255,255,.5);}',
      '.dsn-tool{width:30px;height:28px;display:grid;place-items:center;padding:0;border:0;',
      'border-radius:6px;background:transparent;color:var(--dsn-ink);cursor:pointer;opacity:.88;',
      'font-size:15px;line-height:1;}',
      '.dsn-tool:hover{background:rgba(255,255,255,.55);}',
      '.dsn-tool[aria-pressed="true"]{background:rgba(30,50,80,.14);}',
      '.dsn-b{font-family:Georgia,"Times New Roman",serif;font-weight:700;}',
      '.dsn-i{font-family:Georgia,"Times New Roman",serif;font-style:italic;}',
      '.dsn-u{text-decoration:underline;}',
      '.dsn-s{font-family:Georgia,"Times New Roman",serif;text-decoration:line-through;}',
      '.dsn-menu{position:absolute;top:38px;right:8px;z-index:3;display:flex;gap:8px;',
      'padding:8px 10px;border:1px solid var(--dsn-edge);border-radius:10px;background:var(--dsn-body);',
      'box-shadow:0 10px 24px rgba(16,34,58,.25);}',
      '.dsn-color{width:20px;height:20px;padding:0;border-radius:50%;cursor:pointer;',
      'border:1px solid rgba(0,0,0,.18);}',
      '.dsn-color[aria-pressed="true"]{outline:2px solid rgba(30,50,80,.65);outline-offset:2px;}',
      '.dsn-confirm{display:flex;align-items:center;gap:5px;flex:1 1 auto;min-width:0;font-size:12px;}',
      '.dsn-confirm-text{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.dsn-confirm-btn{height:22px;padding:0 7px;border:1px solid rgba(0,0,0,.16);border-radius:5px;',
      'background:rgba(255,255,255,.78);color:inherit;font:inherit;font-size:12px;cursor:pointer;}',
      '.dsn-confirm-btn:hover{background:#fff;}',
      '.dsn-tab{position:fixed;right:14px;bottom:46px;z-index:45;width:30px;height:30px;padding:0;',
      'display:grid;place-items:center;border:1px solid transparent;border-radius:7px;background:transparent;',
      'color:var(--dsw-alias-label-secondary);opacity:.58;cursor:pointer;pointer-events:auto;',
      'transition:opacity .12s ease,background-color .12s ease,border-color .12s ease;}',
      '.dsn-tab:hover{opacity:1;background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l1);}',
      '.dsn-tab:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px;}',
      '.dsn-note ::-webkit-scrollbar{width:8px;}',
      '.dsn-note ::-webkit-scrollbar-thumb{background:rgba(40,60,90,.18);border-radius:8px;}',
      '@media (max-width:520px){.dsn-note{bottom:80px;right:10px;left:10px;width:auto;height:auto;',
      'min-height:260px;max-height:calc(100vh - 120px);}.dsn-resize{display:none;}}',
      ':root[data-ds-dark-theme] .dsn-bar-btn:hover,body[data-ds-dark-theme] .dsn-bar-btn:hover,',
      ':root[data-ds-dark-theme] .dsn-tool:hover,body[data-ds-dark-theme] .dsn-tool:hover{background:rgba(255,255,255,.10);}',
      ':root[data-ds-dark-theme] .dsn-tool[aria-pressed="true"],body[data-ds-dark-theme] .dsn-tool[aria-pressed="true"]{background:rgba(255,255,255,.22);}',
      ':root[data-ds-dark-theme] .dsn-bar,body[data-ds-dark-theme] .dsn-bar,',
      ':root[data-ds-dark-theme] .dsn-tools,body[data-ds-dark-theme] .dsn-tools{border-color:rgba(255,255,255,.10);}',
      ':root[data-ds-dark-theme] .dsn-confirm-btn,body[data-ds-dark-theme] .dsn-confirm-btn{background:rgba(255,255,255,.10);border-color:rgba(255,255,255,.14);}',
      ':root[data-ds-dark-theme] .dsn-confirm-btn:hover,body[data-ds-dark-theme] .dsn-confirm-btn:hover{background:rgba(255,255,255,.18);}',
      ':root[data-ds-dark-theme] .dsn-resize,body[data-ds-dark-theme] .dsn-resize{',
      'background-image:repeating-linear-gradient(135deg,transparent 0 3px,rgba(255,255,255,.62) 3px 4.5px);}',
      ':root[data-ds-dark-theme] .dsn-note ::-webkit-scrollbar-thumb,body[data-ds-dark-theme] .dsn-note ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);}',
    ].join('') + TONE_CSS;

    function SessionProbe(props) {
      const sessionId = props && props.sessionId ? String(props.sessionId) : '';

      React.useEffect(() => {
        if (!sessionId) return undefined;
        updateStore({ sessionId });
        return () => {
          if (store.sessionId === sessionId) updateStore({ sessionId: '' });
        };
      }, [sessionId]);

      return null;
    }

    function StickyNoteCard(props) {
      const sessionId = props.sessionId;
      const t = typeof props.t === 'function' ? props.t : fallbackT;
      const seedState = React.useState(() => readNote(sessionId));
      const seed = seedState[0];
      const noteRef = React.useRef(null);
      const editorRef = React.useRef(null);
      const htmlRef = React.useRef(seed.html);
      const sizeRef = React.useRef({ w: seed.w, h: seed.h });
      const sizeState = React.useState({ w: seed.w, h: seed.h });
      const size = sizeState[0];
      const setSize = sizeState[1];
      const toneState = React.useState(seed.tone);
      const tone = toneState[0];
      const setTone = toneState[1];
      const openState = React.useState(seed.open);
      const open = openState[0];
      const setOpen = openState[1];
      const emptyState = React.useState(htmlIsEmpty(seed.html));
      const isEmpty = emptyState[0];
      const setIsEmpty = emptyState[1];
      const menuState = React.useState(false);
      const menuOpen = menuState[0];
      const setMenuOpen = menuState[1];
      const confirmState = React.useState(false);
      const confirming = confirmState[0];
      const setConfirming = confirmState[1];
      const viewportState = React.useState(() => window.innerWidth);
      const compact = viewportState[0] < COMPACT_WIDTH;
      const setViewportWidth = viewportState[1];
      const compactOpenState = React.useState(false);
      const compactOpen = compactOpenState[0];
      const setCompactOpen = compactOpenState[1];
      const visibleOpen = compact ? compactOpen : open;
      const marksState = React.useState(EMPTY_MARKS);
      const marks = marksState[0];
      const setMarks = marksState[1];

      const persist = (next) => {
        writeNote(sessionId, {
          html: next && next.html !== undefined ? next.html : htmlRef.current,
          tone: next && next.tone !== undefined ? next.tone : tone,
          open: next && next.open !== undefined ? next.open : open,
          w: next && next.w !== undefined ? next.w : sizeRef.current.w,
          h: next && next.h !== undefined ? next.h : sizeRef.current.h,
        });
      };

      /* The note is anchored at its bottom-right corner, so dragging the top-left
         handle grows it up and to the left, exactly where the pointer goes. */
      const startResize = (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        event.preventDefault();
        const startX = event.clientX;
        const startY = event.clientY;
        const startW = sizeRef.current.w;
        const startH = sizeRef.current.h;
        const maxW = Math.min(NOTE_MAX, window.innerWidth - 32);
        const maxH = Math.min(NOTE_MAX, window.innerHeight - 104);
        let last = { w: startW, h: startH };
        const onMove = (moveEvent) => {
          last = {
            w: Math.max(NOTE_MIN, Math.min(maxW, Math.round(startW - (moveEvent.clientX - startX)))),
            h: Math.max(NOTE_MIN, Math.min(maxH, Math.round(startH - (moveEvent.clientY - startY)))),
          };
          setSize({ w: last.w, h: last.h });
        };
        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onUp);
          sizeRef.current = last;
          setSize({ w: last.w, h: last.h });
          persist({ w: last.w, h: last.h });
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
      };

      const syncFromEditor = () => {
        const node = editorRef.current;
        if (!node) return;
        htmlRef.current = node.innerHTML === '<br>' ? '' : node.innerHTML;
        setIsEmpty(node.textContent.trim() === '' && node.querySelector('img') === null);
        persist();
      };

      const readMarks = () => {
        const editor = editorRef.current;
        if (!editor) return;
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        if (!editor.contains(selection.getRangeAt(0).commonAncestorContainer)) return;
        const next = {};
        for (const name of MARK_COMMANDS) {
          let active = false;
          try {
            active = document.queryCommandState(name);
          } catch (error) {
            active = false;
          }
          next[name] = active;
        }
        setMarks((prev) => {
          for (const name of MARK_COMMANDS) {
            if (prev[name] !== next[name]) return next;
          }
          return prev;
        });
      };

      React.useEffect(() => {
        const onSelectionChange = () => readMarks();
        document.addEventListener('selectionchange', onSelectionChange);
        return () => document.removeEventListener('selectionchange', onSelectionChange);
      }, []);

      const focusEditor = () => {
        const node = editorRef.current;
        if (node) node.focus();
      };

      React.useEffect(() => {
        const onResize = () => setViewportWidth(window.innerWidth);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      }, []);

      React.useEffect(() => {
        if (!visibleOpen) return;
        const node = editorRef.current;
        if (!node) return;
        node.innerHTML = htmlRef.current;
        setIsEmpty(node.textContent.trim() === '' && node.querySelector('img') === null);
      }, [visibleOpen, sessionId]);

      /* Narrow windows: the note auto-collapses, and an opened note hides again on an outside click. */
      React.useEffect(() => {
        if (!compact || !compactOpen) return undefined;
        const onPointerDown = (event) => {
          if (noteRef.current && !noteRef.current.contains(event.target)) setCompactOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
      }, [compact, compactOpen]);

      React.useEffect(() => {
        if (!menuOpen) return undefined;
        const onPointerDown = (event) => {
          if (noteRef.current && !noteRef.current.contains(event.target)) setMenuOpen(false);
        };
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setMenuOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
          document.removeEventListener('mousedown', onPointerDown);
          document.removeEventListener('keydown', onKeyDown);
        };
      }, [menuOpen]);

      const chooseTone = (index) => {
        setTone(index);
        persist({ tone: index });
        setMenuOpen(false);
      };

      const collapse = () => {
        setMenuOpen(false);
        setOpen(false);
        setCompactOpen(false);
        persist({ open: false });
      };

      const expand = () => {
        setOpen(true);
        setCompactOpen(true);
        persist({ open: true });
      };

      const clearNote = () => {
        htmlRef.current = '';
        if (editorRef.current) editorRef.current.innerHTML = '';
        setIsEmpty(true);
        setConfirming(false);
        writeNote(sessionId, { html: '', tone: tone, open: true, w: sizeRef.current.w, h: sizeRef.current.h });
        focusEditor();
      };

      const startNew = () => {
        if (isEmpty) {
          focusEditor();
          return;
        }
        setConfirming(true);
      };

      const command = (name) => {
        focusEditor();
        try {
          document.execCommand(name, false);
        } catch (error) { /* ignore unsupported commands */ }
        syncFromEditor();
        readMarks();
      };

      const handleInput = () => {
        syncFromEditor();
      };

      const handlePaste = (event) => {
        event.preventDefault();
        const text = event.clipboardData ? event.clipboardData.getData('text/plain') : '';
        try {
          document.execCommand('insertText', false, text);
        } catch (error) {
          if (editorRef.current) editorRef.current.textContent += text;
        }
        syncFromEditor();
      };

      const vars = {
        '--dsn-w': size.w + 'px',
        '--dsn-h': size.h + 'px',
      };

      if (!visibleOpen) {
        return h(React.Fragment, null,
          h('style', { key: 'css' }, CSS),
          h('button', {
            type: 'button',
            className: 'dsn-tab',
            title: t('expand'),
            'aria-label': t('expand'),
            onClick: expand,
          },
            h(NoteGlyph)));
      }

      const header = confirming
        ? h('div', { className: 'dsn-confirm' },
            h('span', { className: 'dsn-confirm-text' }, t('confirmClear')),
            h('button', {
              type: 'button', className: 'dsn-confirm-btn',
              onMouseDown: (event) => event.preventDefault(),
              onClick: clearNote,
            }, t('confirmYes')),
            h('button', {
              type: 'button', className: 'dsn-confirm-btn',
              onClick: () => setConfirming(false),
            }, t('cancel')))
        : [
            h('button', {
              key: 'new', type: 'button', className: 'dsn-bar-btn',
              title: t('newNote'), 'aria-label': t('newNote'), onClick: startNew,
            }, h(PlusIcon)),
            h('div', { key: 'spacer', className: 'dsn-bar-spacer' }),
            h('button', {
              key: 'more', type: 'button', className: 'dsn-bar-btn',
              title: t('more'), 'aria-label': t('more'),
              'aria-expanded': menuOpen ? 'true' : 'false',
              onClick: () => setMenuOpen((value) => !value),
            }, h(MoreIcon)),
            h('button', {
              key: 'close', type: 'button', className: 'dsn-bar-btn',
              title: t('close'), 'aria-label': t('close'), onClick: collapse,
            }, h(CloseIcon)),
          ];

      const toneButtons = TONES.map((entry, index) => h('button', {
        key: entry.name,
        type: 'button',
        className: 'dsn-color',
        style: { background: entry.head },
        title: t('tone') + ' · ' + t('tone' + entry.name),
        'aria-label': t('tone' + entry.name),
        'aria-pressed': tone === index ? 'true' : 'false',
        onMouseDown: (event) => event.preventDefault(),
        onClick: () => chooseTone(index),
      }));

      const tools = [
        { key: 'bold', mark: 'bold', label: t('bold'), content: h('span', { className: 'dsn-b' }, 'B'), run: () => command('bold') },
        { key: 'italic', mark: 'italic', label: t('italic'), content: h('span', { className: 'dsn-i' }, 'I'), run: () => command('italic') },
        { key: 'underline', mark: 'underline', label: t('underline'), content: h('span', { className: 'dsn-u' }, 'U'), run: () => command('underline') },
        { key: 'strike', mark: 'strikeThrough', label: t('strike'), content: h('span', { className: 'dsn-s' }, 'ab'), run: () => command('strikeThrough') },
        { key: 'list', mark: 'insertUnorderedList', label: t('list'), content: h(ListIcon), run: () => command('insertUnorderedList') },
      ];

      return h(React.Fragment, null,
        h('style', { key: 'css' }, CSS),
        h('section', {
          className: 'dsn-note',
          style: vars,
          'data-tone': String(tone),
          ref: noteRef,
          'aria-label': t('title'),
        },
          h('div', {
            className: 'dsn-resize',
            role: 'separator',
            'aria-label': t('resize'),
            title: t('resize'),
            onPointerDown: startResize,
          }),
          h('header', { className: 'dsn-bar' }, header),
          menuOpen ? h('div', { className: 'dsn-menu', role: 'group', 'aria-label': t('tone') }, toneButtons) : null,
          h('div', { className: 'dsn-body' },
            isEmpty ? h('span', { className: 'dsn-placeholder' }, t('placeholder')) : null,
            h('div', {
              className: 'dsn-editor',
              ref: editorRef,
              contentEditable: true,
              suppressContentEditableWarning: true,
              role: 'textbox',
              'aria-multiline': 'true',
              'aria-label': t('noteLabel'),
              spellCheck: false,
              onInput: handleInput,
              onPaste: handlePaste,
            })),
          h('footer', { className: 'dsn-tools' },
            tools.map((tool) => h('button', {
              key: tool.key,
              type: 'button',
              className: 'dsn-tool',
              title: tool.label,
              'aria-label': tool.label,
              'aria-pressed': tool.mark ? (marks[tool.mark] ? 'true' : 'false') : undefined,
              onMouseDown: (event) => event.preventDefault(),
              onClick: tool.run,
            }, tool.content)))));
    }

    function StickyNoteHost(props) {
      const snapshot = React.useSyncExternalStore(subscribeStore, getStore, getStore);
      if (!snapshot.sessionId) return null;
      return h(StickyNoteCard, {
        key: snapshot.sessionId,
        sessionId: snapshot.sessionId,
        t: props.t,
      });
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(
          () => ctx.locale.register(NS, { zh: ZH, en: EN }),
          'conversation-sticky-note: dictionaries',
        );
        ctx.effect(() => ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'conversation-sticky-note',
          order: 20,
          locale: NS,
        }, StickyNoteHost)));
        ctx.effect(() => ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock',
          id: 'conversation-sticky-note-bridge',
          order: 102,
        }, SessionProbe)));
      },
    };
  },
});


