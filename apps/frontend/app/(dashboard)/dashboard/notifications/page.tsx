'use client';

import { useMyInvitations, useAcceptInvitation, useDeclineInvitation } from '@/hooks/use-social';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-notifications';
import { useSocketNotifications } from '@/hooks/use-socket-notifications';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
    const router = useRouter();

    // Hooks
    const { data: invitations, isLoading: invitationsLoading } = useMyInvitations();
    const { mutate: acceptInvite } = useAcceptInvitation();
    const { mutate: declineInvite } = useDeclineInvitation();

    const { data: notifications, isLoading: notificationsLoading } = useNotifications();
    const { mutate: markRead } = useMarkNotificationRead();
    const { mutate: markAllRead } = useMarkAllNotificationsRead();

    useSocketNotifications();

    const pendingInvitations = Array.isArray(invitations) ? invitations : [];
    const recentNotifications = Array.isArray(notifications) ? notifications : [];

    if (invitationsLoading || notificationsLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Bell className="h-6 w-6" /> Notifications & Activities
                </h1>
                {recentNotifications.some(n => !n.isRead) && (
                    <button
                        onClick={() => markAllRead()}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 px-4 py-2 rounded-lg"
                    >
                        <CheckCheck className="h-4 w-4" /> Mark all as read
                    </button>
                )}
            </div>

            <div className="space-y-8">
                {/* Invitations Section */}
                {pendingInvitations.length > 0 && (
                    <section>
                        <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Pending Invitations</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            {pendingInvitations.map((inv: any) => (
                                <div key={inv._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">
                                            <span className="font-bold text-gray-900">{inv.sender?.name || 'Someone'}</span> invited you to a {inv.targetType}
                                        </p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {inv.targetType === 'Project' ? (inv.targetId?.name ?? 'Project') : (inv.targetId?.title ?? 'Task')}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-2">
                                            {new Date(inv.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-3 mt-auto pt-4 border-t border-gray-50">
                                        <button
                                            onClick={() => acceptInvite(inv._id)}
                                            className="flex-1 bg-blue-600 text-white rounded-lg py-2 font-medium text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition"
                                        >
                                            <Check className="h-4 w-4" /> Accept
                                        </button>
                                        <button
                                            onClick={() => declineInvite(inv._id)}
                                            className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition"
                                        >
                                            <X className="h-4 w-4" /> Decline
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* System Notifications Section */}
                <section>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Recent Notifications</h2>
                    {recentNotifications.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500 flex flex-col items-center gap-3">
                            <Bell className="h-10 w-10 text-gray-300" />
                            <p>You have no recent notifications.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                            {recentNotifications.map((notif: any) => (
                                <div
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
                                    }}
                                    className={`p-4 flex gap-4 transition-colors cursor-pointer ${notif.isRead ? 'bg-white hover:bg-gray-50' : 'bg-blue-50/20 hover:bg-blue-50/40 relative'}`}
                                >
                                    {!notif.isRead && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                                    )}
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className={`font-semibold ${notif.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                                                {notif.title}
                                            </h3>
                                            <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                                                {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600">{notif.message}</p>
                                    </div>
                                    {!notif.isRead && (
                                        <div className="flex items-center">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markRead(notif._id);
                                                }}
                                                className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                                                title="Mark as read"
                                            >
                                                <Check className="h-5 w-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
