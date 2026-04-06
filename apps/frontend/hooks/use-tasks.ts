import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/api-client';

export const useTasks = (projectId: string) => {
    return useQuery({
        queryKey: ['projects', projectId, 'tasks'],
        queryFn: async () => {
            const response = await apiClient.get(`/projects/${projectId}/tasks`);
            return response.data.data;
        },
        enabled: !!projectId,
    });
};

export const useCreateTask = (projectId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: { title: string; description?: string; priority?: string; status?: string; dueDate?: string }) => {
            const response = await apiClient.post(`/projects/${projectId}/tasks`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'tasks'] });
            queryClient.invalidateQueries({ queryKey: ['tasks', 'all'] });
        },
    });
};

export const useUpdateTask = (projectId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string; title?: string; description?: string; priority?: string; status?: string }) => {
            const response = await apiClient.put(`/projects/${projectId}/tasks/${id}`, data);
            return response.data;
        },
        // Optimistic Update
        onMutate: async (updatedTask) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: ['projects', projectId, 'tasks'] });
            await queryClient.cancelQueries({ queryKey: ['tasks', 'all'] });

            // Snapshot the previous value
            const previousTasks = queryClient.getQueryData(['projects', projectId, 'tasks']);
            const previousAllTasks = queryClient.getQueryData(['tasks', 'all']);

            // Optimistically update to the new value
            queryClient.setQueryData(['projects', projectId, 'tasks'], (old: any) => {
                if (!old) return old;
                return old.map((t: any) => t._id === updatedTask.id ? { ...t, ...updatedTask } : t);
            });

            queryClient.setQueryData(['tasks', 'all'], (old: any) => {
                if (!old) return old;
                return old.map((t: any) => t._id === updatedTask.id ? { ...t, ...updatedTask } : t);
            });

            // Return a context object with the snapshotted value
            return { previousTasks, previousAllTasks };
        },
        // If the mutation fails, use the context returned from onMutate to roll back
        onError: (err, updatedTask, context: any) => {
            queryClient.setQueryData(['projects', projectId, 'tasks'], context.previousTasks);
            queryClient.setQueryData(['tasks', 'all'], context.previousAllTasks);
        },
        // Always refetch after error or success:
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'tasks'] });
            queryClient.invalidateQueries({ queryKey: ['tasks', 'all'] });
        },
    });
};

export const useDeleteTask = (projectId: string) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/projects/${projectId}/tasks/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'tasks'] });
            queryClient.invalidateQueries({ queryKey: ['tasks', 'all'] });
        },
    });
};
export const useAllTasks = () => {
    return useQuery({
        queryKey: ['tasks', 'all'],
        queryFn: async () => {
            const response = await apiClient.get('/tasks/all');
            return response.data.data;
        },
    });
};

export const useTask = (projectId: string, taskId: string) => {
    return useQuery({
        queryKey: ['projects', projectId, 'tasks', taskId],
        queryFn: async () => {
            const response = await apiClient.get(`/projects/${projectId}/tasks/${taskId}`);
            return response.data.data;
        },
        enabled: !!projectId && !!taskId,
    });
};
