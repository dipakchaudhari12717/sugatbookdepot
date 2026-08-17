/**
 * Brand marks. lucide-react dropped third-party brand icons in v1, so the
 * three we need are inlined here as plain SVG.
 */

type IconProps = React.SVGProps<SVGSVGElement>;

export function FacebookIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    </svg>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function WhatsAppIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 5L2 22l5.16-1.35a9.93 9.93 0 0 0 4.88 1.25h.004c5.5 0 9.96-4.46 9.96-9.96 0-2.66-1.04-5.16-2.92-7.04A9.88 9.88 0 0 0 12.04 2Zm0 1.68c2.2 0 4.28.86 5.84 2.42a8.2 8.2 0 0 1 2.42 5.86c0 4.58-3.72 8.28-8.3 8.28a8.27 8.27 0 0 1-4.22-1.16l-.3-.18-3.06.8.82-2.98-.2-.32a8.22 8.22 0 0 1-1.26-4.4c0-4.56 3.72-8.28 8.28-8.28h-.02Zm-2.5 4.4c-.16-.36-.34-.36-.5-.37h-.42a.82.82 0 0 0-.6.28c-.2.22-.78.76-.78 1.86s.8 2.16.9 2.3c.12.16 1.56 2.38 3.78 3.34.52.22.94.36 1.26.46.54.16 1.02.14 1.4.08.44-.06 1.32-.54 1.5-1.06.18-.52.18-.96.13-1.06-.06-.1-.2-.16-.42-.28-.22-.1-1.32-.66-1.52-.72-.2-.08-.36-.12-.5.1-.16.22-.58.72-.7.88-.14.14-.26.16-.48.06-.22-.12-.94-.36-1.8-1.12a6.7 6.7 0 0 1-1.24-1.54c-.12-.22-.02-.34.1-.44.1-.1.22-.26.34-.4.1-.14.14-.22.22-.38.08-.14.04-.28-.02-.4-.06-.1-.5-1.22-.68-1.66Z" />
    </svg>
  );
}
