export default function Explorer({ files, active, drafts, onOpen, onCreate, onDelete }) {
  return (
    <nav className="sidebar" aria-label="Explorer">
      <div className="sidebar-head">
        <h2>Explorer</h2>
        <button className="icon" onClick={onCreate} title="New file" aria-label="New file">
          +
        </button>
      </div>

      <ul className="tree">
        {files.map((file) => (
          <li key={file.name} className={file.name === active ? 'on' : undefined}>
            <button className="name" onClick={() => onOpen(file.name)}>
              {file.name}
              {drafts[file.name] !== undefined && <i className="dirty" />}
            </button>
            <button
              className="icon del"
              onClick={() => onDelete(file.name)}
              title={`Delete ${file.name}`}
              aria-label={`Delete ${file.name}`}
            >
              ×
            </button>
          </li>
        ))}
        {files.length === 0 && <li className="muted">no files</li>}
      </ul>

      <p className="hint">
        <kbd>Ctrl</kbd>+<kbd>S</kbd> save
        <br />
        <kbd>Ctrl</kbd>+<kbd>Enter</kbd> run
      </p>
    </nav>
  );
}
