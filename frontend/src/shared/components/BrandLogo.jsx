import logoUrl from '../../assets/logo.webp';

/**
 * Official brand mark — use everywhere the GDG Kolachi logo should appear.
 * Size via `className` (e.g. `h-9 w-auto`, `h-20 max-w-[200px]`).
 */
export default function BrandLogo({ className = '', alt = 'GDG Kolachi', ...rest }) {
  return (
    <img
      src={logoUrl}
      alt={alt}
      className={`object-contain ${className}`.trim()}
      {...rest}
    />
  );
}
