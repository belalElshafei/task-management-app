'use client';

import { useMe } from '@/hooks/use-auth';
import { useProjects } from '@/hooks/use-projects';
import { useAllTasks } from '@/hooks/use-tasks';

export default function DashboardPage() {
    const { data: user, isLoading: userLoading } = useMe();
    const { data: projects, isLoading: projectsLoading } = useProjects();
    const { data: tasks, isLoading: tasksLoading } = useAllTasks();

    const stats = {
        totalProjects: projects?.length || 0,
        activeTasks: tasks?.filter((t: any) => {
            const status = t.status?.toLowerCase();
            return status !== 'done' && status !== 'completed';
        }).length || 0,
        completedTasks: tasks?.filter((t: any) => {
            const status = t.status?.toLowerCase();
            return status === 'done' || status === 'completed';
        }).length || 0,
    };

    if (userLoading || projectsLoading || tasksLoading) {
        return <div className="p-8 text-center text-gray-500">Loading your summary...</div>;
    }

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-gray-900">
                    Welcome back, {user?.name || 'User'}!
                </h1>
                <p className="mt-2 text-gray-600">Here is an overview of your projects and pending tasks.</p>
            </header>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {/* Stats Cards */}
                <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
                    <dt className="text-sm font-semibold leading-6 text-gray-600">Total Projects</dt>
                    <dd className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{stats.totalProjects}</dd>
                </div>
                <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
                    <dt className="text-sm font-semibold leading-6 text-gray-600">Active Tasks</dt>
                    <dd className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{stats.activeTasks}</dd>
                </div>
                <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
                    <dt className="text-sm font-semibold leading-6 text-gray-600">Completed Tasks</dt>
                    <dd className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{stats.completedTasks}</dd>
                </div>
            </div>

            <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-900/5">
                <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
                <div className="mt-6 border-t border-gray-100 pt-6">
                    {tasks?.length > 0 ? (
                        <ul className="divide-y divide-gray-100">
                            {tasks.slice(0, 5).map((task: any) => (
                                <li key={task._id} className="py-3 flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-900">{task.title}</span>
                                        <span className="text-xs text-gray-500">Project: {task.project?.name}</span>
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${(task.status?.toLowerCase() === 'done' || task.status?.toLowerCase() === 'completed')
                                        ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        {task.status}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-500">No recent activity to show. Create your first task!</p>
                    )}
                </div>
            </section>
        </div>
    );
}
