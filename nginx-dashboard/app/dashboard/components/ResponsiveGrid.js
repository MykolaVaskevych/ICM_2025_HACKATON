'use client';

export default function ResponsiveGrid({ 
  children, 
  columns = { 
    sm: 1,
    md: 2,
    lg: 2,
    xl: 2
  },
  gap = 6,
  className = ''
}) {
  // Map gap value to Tailwind classes
  const gapClasses = {
    0: 'gap-0',
    1: 'gap-1',
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
    5: 'gap-5',
    6: 'gap-6',
    8: 'gap-8',
    10: 'gap-10',
    12: 'gap-12',
  };
  
  // Map column counts to Tailwind grid classes
  const gridClasses = {
    sm: {
      1: 'grid-cols-1',
      2: 'sm:grid-cols-2',
      3: 'sm:grid-cols-3',
      4: 'sm:grid-cols-4',
    },
    md: {
      1: 'md:grid-cols-1',
      2: 'md:grid-cols-2',
      3: 'md:grid-cols-3',
      4: 'md:grid-cols-4',
    },
    lg: {
      1: 'lg:grid-cols-1',
      2: 'lg:grid-cols-2',
      3: 'lg:grid-cols-3',
      4: 'lg:grid-cols-4',
    },
    xl: {
      1: 'xl:grid-cols-1',
      2: 'xl:grid-cols-2',
      3: 'xl:grid-cols-3',
      4: 'xl:grid-cols-4',
    },
  };

  // Build column classes
  const columnClasses = [
    'grid-cols-1', // Default is always 1 column on smallest screens
    columns.sm > 1 ? gridClasses.sm[columns.sm] : '',
    columns.md > 1 ? gridClasses.md[columns.md] : '',
    columns.lg > 1 ? gridClasses.lg[columns.lg] : '',
    columns.xl > 1 ? gridClasses.xl[columns.xl] : '',
  ].filter(Boolean).join(' ');
  
  // Build gap class
  const gapClass = gapClasses[gap] || 'gap-6'; // Default to gap-6 if not found

  return (
    <div className={`grid ${columnClasses} ${gapClass} ${className}`}>
      {children}
    </div>
  );
}