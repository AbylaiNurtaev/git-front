import './Skeleton.css';

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

export default function Skeleton({ width, height, className = '' }: SkeletonProps) {
  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || '1rem',
  };

  return <div className={`skeleton ${className}`} style={style} />;
}
