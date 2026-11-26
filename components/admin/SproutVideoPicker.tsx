'use client';

import { useId, useState } from 'react';
import SproutVideoLibrary from './SproutVideoLibrary';
import type { SproutVideo, SproutVideoKind } from '../../lib/video/sproutvideo-types';
import styles from './SproutVideoPicker.module.css';

export default function SproutVideoPicker({ kind, onSelect, disabled }: {
  kind: SproutVideoKind;
  onSelect: (video: SproutVideo) => void;
  disabled?: boolean;
}) {
  const panel = useId();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  return (
    <div className={styles.picker}>
      <button
        type="button"
        className="admin-btn admin-btn-ghost"
        aria-expanded={open}
        aria-controls={panel}
        disabled={disabled && !open}
        onClick={() => {
          setOpen(current => {
            const next = !current;
            if (next) setMounted(true);
            return next;
          });
        }}
      >
        {open ? 'Fermer la vidéothèque' : 'Choisir ou téléverser une vidéo'}
      </button>
      {mounted && (
        <div id={panel} hidden={!open} className={styles.panel}>
          <SproutVideoLibrary
            kind={kind}
            compact
            disabled={disabled}
            onSelect={video => {
              onSelect(video);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
