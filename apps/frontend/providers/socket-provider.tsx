'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { useMe } from '@/hooks/use-auth';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const { data: user, isError } = useMe(); // Only connect if authenticated

    useEffect(() => {
        // If authenticated, initialize socket
        if (user && !isError) {
            const socketInstance = getSocket();
            setSocket(socketInstance);

            socketInstance.on('connect', () => {
                setIsConnected(true);
            });

            socketInstance.on('disconnect', () => {
                setIsConnected(false);
            });

            socketInstance.connect();

            return () => {
                socketInstance.off('connect');
                socketInstance.off('disconnect');
                disconnectSocket();
            };
        } else {
            // Disconnect if auth fails or logs out
            disconnectSocket();
            setSocket(null);
            setIsConnected(false);
        }
    }, [user, isError]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
