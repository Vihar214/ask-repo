import { useCallback, useEffect, useRef } from 'react';

type UseInfiniteScrollOptions = {
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
};

export const useInfiniteScroll = ({
  isLoading,
  hasMore,
  onLoadMore,
}: UseInfiniteScrollOptions) => {
  const observerRef = useRef<HTMLDivElement | null>(null);
  const prevLength = useRef<number>(0);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !isLoading) {
        onLoadMore();
      }
    },
    [hasMore, isLoading, onLoadMore],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '200px',
      threshold: 0,
    });

    const currentObserverRef = observerRef.current;

    if (currentObserverRef) {
      observer.observe(currentObserverRef);
    }

    return () => {
      if (currentObserverRef) {
        observer.unobserve(currentObserverRef);
      }
    };
  }, [handleObserver]);

  useEffect(() => {
    if (prevLength.current === 0 && hasMore && !isLoading) {
      onLoadMore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    observerRef,
    setPrevLength: (len: number) => (prevLength.current = len),
  };
};
