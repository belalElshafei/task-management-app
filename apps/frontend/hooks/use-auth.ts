import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/api-client';

export const useRegister = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const response = await apiClient.post('/auth/register', data);
            return response.data;
        },
        onSuccess: (data) => {
            const user = data?.data;
            if (user) {
                queryClient.setQueryData(['user'], {
                    ...user,
                    name: user.name || user.email || 'User',
                });
            }
        },
    });
};

export const useLogin = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const response = await apiClient.post('/auth/login', data);
            return response.data;
        },
        onSuccess: (data) => {
            const user = data?.data;
            if (user) {
                queryClient.setQueryData(['user'], {
                    ...user,
                    name: user.name || user.email || 'User',
                });
            }
        },
    });
};

export const useLogout = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            await apiClient.post('/auth/logout');
        },
        onSuccess: () => {
            queryClient.setQueryData(['user'], null);
        },
    });
};

export const useMe = () => {
    return useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            const response = await apiClient.get('/auth/me');
            const data = response.data?.data;
            return {
                ...data,
                name: data?.name || data?.email || 'User',
            };
        },
        retry: false,
        staleTime: 0,
        refetchOnWindowFocus: true,
    });
};
