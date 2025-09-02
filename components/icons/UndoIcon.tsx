import React from 'react';

export const UndoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h12a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5H9" />
  </svg>
);