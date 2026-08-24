import type { PropsWithChildren } from 'react';

export function AuthGuard({ children }: PropsWithChildren) {
  return <>{children}</>;
}
