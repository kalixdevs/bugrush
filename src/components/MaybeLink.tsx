import Link from "next/link";

/** Renders a Next Link when `href` is set, otherwise a plain span — same className either way. */
export default function MaybeLink({
  href,
  className,
  children,
}: {
  href: string | null | undefined;
  className?: string;
  children: React.ReactNode;
}) {
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return <span className={className}>{children}</span>;
}
