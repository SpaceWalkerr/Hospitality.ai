/* Shared line icons. Kept local so the app has no icon-library dependency.
   All are decorative (aria-hidden); the control they sit in carries the name. */

type P = { className?: string };

export function ArrowRight({ className = "size-4" }: P) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" />
    </svg>
  );
}

export function ArrowLeft({ className = "size-4" }: P) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 8H4M7.5 4.5 4 8l3.5 3.5" />
    </svg>
  );
}

export function Check({ className = "size-3.5" }: P) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
      <path d="M6.2 11.4 3.3 8.5l1.1-1.1 1.8 1.8 4.4-4.4 1.1 1.1z" />
    </svg>
  );
}

export function Close({ className = "size-4" }: P) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}

export function Chevron({ className = "size-3.5" }: P) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M4 6.5 8 10.5 12 6.5" />
    </svg>
  );
}

export function Spark({ className = "size-3.5" }: P) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
      <path d="M8 0.8 9.4 5 13.6 6.4 9.4 7.8 8 12 6.6 7.8 2.4 6.4 6.6 5 8 0.8ZM13 10.2l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6.6-1.8Z" />
    </svg>
  );
}

export function Alert({ className = "size-4" }: P) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 4a.9.9 0 01.9.9v4.2a.9.9 0 11-1.8 0V6.9A.9.9 0 0110 6zm0 8.6a1.05 1.05 0 110-2.1 1.05 1.05 0 010 2.1z" />
    </svg>
  );
}

export function Info({ className = "size-4" }: P) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 4.1a1.05 1.05 0 110 2.1 1.05 1.05 0 010-2.1zM10 9a.9.9 0 01.9.9v3.9a.9.9 0 11-1.8 0V9.9A.9.9 0 0110 9z" />
    </svg>
  );
}

export function CheckCircle({ className = "size-4" }: P) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm3.7 6.2a.9.9 0 00-1.3-1.3L8.9 10.4 7.6 9.1a.9.9 0 00-1.3 1.3l2 2a.9.9 0 001.3 0l4.1-4.2z" />
    </svg>
  );
}

export function Refresh({ className = "size-4" }: P) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13.2 6.2A5.4 5.4 0 0 0 3.3 5M2.8 9.8a5.4 5.4 0 0 0 9.9 1.2" />
      <path d="M13.4 2.8v3.6H9.8M2.6 13.2V9.6h3.6" />
    </svg>
  );
}

export function Upload({ className = "size-7" }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

export function Doc({ className = "size-3" }: P) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
      <path d="M4.4 2.5h5l3.1 3.1v7.9a1 1 0 0 1-1 1h-7.1a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Zm4.7 1.6v2.1h2.1L9.1 4.1Z" />
    </svg>
  );
}

export function Shield({ className = "size-5" }: P) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 2.5 4 4.8v4.6c0 3.4 2.4 6.5 6 7.9 3.6-1.4 6-4.5 6-7.9V4.8L10 2.5Z" />
      <path d="M7.6 9.8 9.3 11.5 12.7 8.1" strokeLinecap="round" />
    </svg>
  );
}

export function Pin({ className = "size-5" }: P) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M10 17.5s5.5-4.9 5.5-9a5.5 5.5 0 1 0-11 0c0 4.1 5.5 9 5.5 9Z" strokeLinejoin="round" />
      <circle cx="10" cy="8.4" r="2.1" />
    </svg>
  );
}

export function Route({ className = "size-5" }: P) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <circle cx="4.5" cy="5" r="2.2" />
      <circle cx="15.5" cy="15" r="2.2" />
      <path d="M6.7 5h4.3a3.2 3.2 0 0 1 0 6.4H9a3.2 3.2 0 0 0 0 6.4h.3" />
    </svg>
  );
}

export function Lock({ className = "size-5" }: P) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="8.5" width="12" height="9" rx="2" />
      <path d="M6.8 8.5V6.3a3.2 3.2 0 0 1 6.4 0v2.2" />
    </svg>
  );
}

export function Calculator({ className = "size-5" }: P) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <rect x="4" y="2.5" width="12" height="15" rx="2" />
      <path d="M7 6.2h6M7 10h.01M10 10h.01M13 10h.01M7 13.5h.01M10 13.5h.01M13 13.5h.01" />
    </svg>
  );
}

export function Stethoscope({ className = "size-5" }: P) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M5 2.5v4.2a3.5 3.5 0 0 0 7 0V2.5" />
      <path d="M8.5 10.2v2.3a4 4 0 0 0 8 0v-1.2" />
      <circle cx="16.5" cy="9.6" r="1.7" />
    </svg>
  );
}

export function Search({ className = "size-5" }: P) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <circle cx="8.8" cy="8.8" r="5.3" />
      <path d="m12.8 12.8 4 4" />
    </svg>
  );
}

export function Sliders({ className = "size-4" }: P) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M2.5 4.5h6M12 4.5h1.5M2.5 11.5H4M7.5 11.5h6" />
      <circle cx="10.2" cy="4.5" r="1.7" />
      <circle cx="5.8" cy="11.5" r="1.7" />
    </svg>
  );
}
