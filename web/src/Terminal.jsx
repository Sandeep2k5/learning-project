const COMMAND = 'g++ -std=gnu++20 -O1 main.cpp -o main && ./main';

export default function Terminal({ output, onClear }) {
  const failedToBuild = output && output.compileOk === false;

  return (
    <section className="terminal">
      <header>
        <span className="label">Terminal</span>
        {output && !output.pending && (
          <>
            {output.compileTimedOut && (
              <span className="badge warn">compile timed out at 30s</span>
            )}
            {failedToBuild && !output.compileTimedOut && (
              <span className="badge bad">compile failed</span>
            )}
            {output.timedOut && <span className="badge warn">timed out at 5s</span>}
            {!failedToBuild && !output.timedOut && output.exitCode !== undefined && (
              <span className={'badge ' + (output.exitCode === 0 ? 'ok' : 'bad')}>
                exit {output.exitCode}
              </span>
            )}
            {output.compileMs !== undefined && (
              <span className="badge">build {output.compileMs} ms</span>
            )}
            {!failedToBuild && output.durationMs !== undefined && (
              <span className="badge">run {output.durationMs} ms</span>
            )}
            <button className="icon" onClick={onClear} title="Clear">
              ×
            </button>
          </>
        )}
      </header>

      <pre className="out">
        {!output && <span className="muted">Press Run to compile and execute the open file.</span>}
        {output?.pending && <span className="muted">$ {COMMAND}</span>}
        {output && !output.pending && (
          <>
            <span className="muted">$ {COMMAND}</span>
            {'\n'}
            {output.error && <span className="err">{output.error}</span>}
            {/* Warnings from a build that succeeded are worth reading too. */}
            {output.diagnostics && (
              <span className={failedToBuild ? 'err' : 'warnline'}>{output.diagnostics}</span>
            )}
            {output.compileTimedOut && (
              <span className="err">Compiler killed after 30s.</span>
            )}
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
