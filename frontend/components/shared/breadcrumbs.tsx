import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <ol className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#8b867d]">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight className="size-3 opacity-60" strokeWidth={1.5} />}
              {item.href && !last ? (
                <Link href={item.href} className="transition-colors hover:text-[#e3bb78]">
                  {item.label}
                </Link>
              ) : (
                <span className={last ? 'text-[#b5b0a8]' : ''}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
