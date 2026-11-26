import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function SectionHeading({
  title,
  id,
  moreHref,
  moreLabel = 'Tout voir',
  arrows = false,
}: {
  title: string;
  id?: string;
  moreHref?: string;
  moreLabel?: string;
  arrows?: boolean;
}) {
  return (
    <div className="section-head has-rule">
      <h2 id={id}>{title}</h2>
      {moreHref && (
        <Link href={moreHref} className="section-more">
          {moreLabel} <ChevronRight size={15} />
        </Link>
      )}
      {arrows && (
        <div className="section-arrows" aria-hidden="true">
          <span className="arrow-btn"><ChevronLeft size={16} /></span>
          <span className="arrow-btn"><ChevronRight size={16} /></span>
        </div>
      )}
    </div>
  );
}
