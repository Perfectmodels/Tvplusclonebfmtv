'use client';

import { useState } from 'react';

export type ScheduleItem = { time: string; title: string; category: string; live: boolean };

const days = ['Aujourd’hui', 'Demain', 'Après-demain'];

export default function ScheduleBoard({ items }: { items: ScheduleItem[] }) {
  const [day, setDay] = useState(0);

  return (
    <>
      <div className="filter-bar" role="group" aria-label="Choisir un jour">
        {days.map((label, i) => (
          <button
            key={label}
            type="button"
            className={'filter-chip' + (day === i ? ' is-active' : '')}
            aria-pressed={day === i}
            onClick={() => setDay(i)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="schedule">
        {items.map((slot) => (
          <div className={'schedule-row' + (slot.live && day === 0 ? ' is-live' : '')} key={slot.time}>
            <span className="schedule-time">{slot.time}</span>
            <span className="schedule-body">
              <span className="fil-category">{slot.category}</span>
              <strong>{slot.title}</strong>
            </span>
            {slot.live && day === 0 && <span className="schedule-live">En direct</span>}
          </div>
        ))}
      </div>
    </>
  );
}
