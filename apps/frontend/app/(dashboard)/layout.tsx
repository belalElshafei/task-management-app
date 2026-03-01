'use client';
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLogout, useMe } from '@/hooks/use-auth';
import { useEffect } from 'react';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { data: user, isLoading, isError, error } = useMe();
    const { mutate: logout } = useLogout();

    useEffect(() => {
        // Only redirect if authentication has definitively failed (401 Unauthorized)
        // AND we are strictly NOT in a loading state. 
        // This prevents redirects during fast client-side transitions.
        const axiosError = error as any;
        if (!isLoading && isError && axiosError?.response?.status === 401) {
            console.warn('[Dashboard] Unauthorized access. Redirecting to login.');
            router.replace('/login');
        }
    }, [isError, isLoading, error, router]);

    const handleLogout = () => {
        console.log('Attempting logout...');
        logout(undefined, {
            onSuccess: () => {
                console.log('Logout successful, redirecting to /login');
                router.push('/login');
            },
            onError: (err) => {
                console.error('Logout failed:', err);
                // Fallback redirect even if API fails
                router.push('/login');
            }
        });
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    <p className="text-gray-500 font-medium animate-pulse">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-10 w-10 text-red-500">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <p className="text-gray-900 font-bold">Session Expired</p>
                    <p className="text-gray-500 text-sm">Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-white shadow-md">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-gray-800">TaskFlow</h1>
                </div>
                <nav className="mt-6">
                    <Link href="/dashboard" className="block px-6 py-3 text-gray-700 hover:bg-gray-200">
                        Overview
                    </Link>
                    <Link href="/dashboard/projects" className="block px-6 py-3 text-gray-700 hover:bg-gray-200">
                        Projects
                    </Link>
                    <Link href="/dashboard/tasks" className="block px-6 py-3 text-gray-700 hover:bg-gray-200">
                        All Tasks
                    </Link>
                </nav>
                <div className="absolute bottom-0 w-64 border-t p-6">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                            {user?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="text-sm font-medium text-gray-700 truncate">
                            {isLoading ? '...' : (user?.name || 'User')}
                        </span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full text-left text-sm text-red-600 hover:text-red-800"
                    >
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-10">
                {children}
            </main>
        </div>
    );
}
