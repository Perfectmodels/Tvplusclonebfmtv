/** Logo du site. Remplacer public/logo.png par le fichier fourni pour changer de visuel. */
export default function TvPlusLogo({ className = '' }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.png" alt="TV Plus" className={className} width={512} height={185} />
  );
}
