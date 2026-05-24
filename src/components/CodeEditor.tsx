"use client";

import dynamic from "next/dynamic";

const Monaco = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full grid place-items-center text-zinc-500 text-sm">
      loading editor…
    </div>
  ),
});

type Props = {
  value: string;
  language: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
};

export default function CodeEditor({ value, language, onChange, readOnly }: Props) {
  return (
    <Monaco
      height="100%"
      language={language}
      value={value}
      theme="vs-dark"
      onChange={readOnly ? undefined : (v) => onChange?.(v ?? "")}
      options={{
        fontSize: 15,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        renderLineHighlight: "all",
        smoothScrolling: true,
        automaticLayout: true,
        tabSize: 2,
        overviewRulerLanes: 0,
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        readOnly,
        domReadOnly: readOnly,
        scrollbar: {
          vertical: "hidden",
          horizontal: "hidden",
          handleMouseWheel: true,
          alwaysConsumeMouseWheel: false,
          useShadows: false,
        },
        guides: { indentation: false },
        folding: false,
        lineNumbersMinChars: 3,
      }}
    />
  );
}
