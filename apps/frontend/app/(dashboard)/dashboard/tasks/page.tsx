'use client';

import { useAllTasks } from '@/hooks/use-tasks';
import Link from 'next/link';

export default function AllTasksPage() {
    const { data: tasks, isLoading } = useAllTasks();

    if (isLoading) return <div className="p-8">Loading all tasks...</div>;

    return (
        <div className="space-y-6 p-4">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">All Tasks</h1>
                <span className="text-sm text-gray-500">{tasks?.length || 0} tasks found</span>
            </div>

            <div className="overflow-hidden bg-white shadow ring-1 ring-gray-900/5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Title</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Project</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Priority</th>
                            <th className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right">
                                <span className="sr-only">View</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {tasks?.map((task: any) => (
                            <tr key={task._id}>
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                    {task.title}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                    {task.project?.name || 'Unknown'}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${(task.status?.toLowerCase() === 'done' || task.status?.toLowerCase() === 'completed') ? 'bg-green-100 text-green-800' :
                                        (task.status?.toLowerCase() === 'in progress' || task.status?.toLowerCase() === 'in-progress') ? 'bg-blue-100 text-blue-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {task.status}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${task.priority === 'High' ? 'bg-red-100 text-red-800' :
                                        task.priority === 'Medium' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {task.priority || 'Low'}
                                    </span>
                                </td>
                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                    <Link href={`/dashboard/projects/${task.project?._id}/tasks/${task._id}`} className="text-blue-600 hover:text-blue-900">
                                        Edit
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {(!tasks || tasks.length === 0) && (
                            <tr>
                                <td colSpan={5} className="py-10 text-center text-gray-500">
                                    No tasks found across your projects.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
