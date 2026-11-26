'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function ArticleScroll({
  children,
  label,
  featured = false,
}: {
  children: ReactNode;
  label: string;
  featured?: boolean;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [atEnd, setAtEnd] = useState(false);

  function updateScroll() {
    const element = viewport.current;
    if (!element) return;
    const remaining = element.scrollHeight - element.clientHeight;
    setCanScroll(remaining > 1);
    setAtEnd(remaining - element.scrollTop <= 1);
  }

  useEffect(() => {
    const observer = new ResizeObserver(updateScroll);
    if (viewport.current) observer.observe(viewport.current);
    if (content.current) observer.observe(content.current);
    updateScroll();
    return () => observer.disconnect();
  }, []);

  function move() {
    const element = viewport.current;
    if (!element) return;
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (atEnd) element.scrollTo({ top: 0, behavior });
    else element.scrollBy({ top: element.clientHeight * 0.8, behavior });
  }

  return (
    <section className={featured ? 'category-featured-scroll' : undefined} aria-label={label}>
      <div className="category-articles-scroll" ref={viewport} onScroll={updateScroll}>
        <div ref={content}>{children}</div>
      </div>
      {canScroll && (
        <button
          type="button"
          className="category-scroll-arrow"
          aria-label={atEnd ? 'Revenir au début : ' + label : 'Faire défiler : ' + label}
          onClick={move}
        >
          {atEnd ? <ChevronUp size={22} aria-hidden="true" /> : <ChevronDown size={22} aria-hidden="true" />}
        </button>
      )}
    </section>
  );
}
