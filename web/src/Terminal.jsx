const COMMAND = 'g++ -O1 -std=gnu++20 -Wall main.cpp && ./a.out';

export default function Terminal({ output, onClear }) {
  const failedToBuild = output && output.compileOk === false;

  return (
    <section className="terminal">
      <header>
        <span className="label">Terminal</span>
        {output && !output.pending && (
          <>
            {output.compileTimedOut && (
              <span className="badge warn">compile failed</span>
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
        {output?.pending && <span className="prompt">$ {COMMAND}</span>}
        {output && !output.pending && (
          <>
            <span className="prompt">$ {COMMAND}</span>
            {'\n'}
            {output.error && <span className="err">{output.error}</span>}
            {/* Warnings from a build that succeeded are worth reading too. */}
            {output.diagnostics && (
              <span className={failedToBuild ? 'err' : 'warnline'}>{output.diagnostics}</span>
            )}
            {output.compileTimedOut && (
              <span className="err">Compiler gave up.</span>
            )}
            {output.stdout}
            {output.stderr && <span className="err">{output.stderr}</span>}
            {output.timedOut && (
              <span className="err">
                {'\n'}Killed for exceeding the time limit. Infinite loop?
              </span>
            )}
            {output.heavyInclude && output.compileMs > 2500 && (
              <span className="muted">
                {'\n'}Slow build: bits/stdc++.h parses the whole standard
                library. Including just what you use builds about 3x faster here.
              </span>
            )}
          </>
        )}
      </pre>
    </section>
  );
}
