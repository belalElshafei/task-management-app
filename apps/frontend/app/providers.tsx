'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { SocketProvider } from '@/providers/socket-provider';

export default function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,
                retry: false,
            },
        },
    }));

    return (
        <QueryClientProvider client={queryClient}>
            <SocketProvider>
                {children}
            </SocketProvider>
        </QueryClientProvider>
    );
}

