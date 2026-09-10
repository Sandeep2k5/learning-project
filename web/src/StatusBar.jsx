import { API_HOST } from './api';

const LABEL = {
  connecting: 'Connecting…',
  online: 'Connected',
  offline: 'Backend unreachable'
};

export default function StatusBar({ conn, dirty, saving, fileCount, onRetry }) {
  const kind =
    conn.state === 'online' ? 'ok' : conn.state === 'offline' ? 'down' : 'wait';

  return (
    <footer className={'statusbar ' + kind}>
      <span className="pill">
        <span className="beacon" />
        <span role="status" aria-live="polite">
          {conn.error && conn.state === 'online' ? conn.error : LABEL[conn.state]}
        </span>
      </span>

      {conn.state === 'offline' && (
        <button onClick={onRetry}>Retry</button>
      )}

      <span className="right">
        {saving ? 'Saving…' : dirty ? 'Unsaved changes' : 'Saved'}
        {'  ·  '}
        {fileCount} {fileCount === 1 ? 'file' : 'files'}
        {conn.info && `  ·  ${conn.info.storage}  ·  ${conn.info.node}`}
        {'  ·  '}
        {API_HOST}
      </span>
    </footer>
  );
}
