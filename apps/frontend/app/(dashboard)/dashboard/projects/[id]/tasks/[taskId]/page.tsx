'use client';

import { useParams, useRouter } from 'next/navigation';
import { useTask, useUpdateTask } from '@/hooks/use-tasks';
import { useState, useEffect } from 'react';
import { useProject } from '@/hooks/use-projects';
import { toast } from '@/hooks/use-toast';
import { UserSearchDialog } from '@/components/user-search-dialog';
import { Users } from 'lucide-react';

export default function TaskDetailsPage() {
    const { id: projectId, taskId } = useParams() as { id: string; taskId: string };
    const router = useRouter();

    const { data: project } = useProject(projectId);
    const { data: task, isLoading } = useTask(projectId, taskId);
    const { mutate: updateTask, isPending: isUpdating } = useUpdateTask(projectId);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState('');
    const [priority, setPriority] = useState('');
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

    useEffect(() => {
        if (task) {
            setTitle(task.title || '');
            setDescription(task.description || '');
            setStatus(task.status || 'Todo');
            setPriority(task.priority || 'Medium');
        }
    }, [task]);

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        updateTask({
            id: taskId,
            title,
            description,
            status,
            priority
        }, {
            onSuccess: () => {
                toast('Task updated successfully!', 'success');
            },
            onError: () => {
                toast('Failed to update task', 'error');
            }
        });
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading task details...</div>;
    if (!task) return <div className="p-8 text-center text-red-500">Task not found.</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4">
            <header className="flex items-center justify-between">
                <div>
                    <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                        <a href="/dashboard/projects" className="hover:text-blue-600">Projects</a>
                        <span>/</span>
                        <a href={`/dashboard/projects/${projectId}`} className="hover:text-blue-600">{project?.name || 'Project'}</a>
                        <span>/</span>
                        <span className="text-gray-900 font-medium">Task Details</span>
                    </nav>
                    <h1 className="text-3xl font-bold text-gray-900">{task.title}</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsInviteDialogOpen(true)}
                        className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 border shadow-sm transition-all flex items-center gap-2"
                    >
                        <Users className="h-4 w-4" />
                        Invite to Task
                    </button>
                    <button
                        onClick={() => router.back()}
                        className="text-sm font-medium text-gray-500 hover:text-gray-700"
                    >
                        &larr; Back
                    </button>
                </div>
            </header>

            <UserSearchDialog
                isOpen={isInviteDialogOpen}
                onClose={() => setIsInviteDialogOpen(false)}
                targetType="Task"
                targetId={taskId}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Edit Form */}
                <div className="lg:col-span-2 space-y-6">
                    <form onSubmit={handleUpdate} className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Title</label>
                            <input
                                type="text"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Description</label>
                            <textarea
                                rows={6}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={isUpdating}
                                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                            >
                                {isUpdating ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Sidebar Attributes */}
                <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6 space-y-4">
                        <h3 className="font-bold text-gray-900 border-b pb-2">Attributes</h3>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-xs border px-2 py-1"
                            >
                                <option value="Todo">Todo</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Done">Done</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Priority</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-xs border px-2 py-1"
                            >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                            </select>
                        </div>

                        <div className="pt-4 text-xs text-gray-400">
                            <p>Created: {new Date(task.createdAt).toLocaleDateString()}</p>
                            <p>Last Updated: {new Date(task.updatedAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
