'use client';

import { useState } from 'react';
import { useProjects, useCreateProject, useDeleteProject } from '@/hooks/use-projects';
import { toast } from '@/hooks/use-toast';
import { confirmPremium } from '@/hooks/use-confirm';

export default function ProjectsPage() {
    const { data: projects, isLoading } = useProjects();
    const { mutate: createProject, isPending: isCreating } = useCreateProject();
    const { mutate: deleteProject } = useDeleteProject();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createProject({ name, description }, {
            onSuccess: () => {
                setName('');
                setDescription('');
                setIsModalOpen(false);
                toast('Project created successfully!');
            },
            onError: (err: any) => {
                toast(err.response?.data?.message || 'Failed to create project', 'error');
            }
        });
    };

    const handleDelete = async (id: string, name: string) => {
        const ok = await confirmPremium('Delete Project', `Are you sure you want to delete "${name}"? All associated tasks will be permanently removed.`);
        if (ok) {
            deleteProject(id, {
                onSuccess: () => toast('Project deleted: ' + name, 'info'),
                onError: () => toast('Failed to delete project', 'error')
            });
        }
    };

    if (isLoading) return <div>Loading projects...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                >
                    New Project
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {projects?.map((project: any) => (
                    <div key={project._id} className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">{project.name}</h3>
                            <button
                                onClick={() => handleDelete(project._id, project.name)}
                                className="text-xs text-red-600 hover:text-red-800"
                            >
                                Delete
                            </button>
                        </div>
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{project.description || 'No description'}</p>
                        <div className="mt-4 flex items-center justify-between">
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                {project.status || 'Active'}
                            </span>
                            <a href={`/dashboard/projects/${project._id}`} className="text-sm font-medium text-blue-600 hover:text-blue-500">
                                View Tasks &rarr;
                            </a>
                        </div>
                    </div>
                ))}
                {projects?.length === 0 && (
                    <div className="col-span-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                        <p className="text-gray-500">No projects found. Create your first project to get started!</p>
                    </div>
                )}
            </div>

            {/* New Project Modal (Simplified) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                        <h2 className="text-xl font-bold mb-4">Create New Project</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                                >
                                    {isCreating ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
