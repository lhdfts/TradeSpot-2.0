import React from 'react';

export const ExportIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 310 70"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <g id="svgg">
            <path id="path0" d="M10 10 h50 v50 h-50 Z" stroke="none" fill="currentColor" fillRule="evenodd"></path>
            <path id="path1" d="M70 10 h50 v50 h-50 Z" stroke="none" fill="currentColor" fillRule="evenodd"></path>
            <path id="path2" d="M130 10 h50 v50 h-50 Z" stroke="none" fill="currentColor" fillRule="evenodd"></path>
            <path id="path3" d="M190 10 h50 v50 h-50 Z" stroke="none" fill="currentColor" fillRule="evenodd"></path>
            <path id="path4" d="M250 10 h50 v50 h-50 Z" stroke="none" fill="currentColor" fillRule="evenodd"></path>
        </g>
    </svg>
);
