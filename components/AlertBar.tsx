import Link from 'next/link';

export default function AlertBar({
  title,
  href,
  time,
  label = 'Alerte info',
}: {
  title: string;
  href: string;
  time?: string;
  label?: string;
}) {
  return (
    <div className="alert-strip">
      <div className="shell alert-strip-inner">
        <span className="alert-tag">{label}</span>
        <Link className="alert-text" href={href}>{title}</Link>
        {time && <span className="alert-time">{time}</span>}
      </div>
    </div>
  );
}
