import Skeleton from '@/components/Skeleton';
import './ClubPages.css';

export default function ClubOverviewSkeleton() {
  return (
    <div className="club-page club-overview-skeleton">
      <div className="overview-tab">
        <div className="club-overview-skeleton__hero">
          <div className="club-overview-skeleton__hero-copy">
            <Skeleton width="124px" height="14px" className="club-overview-skeleton__eyebrow" />
            <Skeleton width="220px" height="34px" className="skeleton-title club-overview-skeleton__title" />
            <Skeleton width="320px" height="16px" className="club-overview-skeleton__subtitle" />
          </div>
          <div className="club-overview-skeleton__hero-chip">
            <Skeleton width="92px" height="14px" />
            <Skeleton width="58px" height="24px" />
          </div>
        </div>
        <div className="stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card stat-card-skeleton">
              <Skeleton width="38%" height="12px" className="club-overview-skeleton__metric-kicker" />
              <Skeleton width="72%" height="18px" className="skeleton-stat-label" />
              <Skeleton width="88px" height="42px" className="skeleton-stat-value" />
              <Skeleton width="54%" height="12px" className="club-overview-skeleton__metric-note" />
            </div>
          ))}
        </div>
        <div className="overview-issued-section club-overview-skeleton__issued">
          <div className="club-overview-skeleton__issued-head">
            <Skeleton width="180px" height="22px" />
            <Skeleton width="120px" height="18px" />
          </div>
          <div className="club-overview-skeleton__issued-search">
            <Skeleton width="260px" height="42px" />
            <Skeleton width="84px" height="18px" />
          </div>
          <div className="club-overview-skeleton__issued-table">
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className="club-overview-skeleton__issued-row">
                <Skeleton width="85%" height="16px" />
                <Skeleton width="70%" height="16px" />
                <Skeleton width="65%" height="16px" />
                <Skeleton width="50%" height="16px" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
