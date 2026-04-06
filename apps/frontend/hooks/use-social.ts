import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/api-client';

export const useSearchUsers = (query: string, targetType?: string, targetId?: string) => {
    return useQuery({
        queryKey: ['users', 'search', query, targetType, targetId],
        queryFn: async () => {
            if (!query) return [];
            let url = `/users/search?q=${encodeURIComponent(query)}`;
            if (targetType && targetId) {
                url += `&targetType=${targetType}&targetId=${targetId}`;
            }
            const response = await apiClient.get(url);
            return response.data.data;
        },
        enabled: query.length >= 2, // Only text search if 2+ chars
        staleTime: 60 * 1000, // Cache results for 1 minute
    });
};

export const useSendInvitation = () => {
    return useMutation({
        mutationFn: async (data: { recipientId: string; targetType: 'Project' | 'Task'; targetId: string }) => {
            const response = await apiClient.post('/invitations', data);
            return response.data;
        },
    });
};

export const useMyInvitations = () => {
    return useQuery({
        // Keep the key in sync with socket invalidation
        queryKey: ['invitations'],
        queryFn: async () => {
            const response = await apiClient.get('/invitations');
            return response.data.data;
        },
        staleTime: 5 * 60 * 1000,
    });
};

export const useAcceptInvitation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (invitationId: string) => {
            const response = await apiClient.post(`/invitations/${invitationId}/accept`);
            return response.data;
        },
        onSuccess: (data) => {
            // Invalidate pending invites
            queryClient.invalidateQueries({ queryKey: ['invitations'] });
            // Invalidate the specific project/task data so the UI updates
            if (data.data.targetType === 'Project') {
                queryClient.invalidateQueries({ queryKey: ['projects'] });
                queryClient.invalidateQueries({ queryKey: ['project', data.data.targetId] });
            } else if (data.data.targetType === 'Task') {
                queryClient.invalidateQueries({ queryKey: ['tasks'] });
            }
        },
    });
};

export const useDeclineInvitation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (invitationId: string) => {
            const response = await apiClient.post(`/invitations/${invitationId}/decline`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['invitations'] });
        },
    });
};
