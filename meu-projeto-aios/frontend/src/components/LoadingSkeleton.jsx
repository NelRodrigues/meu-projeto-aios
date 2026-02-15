import '../styles/loading-skeleton.css';

export function SkeletonCard() {
  return (
    <div className="skeleton skeleton-card">
      <div className="skeleton-line skeleton-title"></div>
      <div className="skeleton-line"></div>
      <div className="skeleton-line" style={{ width: '80%' }}></div>
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="skeleton skeleton-chart">
      <div className="skeleton-line skeleton-title"></div>
      <div className="skeleton-bars">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="skeleton-bar"
            style={{
              height: `${Math.random() * 60 + 20}%`,
              animationDelay: `${i * 0.1}s`,
            }}
          ></div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonGrid() {
  return (
    <div className="skeleton-grid">
      {[1, 2, 3, 4].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export default function LoadingSkeleton({ type = 'card' }) {
  switch (type) {
    case 'chart':
      return <SkeletonChart />;
    case 'grid':
      return <SkeletonGrid />;
    default:
      return <SkeletonCard />;
  }
}
