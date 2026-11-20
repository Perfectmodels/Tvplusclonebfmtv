'use client';

import { useState } from 'react';
import { useToast } from './ToastProvider';

export type Field = {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'url' | 'select' | 'datetime-local';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  rows?: number;
  full?: boolean;
};

export default function AutoForm({
  endpoint,
  method = 'POST',
  fields,
  initialValues = {},
  submitLabel = 'Enregistrer',
  onSuccess,
  onCancel,
}: {
  endpoint: string;
  method?: 'POST' | 'PATCH';
  fields: Field[];
  initialValues?: Record<string, unknown>;
  submitLabel?: string;
  onSuccess: (data: unknown) => void;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [pending, setPending] = useState(false);
  const { success, error } = useToast();

  function set(name: string, value: unknown) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const field of fields) {
        const value = values[field.name];
        if (field.type === 'datetime-local' && value) {
          payload[field.name] = new Date(String(value)).toISOString();
        } else if (value === '' && !field.required) {
          payload[field.name] = null;
        } else {
          payload[field.name] = value;
        }
      }
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Enregistrement impossible.');
      success('Enregistrement confirmé.');
      onSuccess(body.data);
    } catch (err) {
      error(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={onSubmit}>
      <div className="admin-form-grid">
        {fields.map((field) => (
          <label key={field.name} className={field.full ? 'is-full' : ''}>
            <span>{field.label}{field.required && <b aria-hidden="true"> *</b>}</span>
            {field.type === 'textarea' ? (
              <textarea
                required={field.required}
                rows={field.rows ?? 4}
                value={String(values[field.name] ?? '')}
                placeholder={field.placeholder}
                onChange={(e) => set(field.name, e.target.value)}
              />
            ) : field.type === 'select' ? (
              <select
                required={field.required}
                value={String(values[field.name] ?? '')}
                onChange={(e) => set(field.name, e.target.value)}
              >
                <option value="">— Choisir —</option>
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            ) : (
              <input
                required={field.required}
                type={field.type ?? 'text'}
                value={String(values[field.name] ?? '')}
                placeholder={field.placeholder}
                onChange={(e) => set(field.name, e.target.value)}
              />
            )}
          </label>
        ))}
      </div>
      <div className="admin-modal-foot">
        {onCancel && <button type="button" className="admin-btn admin-btn-ghost" onClick={onCancel}>Annuler</button>}
        <button type="submit" className="admin-btn admin-btn-primary" disabled={pending}>
          {pending ? 'Enregistrement…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
