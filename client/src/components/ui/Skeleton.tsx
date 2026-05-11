import React from 'react';

interface SkeletonProps {
    className?: string;
    width?: string | number;
    height?: string | number;
    circle?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
    className = '', 
    width, 
    height, 
    circle = false 
}) => {
    const style: React.CSSProperties = {
        width: width,
        height: height,
        borderRadius: circle ? '50%' : '0.5rem',
    };

    return (
        <div 
            className={`animate-pulse bg-surface-200 ${className}`} 
            style={style}
        />
    );
};

export default Skeleton;
