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
  onChange: (v: string) => void;
};

export default function CodeEditor({ value, language, onChange }: Props) {
  return (
    <Monaco
      height="100%"
      language={language}
      value={value}
      theme="vs-dark"
      onChange={(v) => onChange(v ?? "")}
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
