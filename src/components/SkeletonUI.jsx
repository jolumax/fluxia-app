import React from 'react';

export const Skeleton = ({ width, height, borderRadius = "4px", className = "" }) => (
  <div 
    className={`skeleton ${className}`}
    style={{ width, height, borderRadius }}
  />
);

export const SkeletonCard = () => (
  <div className="card" style={{ padding: '20px' }}>
    <Skeleton width="40%" height="14px" className="mb-4" />
    <Skeleton width="80%" height="32px" className="mb-2" />
    <Skeleton width="100%" height="60px" />
  </div>
);

export const SkeletonKPI = () => (
  <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
    <Skeleton width="30%" height="12px" />
    <Skeleton width="60%" height="24px" />
    <div style={{ marginTop: 'auto' }}>
      <Skeleton width="100%" height="4px" />
    </div>
  </div>
);

export const SkeletonTable = ({ rows = 5 }) => (
  <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
    <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
        <Skeleton width="200px" height="24px" />
        <div style={{ display: 'flex', gap: '8px' }}>
            <Skeleton width="80px" height="32px" />
            <Skeleton width="80px" height="32px" />
        </div>
    </div>
    <div style={{ padding: '0 20px' }}>
      {[...Array(rows)].map((_, i) => (
        <div key={i} style={{ display: 'flex', padding: '16px 0', borderBottom: i < rows - 1 ? '1px solid var(--border)' : 'none', gap: '20px' }}>
          <Skeleton width="10%" height="16px" />
          <Skeleton width="30%" height="16px" />
          <Skeleton width="15%" height="16px" />
          <Skeleton width="15%" height="16px" />
          <Skeleton width="10%" height="16px" />
          <Skeleton width="10%" height="16px" style={{ marginLeft: 'auto' }} />
        </div>
      ))}
    </div>
  </div>
);

export const DashboardSkeleton = () => (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            <SkeletonKPI />
            <SkeletonKPI />
            <SkeletonKPI />
            <SkeletonKPI />
        </div>
        <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '20px' }}>
            <SkeletonCard />
            <SkeletonCard />
        </div>
        <SkeletonTable rows={6} />
    </div>
);
