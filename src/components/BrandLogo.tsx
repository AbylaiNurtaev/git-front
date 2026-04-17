import './BrandLogo.css';

type BrandLogoVariant = 'default' | 'stacked';

interface BrandLogoProps {
  src?: string | null;
  alt?: string;
  className?: string;
  variant?: BrandLogoVariant;
}

export default function BrandLogo({
  src,
  alt = 'Spin Club',
  className = '',
  variant = 'default',
}: BrandLogoProps) {
  const classes = ['brand-logo', `brand-logo--${variant}`, className]
    .filter(Boolean)
    .join(' ');

  if (src) {
    return <img src={src} alt={alt} className={className} />;
  }

  return (
    <span className={classes} role="img" aria-label={alt}>
      <span className="brand-logo__spin">Spin</span>
      <span className="brand-logo__club">Club</span>
    </span>
  );
}
