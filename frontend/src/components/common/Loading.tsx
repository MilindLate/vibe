// src/components/common/Loading.tsx
interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export function Loading({ size = 'md', fullScreen = false }: LoadingProps) {
  const sizeClasses = { sm: 'w-5 h-5 border-2', md: 'w-10 h-10 border-3', lg: 'w-16 h-16 border-4' };
  const spinner = (
    <div className={`${sizeClasses[size]} border-primary border-t-transparent rounded-full animate-spin`} />
  );
  if (fullScreen) {
    return <div className="h-screen flex items-center justify-center bg-black">{spinner}</div>;
  }
  return spinner;
}

export function VideoSkeleton() {
  return (
    <div className="video-card bg-vibe-dark flex items-end p-4">
      <div className="flex-1 space-y-2">
        <div className="shimmer h-4 w-32 rounded" />
        <div className="shimmer h-3 w-48 rounded" />
        <div className="shimmer h-3 w-40 rounded" />
      </div>
      <div className="flex flex-col items-center gap-4 ml-4">
        <div className="shimmer w-12 h-12 rounded-full" />
        <div className="shimmer w-8 h-8 rounded-full" />
        <div className="shimmer w-8 h-8 rounded-full" />
        <div className="shimmer w-8 h-8 rounded-full" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="shimmer h-32 rounded-xl" />
      <div className="flex items-center gap-3">
        <div className="shimmer w-20 h-20 rounded-full" />
        <div className="space-y-2">
          <div className="shimmer h-5 w-40 rounded" />
          <div className="shimmer h-4 w-28 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="shimmer aspect-square rounded-lg" />
        ))}
      </div>
    </div>
  );
}
