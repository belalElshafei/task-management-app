'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLogout, useMe } from '@/hooks/use-auth';
import { useMyInvitations, useAcceptInvitation, useDeclineInvitation } from '@/hooks/use-social';
import { useSocketNotifications } from '@/hooks/use-socket-notifications';
import { useEffect, useState, useRef } from 'react';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-notifications';
import { Bell, Check, X, Circle, Trash2, CheckCheck } from 'lucide-react';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { data: user, isLoading, isError } = useMe();
    const { mutate: logout } = useLogout();

    // Invitations
    const { data: invitations, isLoading: invitationsLoading } = useMyInvitations();
    const { mutate: acceptInvite } = useAcceptInvitation();
    const { mutate: declineInvite } = useDeclineInvitation();

    // Notifications
    const { data: notifications, isLoading: notificationsLoading } = useNotifications();
    const { mutate: markRead } = useMarkNotificationRead();
    const { mutate: markAllRead } = useMarkAllNotificationsRead();

    // Activate socket event listeners for real-time updates
    useSocketNotifications();

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const pendingInvitations = Array.isArray(invitations) ? invitations : [];
    const recentNotifications = Array.isArray(notifications) ? notifications : [];
    const unreadCount = recentNotifications.filter(n => !n.isRead).length;
    const totalCount = pendingInvitations.length + unreadCount;

    useEffect(() => {
        if (isError) {
            router.push('/login');
        }
    }, [isError, router]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
                {/* Top bar with unified notifications */}
                <div className="flex justify-end mb-6" ref={dropdownRef}>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen((o: boolean) => !o)}
                            className="relative p-2 rounded-full text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Notifications"
                        >
                            <Bell className="h-6 w-6" />
                            {totalCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                    {totalCount}
                                </span>
                            )}
                        </button>
                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-96 rounded-lg border border-gray-200 bg-white shadow-lg z-50 max-h-[80vh] overflow-y-auto flex flex-col">
                                <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                    <div>
                                        <h3 className="font-semibold text-gray-800">Notifications</h3>
                                        <p className="text-xs text-gray-500">Stay updated on your workspace</p>
                                    </div>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={() => markAllRead()}
                                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                                        >
                                            <CheckCheck className="h-3 w-3" /> Mark all read
                                        </button>
                                    )}
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    {/* SECTION: INVITATIONS */}
                                    {pendingInvitations.length > 0 && (
                                        <div className="p-2 border-b border-gray-100 bg-blue-50/30">
                                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider px-2 py-1">Pending Invitations</p>
                                            <ul className="space-y-1 mt-1">
                                                {pendingInvitations.map((inv: any) => (
                                                    <li
                                                        key={inv._id}
                                                        className="flex flex-col gap-2 rounded-md border border-blue-100 bg-white p-3 shadow-sm hover:border-blue-200"
                                                    >
                                                        <div className="text-sm">
                                                            <span className="font-semibold text-gray-900">
                                                                {inv.sender?.name || 'Someone'}
                                                            </span>
                                                            <span className="text-gray-600"> invited you to </span>
                                                            <span className="font-semibold text-gray-900">
                                                                {inv.targetType === 'Project'
                                                                    ? (inv.targetId?.name ?? 'Project')
                                                                    : (inv.targetId?.title ?? 'Task')}
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    acceptInvite(inv._id);
                                                                }}
                                                                className="flex-1 inline-flex items-center justify-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm"
                                                            >
                                                                <Check className="h-3.5 w-3.5" /> Accept
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    declineInvite(inv._id);
                                                                }}
                                                                className="flex-1 inline-flex items-center justify-center gap-1 rounded bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 border border-gray-200"
                                                            >
                                                                <X className="h-3.5 w-3.5" /> Decline
                                                            </button>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* SECTION: GENERAL NOTIFICATIONS */}
                                    <div className="p-2">
                                        {(invitationsLoading || notificationsLoading) ? (
                                            <p className="text-sm text-gray-500 py-8 text-center italic">Loading updates...</p>
                                        ) : (pendingInvitations.length === 0 && recentNotifications.length === 0) ? (
                                            <div className="py-12 text-center flex flex-col items-center gap-2">
                                                <Bell className="h-8 w-8 text-gray-200" />
                                                <p className="text-sm text-gray-400 font-medium">All caught up!</p>
                                            </div>
                                        ) : (
                                            <ul className="space-y-1">
                                                {recentNotifications.map((notif: any) => (
                                                    <li
                                                        key={notif._id}
                                                        onClick={() => {
                                                            if (!notif.isRead) markRead(notif._id);
                                                            let targetUrl = notif.link;

                                                            if (notif.type === 'INVITATION_RECEIVED' && targetUrl === '/dashboard') {
                                                                targetUrl = '/dashboard/notifications';
                                                            }

                                                            if (notif.metadata) {
                                                                if (notif.metadata.projectId && notif.metadata.taskId) {
                                                                    targetUrl = `/dashboard/projects/${notif.metadata.projectId}/tasks/${notif.metadata.taskId}`;
                                                                } else if (notif.metadata.targetType === 'Project' && notif.metadata.targetId) {
                                                                    targetUrl = `/dashboard/projects/${notif.metadata.targetId}`;
                                                                } else if (notif.metadata.targetType === 'Task' && notif.metadata.projectId && notif.metadata.targetId) {
                                                                    targetUrl = `/dashboard/projects/${notif.metadata.projectId}/tasks/${notif.metadata.targetId}`;
                                                                }
                                                            }
                                                            router.push(targetUrl);
                                                            setIsDropdownOpen(false);
                                                        }}
                                                        className={`relative group flex items-start gap-3 rounded-md p-3 transition-colors cursor-pointer ${notif.isRead ? 'opacity-70 hover:bg-gray-50' : 'bg-white border-l-4 border-l-blue-500 shadow-sm hover:bg-blue-50/30'
                                                            }`}
                                                    >
                                                        <div className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${notif.isRead ? 'bg-gray-300' : 'bg-blue-500 animate-pulse'}`} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-sm leading-tight ${notif.isRead ? 'text-gray-600' : 'text-gray-900 font-bold'}`}>
                                                                {notif.title}
                                                            </p>
                                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                                                {notif.message}
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 mt-2 font-medium">
                                                                {new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                        {notif.isRead ? null : (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    markRead(notif._id);
                                                                }}
                                                                className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-200 transition-opacity"
                                                                title="Mark as read"
                                                            >
                                                                <Check className="h-4 w-4 text-gray-400" />
                                                            </button>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                                <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
                                    <Link
                                        href="/dashboard/notifications"
                                        className="text-xs font-semibold text-gray-500 hover:text-gray-800"
                                        onClick={() => setIsDropdownOpen(false)}
                                    >
                                        View all activities
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {children}
            </main>
        </div>
    );
}
