import React, { useEffect, useRef } from "react";

type Props = { id: string; label: string; value: string; onChange: (value: string) => void };

const commands = [
  ["bold", "B", "Bold"], ["italic", "I", "Italic"], ["underline", "U", "Underline"],
] as const;

export default function RichTextEditor({ id, label, value, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value; }, [value]);
  const run = (command: string, argument?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, argument);
    onChange(ref.current?.innerHTML ?? "");
  };
  return (
    <div>
      <label id={`${id}-label`} className="mb-2 block font-sans text-xs font-bold uppercase tracking-[0.12em]">{label}</label>
      <div className="flex flex-wrap gap-2 rounded-t border border-b-0 border-cardborder bg-chip p-2" role="toolbar" aria-label={`${label} formatting`}>
        {commands.map(([command, text, title]) => <button key={command} type="button" title={title} aria-label={title} onClick={() => run(command)} className={`h-9 min-w-9 border border-cardborder bg-white px-3 ${command === "italic" ? "italic" : command === "underline" ? "underline" : "font-bold"}`}>{text}</button>)}
        <button type="button" onClick={() => run("formatBlock", "p")} className="h-9 border border-cardborder bg-white px-3 font-sans text-xs">Text</button>
        <button type="button" onClick={() => run("formatBlock", "h2")} className="h-9 border border-cardborder bg-white px-3 font-sans text-xs">Heading</button>
        <button type="button" onClick={() => run("formatBlock", "h3")} className="h-9 border border-cardborder bg-white px-3 font-sans text-xs">Subheading</button>
      </div>
      <div id={id} ref={ref} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-labelledby={`${id}-label`} onInput={(event) => onChange(event.currentTarget.innerHTML)} className="rich-text-editor min-h-[180px] rounded-b border border-cardborder bg-white p-4 leading-relaxed outline-none focus:ring-2 focus:ring-terra" />
    </div>
  );
}
