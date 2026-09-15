import { COMPILER, CXX_ARGS } from './api';

const LABEL = {
  connecting: 'Loading…',
  online: 'Ready',
  offline: 'Cannot reach the compiler service'
};

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
        {conn.info && `  ·  ${conn.info.storage}  ·  ${conn.info.compiler}`}
        {'  ·  '}
        <span title={`godbolt.org ${COMPILER} ${CXX_ARGS}`}>Compiler Explorer</span>
      </span>
    </footer>
  );
}
