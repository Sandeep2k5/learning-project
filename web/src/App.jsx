import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as api from './api';
import Explorer from './Explorer';
import Terminal from './Terminal';
import Stdin from './Stdin';
import StatusBar from './StatusBar';

export default function App() {
  const [files, setFiles] = useState([]);
  const [active, setActive] = useState(null);
  const [drafts, setDrafts] = useState({}); // name -> unsaved content
  const [conn, setConn] = useState({ state: 'connecting', info: null, error: null });
  const [output, setOutput] = useState(null);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  // stdin per file, persisted: a test case you typed should survive a reload.
  const [inputs, setInputs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('stdin') || '{}');
    } catch {
      return {};
    }
  });

  const editorRef = useRef(null);
  const inputsRef = useRef(inputs);
  inputsRef.current = inputs;
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const activeRef = useRef(active);
  activeRef.current = active;

  const activeFile = files.find((f) => f.name === active) || null;
  const content = active != null && active in drafts
    ? drafts[active]
    : activeFile?.content ?? '';
  const dirty = active != null && active in drafts;

  // --- load ---------------------------------------------------------------
  const connect = useCallback(async () => {
    setConn({ state: 'connecting', info: null, error: null });
    try {
      const [info, list] = await Promise.all([api.health(), api.listFiles()]);
      setConn({ state: 'online', info, error: null });
      setFiles(list);
      setActive((cur) => cur ?? list[0]?.name ?? null);
    } catch (err) {
      setConn({ state: 'offline', info: null, error: err.message });
    }
  }, []);

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    try {
      localStorage.setItem('stdin', JSON.stringify(inputs));
    } catch {
      /* private mode or full quota; the input just will not persist */
    }
  }, [inputs]);

  // --- actions ------------------------------------------------------------
  const save = useCallback(async () => {
    const name = activeRef.current;
    if (name == null || !(name in draftsRef.current)) return;
    setSaving(true);
    try {
      const saved = await api.saveFile(name, draftsRef.current[name]);
      setFiles((prev) => prev.map((f) => (f.name === name ? saved : f)));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    } catch (err) {
      setConn((c) => ({ ...c, error: 'save failed: ' + err.message }));
    } finally {
      setSaving(false);
    }
  }, []);

  const run = useCallback(async () => {
    const name = activeRef.current;
    if (name == null) return;
    setRunning(true);
    setOutput({ pending: true, name });
    try {
      // Save first so what runs is what the file contains.
      if (name in draftsRef.current) await save();
      const code = editorRef.current?.getValue() ?? '';
      const result = await api.runCode(code, inputsRef.current[name] ?? '');
      // Pulling in the whole standard library roughly triples build time on
      // the free backend; worth saying so when a build was actually slow.
      setOutput({
        ...result,
        name,
        heavyInclude: code.includes('bits/stdc++.h')
      });
    } catch (err) {
      setOutput({ error: err.message, name });
    } finally {
      setRunning(false);
    }
  }, [save]);

  const createFile = useCallback(async () => {
    const name = window.prompt('New file name', 'untitled.cpp');
    if (!name) return;
    if (!/^[\w.-]{1,64}$/.test(name)) {
      window.alert('Use letters, numbers, dot, dash or underscore (max 64).');
      return;
    }
    try {
      const file = await api.saveFile(name, '');
      setFiles((prev) =>
        [...prev.filter((f) => f.name !== name), file].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      setActive(name);
    } catch (err) {
      setConn((c) => ({ ...c, error: err.message }));
    }
  }, []);

  const removeFile = useCallback(
    async (name) => {
      if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
      try {
        await api.deleteFile(name);
        setFiles((prev) => prev.filter((f) => f.name !== name));
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
        if (activeRef.current === name) {
          setActive((cur) => files.find((f) => f.name !== cur)?.name ?? null);
        }
      } catch (err) {
        setConn((c) => ({ ...c, error: err.message }));
      }
    },
    [files]
  );

  // --- keyboard -----------------------------------------------------------
  useEffect(() => {
    function onKey(e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 's') {
        e.preventDefault();
        save();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        run();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save, run]);

  const openTabs = useMemo(
    () => (active ? [active] : []),
    [active]
  );

  return (
    <div className="ide">
      <header className="titlebar">
        <span className="dot r" />
        <span className="dot y" />
        <span className="dot g" />
        <h1>learning-project</h1>
        <button
          className="run"
          onClick={run}
          disabled={running || conn.state !== 'online' || !active}
        >
          {running ? (
            <>
              <span className="spinner" />
              Running…
            </>
          ) : (
            '▶ Run'
          )}
        </button>
      </header>

      <div className="split">
        <Explorer
          files={files}
          active={active}
          drafts={drafts}
          onOpen={setActive}
          onCreate={createFile}
          onDelete={removeFile}
        />

        <main className="editor">
          <div className="tabs">
            {openTabs.map((name) => (
              <span key={name} className="tab">
                {name}
                {drafts[name] !== undefined && <i className="dirty" />}
              </span>
            ))}
          </div>

          <div className="monaco">
            {active ? (
              <Editor
                theme="ide-dark"
                beforeMount={(monaco) => {
                  // vs-dark ships a #1e1e1e canvas, which sits visibly
                  // lighter than the panels around it. Match the shell so
                  // the editor reads as part of the window, not a patch.
                  monaco.editor.defineTheme('ide-dark', {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [],
                    colors: {
                      'editor.background': '#171a21',
                      'editorGutter.background': '#171a21',
                      'editor.lineHighlightBackground': '#1d212a',
                      'editorLineNumber.foreground': '#454c59',
                      'editorLineNumber.activeForeground': '#8b95a5',
                      'editorCursor.foreground': '#6aa9ff',
                      'editor.selectionBackground': '#2b3d5c',
                      'editorIndentGuide.background1': '#23272f',
                      'editorIndentGuide.activeBackground1': '#333947',
                      'editorWidget.background': '#1b1f27',
                      'editorSuggestWidget.background': '#1b1f27'
                    }
                  });
                }}
                path={active}
                defaultLanguage="cpp"
                value={content}
                onMount={(editor) => {
                  editorRef.current = editor;
                }}
                onChange={(value) =>
                  setDrafts((prev) => ({ ...prev, [active]: value ?? '' }))
                }
                options={{
                  fontSize: 13,
                  fontFamily:
                    'ui-monospace, "Cascadia Code", "JetBrains Mono", Consolas, monospace',
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  padding: { top: 10 },
                  tabSize: 4
                }}
                loading={<div className="pending">Loading editor…</div>}
              />
            ) : (
              <div className="pending">No file open. Create one in the explorer.</div>
            )}
          </div>

          <div className="bottom">
            <Stdin
              value={(active && inputs[active]) || ''}
              disabled={!active}
              onChange={(text) =>
                setInputs((prev) => ({ ...prev, [active]: text }))
              }
            />
            <Terminal output={output} onClear={() => setOutput(null)} />
          </div>
        </main>
      </div>

      <StatusBar
        conn={conn}
        dirty={dirty}
        saving={saving}
        fileCount={files.length}
        onRetry={connect}
      />
    </div>
  );
}
