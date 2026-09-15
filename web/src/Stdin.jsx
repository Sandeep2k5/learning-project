// Standard input for the running program. DSA practice is mostly
// "read the test case, print the answer", so this panel sits next to the
// terminal rather than being hidden behind a dialog.
export default function Stdin({ value, onChange, disabled }) {
  return (
    <section className="stdin">
      <header>
        <span className="label">Input (stdin)</span>
        {value && (
          <button className="icon" onClick={() => onChange('')} title="Clear input">
            ×
          </button>
        )}
      </header>

      <textarea
        className="stdin-box"
        value={value}
        disabled={disabled}
        spellCheck={false}
        placeholder={'4 9\n2 7 11 15'}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Standard input for the program"
      />
    </section>
  );
}
