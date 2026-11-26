'use client';

import TvPlusLogo from '../TvPlusLogo';
import './payment-loader.css';

export default function PaymentLoader({
  message = 'Paiement en cours',
  visible = true,
}: {
  message?: string;
  visible?: boolean;
}) {
  if (!visible) return null;

  return (
    <div className="payment-loader" role="status" aria-live="polite" aria-busy="true">
      <div className="payment-background" aria-hidden="true" />

      <div className="payment-content">
        <div className="loader-container" aria-hidden="true">
          <div className="loader-halo" />
          <div className="loader-orbit" />
          <div className="loader-track" />
          <div className="loader-ring" />
          <div className="loader-logo"><TvPlusLogo /></div>
        </div>

        <h2 className="payment-title">
          {message}
          <span className="loading-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>
        </h2>

        <p className="payment-description">Veuillez patienter pendant le traitement de votre transaction.</p>

        <div className="payment-progress" aria-hidden="true"><div className="payment-progress-bar" /></div>

        <div className="payment-secure">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="5" y="10" width="14" height="11" rx="3" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            <path d="M12 14v3" />
          </svg>
          <span>Ne fermez pas cette page</span>
        </div>
      </div>
    </div>
  );
}
