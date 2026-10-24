import Link from "next/link";
import Image from "next/image";

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
      <div className="mx-auto px-4 md:px-8 py-2 md:py-4 flex items-center justify-between gap-2 md:gap-4">
        <Link
          href="/welcome"
          className="flex items-center gap-2 md:gap-3 group shrink-0"
        >
          <Image
            src="/costa-rica-flag.svg"
            alt="Bandera de Costa Rica"
            width={50}
            height={30}
            className="w-8 h-8 md:w-12 md:h-12 rounded-full object-cover shadow-sm group-hover:brightness-110 transition-all"
          />
          <Image
            src="/ticomatica-logo-title.svg"
            alt="Ticomatica"
            width={2048}
            height={682}
            className="ticomatica-logo-title h-6 md:h-20 w-auto hidden sm:block"
          />
        </Link>

        <div id="test-header-controls" className="flex items-center gap-2 md:gap-6" />
      </div>
    </header>
  );
}
