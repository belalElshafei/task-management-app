'use client';

import { useState, useCallback, useEffect } from 'react';

interface ConfirmState {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

let confirmListeners: Array<(state: ConfirmState) => void> = [];
let currentState: ConfirmState = {
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    onCancel: () => { },
};

const notify = () => {
    confirmListeners.forEach(listener => listener({ ...currentState }));
};

export const confirmPremium = (title: string, message: string): Promise<boolean> => {
    return new Promise((resolve) => {
        currentState = {
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                currentState.isOpen = false;
                notify();
                resolve(true);
            },
            onCancel: () => {
                currentState.isOpen = false;
                notify();
                resolve(false);
            }
        };
        notify();
    });
};

export const useConfirmState = () => {
    const [state, setState] = useState<ConfirmState>(currentState);

    useEffect(() => {
        const listener = (newState: ConfirmState) => setState(newState);
        confirmListeners.push(listener);
        return () => {
            confirmListeners = confirmListeners.filter(l => l !== listener);
        };
    }, []);

    return state;
};
