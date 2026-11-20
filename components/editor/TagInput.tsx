'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

export default function TagInput({
  value,
  onChange,
  suggestions = [],
  label = 'Mots-clés et tags',
}: {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  label?: string;
}) {
  const [input, setInput] = useState('');

  function add(tag: string) {
    const clean = tag.trim();
    if (!clean) return;
    if (!value.some((t) => t.toLowerCase() === clean.toLowerCase())) onChange([...value, clean]);
    setInput('');
  }

  return (
    <div className="tag-input">
      <span className="field-label">{label}</span>
      <div className="tag-list">
        {value.map((tag) => (
          <span className="tag" key={tag}>
            {tag}
            <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} aria-label={'Retirer ' + tag}><X size={12} /></button>
          </span>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); add(input); }
        }}
        placeholder="Ajouter avec Entrée"
      />
      {suggestions.length > 0 && (
        <div className="tag-suggestions">
          {suggestions.filter((s) => !value.includes(s)).slice(0, 6).map((s) => (
            <button type="button" key={s} onClick={() => add(s)}>{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}
