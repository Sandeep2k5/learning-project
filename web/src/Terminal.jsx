export default function Terminal({ output, onClear }) {
  return (
    <section className="terminal">
      <header>
        <span className="label">Terminal</span>
        {output && !output.pending && (
          <>
            {output.timedOut && <span className="badge warn">timed out at 5s</span>}
            {!output.timedOut && output.exitCode !== undefined && (
              <span className={'badge ' + (output.exitCode === 0 ? 'ok' : 'bad')}>
                exit {output.exitCode}
              </span>
            )}
            {output.durationMs !== undefined && (
              <span className="badge">{output.durationMs} ms</span>
            )}
            <button className="icon" onClick={onClear} title="Clear">
              ×
            </button>
          </>
        )}
      </header>

      <pre className="out">
        {!output && <span className="muted">Press Run to execute the open file.</span>}
        {output?.pending && <span className="muted">$ node {output.name}</span>}
        {output && !output.pending && (
          <>
            <span className="muted">$ node {output.name}</span>
            {'\n'}
            {output.error && <span className="err">{output.error}</span>}
            {output.stdout}
            {output.stderr && <span className="err">{output.stderr}</span>}
            {output.timedOut && (
              <span className="err">
                {'\n'}Killed after 5s. Infinite loop?
              </span>
            )}
          </>
        )}
      </pre>
    </section>
  );
}
