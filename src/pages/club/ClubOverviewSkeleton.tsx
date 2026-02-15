import Skeleton from '@/components/Skeleton';
import './ClubPages.css';

export default function ClubOverviewSkeleton() {
  return (
    <div className="club-page club-overview-skeleton">
      <div className="overview-tab">
        <Skeleton width="120px" height="28px" className="skeleton-title" />
        <div className="stats-grid">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="stat-card stat-card-skeleton">
              <Skeleton width="70%" height="16px" className="skeleton-stat-label" />
              <Skeleton width="60px" height="42px" className="skeleton-stat-value" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
