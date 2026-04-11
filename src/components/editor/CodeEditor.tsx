type CodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  language?: "plain" | "javascript";
  ariaLabel: string;
};

export function CodeEditor({ ariaLabel, onChange, value }: CodeEditorProps) {
  return (
    <textarea
      aria-label={ariaLabel}
      className="code-editor code-editor--textarea"
      onChange={(event) => onChange(event.target.value)}
      spellCheck={false}
      value={value}
    />
  );
}
