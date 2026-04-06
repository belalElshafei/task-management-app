import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/providers/socket-provider';

export const useSocketNotifications = () => {
    const { socket, isConnected } = useSocket();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!socket || !isConnected) return;

        // --- INVITATION EVENTS ---

        socket.on('new_invitation', (invitation) => {
            console.log('[Socket] Received new invitation:', invitation);
            queryClient.invalidateQueries({ queryKey: ['invitations'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] }); // Also invalidate notifications
        });

        socket.on('new_notification', (data) => {
            console.log('[Socket] Received new notification:', data);
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            if (data && data.type === 'INVITATION_RECEIVED') {
                queryClient.invalidateQueries({ queryKey: ['invitations'] });
            }
        });

        socket.on('invitation_accepted', (invitation) => {
            console.log('[Socket] Invitation accepted:', invitation);
            queryClient.invalidateQueries({ queryKey: ['invitations'] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        });

        socket.on('invitation_declined', (data) => {
            console.log('[Socket] Invitation declined:', data);
            queryClient.invalidateQueries({ queryKey: ['invitations'] });
        });

        // --- TASK EVENTS ---

        socket.on('task_created', (task) => {
            console.log('[Socket] Task created in project:', task.project);
            queryClient.invalidateQueries({ queryKey: ['tasks', task.project] });
            queryClient.invalidateQueries({ queryKey: ['taskStats'] });
        });

        socket.on('task_updated', (task) => {
            console.log('[Socket] Task updated:', task._id);
            queryClient.invalidateQueries({ queryKey: ['tasks', task.project] });
            queryClient.invalidateQueries({ queryKey: ['task', task._id] });
            queryClient.invalidateQueries({ queryKey: ['taskStats'] });
        });

        socket.on('task_deleted', (data) => {
            console.log('[Socket] Task deleted:', data.id);
            // We invalidate all tasks because the specific project ID isn't in the generic delete event 
            // without a backend refactor, though could be optimized.
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['taskStats'] });
        });

        socket.on('task_assigned', (task) => {
            console.log('[Socket] Assigned to new task:', task._id);
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        });

        return () => {
            socket.off('new_invitation');
            socket.off('invitation_accepted');
            socket.off('invitation_declined');
            socket.off('task_created');
            socket.off('task_updated');
            socket.off('task_deleted');
            socket.off('task_assigned');
        };
    }, [socket, isConnected, queryClient]);
};
