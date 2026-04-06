'use client';

import { useState, useCallback, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

let toastListeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

const notify = () => {
    toastListeners.forEach(listener => listener([...toasts]));
};

export const toast = (message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    toasts.push({ id, message, type });
    notify();

    setTimeout(() => {
        toasts = toasts.filter(t => t.id !== id);
        notify();
    }, 3000);
};

export const useToasts = () => {
    const [currentToasts, setCurrentToasts] = useState<Toast[]>(toasts);

    useEffect(() => {
        const listener = (newToasts: Toast[]) => setCurrentToasts(newToasts);
        toastListeners.push(listener);
        return () => {
            toastListeners = toastListeners.filter(l => l !== listener);
        };
    }, []);

    return currentToasts;
};
