'use client';

import { useParams, useRouter } from 'next/navigation';
import { useProject, useUpdateProject } from '@/hooks/use-projects';
import { useTasks, useUpdateTask, useCreateTask, useDeleteTask } from '@/hooks/use-tasks';
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { confirmPremium } from '@/hooks/use-confirm';
import { useMe } from '@/hooks/use-auth';
import { UserSearchDialog } from '@/components/user-search-dialog';
import { Users } from 'lucide-react';

const COLUMNS = ['Todo', 'In Progress', 'Done'];

export default function ProjectDetailsPage() {
    const { id } = useParams() as { id: string };
    const { data: user, isError } = useMe();
    const { data: project } = useProject(id);
    const { mutate: updateProject } = useUpdateProject();
    const { data: tasks, isLoading, error } = useTasks(id);
    const { mutate: updateTask } = useUpdateTask(id);

    const { mutate: createTask } = useCreateTask(id);
    const { mutate: deleteTask } = useDeleteTask(id);

    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState('Medium');
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

    // Project Editing State
    const [isEditingProject, setIsEditingProject] = useState(false);
    const [editProjectName, setEditProjectName] = useState('');
    const [editProjectDesc, setEditProjectDesc] = useState('');

    useEffect(() => {
        if (project) {
            setEditProjectName(project.name);
            setEditProjectDesc(project.description || '');
        }
    }, [project]);

    const handleUpdateProject = (e: React.FormEvent) => {
        e.preventDefault();
        updateProject({
            id,
            name: editProjectName,
            description: editProjectDesc
        }, {
            onSuccess: () => {
                setIsEditingProject(false);
                toast('Project updated successfully!');
            },
            onError: (err: any) => {
                toast(err.response?.data?.message || 'Failed to update project', 'error');
            }
        });
    };

    const handleCreateTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle) return;

        createTask({
            title: newTaskTitle,
            description: newTaskDesc,
            status: 'Todo',
            priority: newTaskPriority
        }, {
            onSuccess: () => {
                setNewTaskTitle('');
                setNewTaskDesc('');
                setNewTaskPriority('Medium');
                setIsAddingTask(false);
                toast('Task created!');
            },
            onError: (err: any) => {
                toast(err.response?.data?.message || 'Failed to create task', 'error');
            }
        });
    };

    const moveTask = (taskId: string, newStatus: string) => {
        updateTask({ id: taskId, status: newStatus }, {
            onSuccess: () => toast('Task moved to ' + newStatus)
        });
    };

    const handleDeleteTask = async (taskId: string, title: string) => {
        const ok = await confirmPremium('Delete Task', `Are you sure you want to delete the task "${title}"? This action cannot be undone.`);
        if (ok) {
            deleteTask(taskId, {
                onSuccess: () => toast('Task deleted successfully'),
                onError: () => toast('Failed to delete task', 'error')
            });
        }
    };

    if (isLoading) return <div className="p-8 text-center">Loading tasks...</div>;

    return (
        <div className="h-full flex flex-col space-y-6 p-4">
            <header className="flex items-start justify-between">
                {isEditingProject ? (
                    <form onSubmit={handleUpdateProject} className="flex-1 max-w-2xl space-y-3">
                        <input
                            type="text"
                            className="text-3xl font-bold text-gray-900 w-full border-b focus:outline-none focus:border-blue-500 bg-transparent"
                            value={editProjectName}
                            onChange={(e) => setEditProjectName(e.target.value)}
                            autoFocus
                        />
                        <textarea
                            className="text-gray-600 w-full border-b focus:outline-none focus:border-blue-500 bg-transparent resize-none"
                            value={editProjectDesc}
                            onChange={(e) => setEditProjectDesc(e.target.value)}
                            rows={2}
                        />
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-500 font-medium"
                            >
                                Save
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsEditingProject(false)}
                                className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded hover:bg-gray-200 font-medium"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="group relative">
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            {project?.name || 'Project'}
                            <button
                                onClick={() => setIsEditingProject(true)}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500 transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                        </h1>
                        <p className="text-gray-600">{project?.description || 'No description provided.'}</p>
                    </div>
                )}
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsInviteDialogOpen(true)}
                        className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 border shadow-sm transition-all flex items-center gap-2"
                    >
                        <Users className="h-4 w-4" />
                        Invite Member
                    </button>
                    <button
                        onClick={() => setIsAddingTask(true)}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 shadow-sm transition-all"
                    >
                        Add Task
                    </button>
                </div>
            </header>

            <UserSearchDialog
                isOpen={isInviteDialogOpen}
                onClose={() => setIsInviteDialogOpen(false)}
                targetType="Project"
                targetId={id}
            />

            <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
                {COLUMNS.map((column) => (
                    <div key={column} className="flex-shrink-0 w-80 flex flex-col space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{column}</h2>
                            <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                                {tasks?.filter((t: any) => {
                                    const status = (t.status || 'Todo').trim().toLowerCase();
                                    const col = column.trim().toLowerCase();
                                    if (col === 'done' && (status === 'completed' || status === 'done')) return true;
                                    if (col === 'in progress' && (status === 'in-progress' || status === 'in progress')) return true;
                                    if (col === 'todo' && status === 'todo') return true;
                                    return false; // Be explicit
                                }).length || 0}
                            </span>
                        </div>

                        <div className="flex-1 bg-gray-50 rounded-lg p-2 flex flex-col gap-4 min-h-[500px]">
                            {tasks?.filter((t: any) => {
                                const status = (t.status || 'Todo').trim().toLowerCase();
                                const col = column.trim().toLowerCase();
                                if (col === 'done' && (status === 'completed' || status === 'done')) return true;
                                if (col === 'in progress' && (status === 'in-progress' || status === 'in progress')) return true;
                                if (col === 'todo' && status === 'todo') return true;
                                return false;
                            }).map((task: any) => (
                                <div key={task._id} className="bg-white p-4 rounded-md shadow-sm ring-1 ring-gray-900/5 hover:ring-blue-500 transition-all cursor-pointer group">
                                    <div className="flex justify-between items-start">
                                        <a href={`/dashboard/projects/${id}/tasks/${task._id}`} className="block flex-1">
                                            <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{task.title}</h4>
                                        </a>
                                        <button onClick={() => handleDeleteTask(task._id, task.title)} className="text-gray-400 hover:text-red-500 p-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                    <a href={`/dashboard/projects/${id}/tasks/${task._id}`} className="block">
                                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{task.description}</p>
                                    </a>
                                    <div className="mt-4 flex items-center justify-between">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${task.priority === 'High' ? 'bg-red-100 text-red-700' :
                                            task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                                            }`}>
                                            {task.priority || 'Low'}
                                        </span>
                                        <select
                                            value={task.status}
                                            onChange={(e) => moveTask(task._id, e.target.value)}
                                            className="text-[10px] border-none bg-transparent text-gray-500 focus:ring-0 cursor-pointer"
                                        >
                                            {COLUMNS.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Task Modal */}
            {isAddingTask && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                        <h2 className="text-xl font-bold mb-4">Add New Task</h2>
                        <form onSubmit={handleCreateTask} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Title</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                    className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    value={newTaskDesc}
                                    onChange={(e) => setNewTaskDesc(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Priority</label>
                                <select
                                    className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    value={newTaskPriority}
                                    onChange={(e) => setNewTaskPriority(e.target.value)}
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsAddingTask(false)}
                                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
                                >
                                    Create Task
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
