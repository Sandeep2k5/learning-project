import { API_HOST } from './api';

const LABEL = {
  connecting: 'Connecting…',
  online: 'Connected',
  offline: 'Backend unreachable'
};

// "g++ (x86_64-posix-seh-rev1, Built by MinGW-W64 project) 12.2.0" is far
// too long for a 24px bar; "g++ 12.2.0" says everything that matters.
function shortCompiler(version) {
  if (!version) return null;
  const v = version.match(/\d+\.\d+(\.\d+)?/);
  return v ? `g++ ${v[0]}` : version;
}

export default function StatusBar({ conn, dirty, saving, fileCount, onRetry }) {
  const kind =
    conn.state === 'online' ? 'ok' : conn.state === 'offline' ? 'down' : 'wait';

  return (
    <footer className={'statusbar ' + kind}>
      <span className="pill">
        <span className="beacon" />
        <span role="status" aria-live="polite">
          {conn.error && conn.state !== 'offline' ? conn.error : LABEL[conn.state]}
        </span>
      </span>

      {conn.state === 'offline' && (
        <button onClick={onRetry}>Retry</button>
      )}

      <span className="right">
        {saving ? 'Saving…' : dirty ? 'Unsaved changes' : 'Saved'}
        {'  ·  '}
        {fileCount} {fileCount === 1 ? 'file' : 'files'}
        {conn.info && `  ·  ${conn.info.storage}  ·  ${shortCompiler(conn.info.compiler)}`}
        {'  ·  '}
        {API_HOST}
      </span>
    </footer>
  );
}
