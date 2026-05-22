/** Shared "nothing here yet" card. */
export default function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="border-2 border-zinc-800 bg-zinc-900 p-8 text-center">
      <p className="font-pixel text-sm text-zinc-400">{title}</p>
      {hint && <p className="text-zinc-500 text-sm mt-2">{hint}</p>}
    </div>
  );
}
