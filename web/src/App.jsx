import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as api from './api';
import Explorer from './Explorer';
import Terminal from './Terminal';
import StatusBar from './StatusBar';

export default function App() {
  const [files, setFiles] = useState([]);
  const [active, setActive] = useState(null);
  const [drafts, setDrafts] = useState({}); // name -> unsaved content
  const [conn, setConn] = useState({ state: 'connecting', info: null, error: null });
  const [output, setOutput] = useState(null);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);

  const editorRef = useRef(null);
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
      const result = await api.runCode(code);
      setOutput({ ...result, name });
    } catch (err) {
      setOutput({ error: err.message, name });
    } finally {
      setRunning(false);
    }
  }, [save]);

  const createFile = useCallback(async () => {
    const name = window.prompt('New file name', 'untitled.js');
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
          {running ? 'Running…' : '▶ Run'}
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
                theme="vs-dark"
                path={active}
                defaultLanguage="javascript"
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
                  tabSize: 2
                }}
                loading={<div className="pending">Loading editor…</div>}
              />
            ) : (
              <div className="pending">No file open. Create one in the explorer.</div>
            )}
          </div>

          <Terminal output={output} onClear={() => setOutput(null)} />
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
