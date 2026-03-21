'use client';

import { useState, useEffect } from 'react';
import { useSearchUsers, useSendInvitation } from '@/hooks/use-social';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface UserSearchDialogProps {
    isOpen: boolean;
    onClose: () => void;
    targetType: 'Project' | 'Task';
    targetId: string;
}

export function UserSearchDialog({ isOpen, onClose, targetType, targetId }: UserSearchDialogProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedTerm, setDebouncedTerm] = useState('');
    const [invitedUsers, setInvitedUsers] = useState<Set<string>>(new Set());

    // Debounce logic
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedTerm(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const { data: users, isLoading } = useSearchUsers(debouncedTerm, targetType, targetId);
    const { mutate: sendInvite, isPending: isInviting } = useSendInvitation();

    const handleInvite = (userId: string) => {
        sendInvite(
            { recipientId: userId, targetType, targetId },
            {
                onSuccess: () => {
                    toast.success('Invitation sent successfully!');
                    setInvitedUsers(prev => new Set(prev).add(userId));
                },
                onError: (error: any) => {
                    toast.error(error.response?.data?.message || 'Failed to send invitation');
                }
            }
        );
    };

    // Reset state when closed
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
            setInvitedUsers(new Set());
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Invite to {targetType}</DialogTitle>
                    <DialogDescription>
                        Search for users by name or email to invite them.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <Input
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                    />

                    <div className="flex flex-col space-y-2 max-h-[300px] overflow-y-auto">
                        {isLoading && searchTerm.length >= 2 ? (
                            <div className="flex justify-center p-4">
                                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                            </div>
                        ) : users && users.length > 0 ? (
                            users.map((user: any) => {
                                const isAlreadyMember = user.isMember;
                                const isAlreadyInvited = user.isInvited || invitedUsers.has(user._id);
                                const isDisabled = isAlreadyMember || isAlreadyInvited || isInviting;

                                return (
                                    <div key={user._id} className="flex items-center justify-between p-3 border rounded-md">
                                        <div>
                                            <p className="font-medium text-sm">{user.name}</p>
                                            <p className="text-xs text-gray-500">{user.email}</p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant={isDisabled ? "secondary" : "default"}
                                            disabled={isDisabled}
                                            onClick={() => handleInvite(user._id)}
                                        >
                                            {isAlreadyMember ? (
                                                <><Check className="mr-2 h-4 w-4" /> Member</>
                                            ) : isAlreadyInvited ? (
                                                <><Check className="mr-2 h-4 w-4" /> Invited</>
                                            ) : (
                                                <><UserPlus className="mr-2 h-4 w-4" /> Invite</>
                                            )}
                                        </Button>
                                    </div>
                                );
                            })
                        ) : debouncedTerm.length >= 2 ? (
                            <p className="text-center text-sm text-gray-500 p-4">No users found.</p>
                        ) : null}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
