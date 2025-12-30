import React from 'react';
import './SkeletonLoader.css';

const SkeletonLoader = ({ type = 'text', width = '100%', height, className = '' }) => {
  const skeletonClass = `skeleton-loader skeleton-loader-${type} ${className}`;

  const style = {
    width,
    ...(height && { height }),
  };

  return <div className={skeletonClass} style={style}></div>;
};

export default SkeletonLoader;