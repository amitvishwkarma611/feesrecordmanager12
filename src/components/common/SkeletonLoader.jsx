import React from 'react';
import './SkeletonLoader.css';

const SkeletonLoader = ({ type = 'card', width = '100%', height = 'auto', count = 1 }) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className="skeleton-card" style={{ width, height }}>
            <div className="skeleton-header"></div>
            <div className="skeleton-content">
              <div className="skeleton-line"></div>
              <div className="skeleton-line"></div>
              <div className="skeleton-line"></div>
            </div>
          </div>
        );
      case 'text':
        return (
          <div className="skeleton-text" style={{ width, height }}>
            <div className="skeleton-line"></div>
          </div>
        );
      case 'avatar':
        return (
          <div className="skeleton-avatar" style={{ width, height }}></div>
        );
      case 'image':
        return (
          <div className="skeleton-image" style={{ width, height }}></div>
        );
      default:
        return (
          <div className="skeleton-default" style={{ width, height }}></div>
        );
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton-wrapper">
          {renderSkeleton()}
        </div>
      ))}
    </>
  );
};

export default SkeletonLoader;