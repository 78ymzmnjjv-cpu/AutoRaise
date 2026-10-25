// 島の中で使う最小限のアイコン（lucide と同じ 24px グリッド・線幅）
type P = { size?: number; className?: string };
const S = ({ size = 16, className, children, fill = "none" }: P & { children: React.ReactNode; fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    {children}
  </svg>
);
export const Play = (p: P) => <S {...p} fill="currentColor"><path d="M7 4.5v15l12.5-7.5z" stroke="none" /></S>;
export const Pause = (p: P) => <S {...p} fill="currentColor"><rect x="6" y="4.5" width="4" height="15" rx="1" stroke="none" /><rect x="14" y="4.5" width="4" height="15" rx="1" stroke="none" /></S>;
export const Next = (p: P) => <S {...p} fill="currentColor"><path d="M4 5v14l10-7z M16 5h3v14h-3z" stroke="none" /></S>;
export const Prev = (p: P) => <S {...p} fill="currentColor"><path d="M20 5v14L10 12z M5 5h3v14H5z" stroke="none" /></S>;
export const Bolt = (p: P) => <S {...p} fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7z" stroke="none" /></S>;
export const X = (p: P) => <S {...p}><path d="M18 6 6 18M6 6l12 12" /></S>;
export const Share = (p: P) => <S {...p}><path d="M12 3v13M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></S>;
export const Clip = (p: P) => <S {...p}><rect x="8" y="3" width="8" height="4" rx="1" /><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" /></S>;
export const Bell = (p: P) => <S {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" /></S>;
export const Tray = (p: P) => <S {...p}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></S>;
export const Timer = (p: P) => <S {...p}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M10 2h4" /></S>;
export const Rec = (p: P) => <S {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" fill="currentColor" /></S>;
export const Spark = (p: P) => <S {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" /></S>;
export const Back = (p: P) => <S {...p}><path d="m15 18-6-6 6-6" /></S>;
export const Headphones = (p: P) => <S {...p}><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" /></S>;
export const Calendar = (p: P) => <S {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></S>;
export const Mic = (p: P) => <S {...p}><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" /></S>;
