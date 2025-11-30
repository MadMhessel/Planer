
import React from 'react';
import { Task, Project, User, TaskStatus } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { AlertCircle, CheckCircle2, Clock, Users } from 'lucide-react';

interface DashboardProps {
  tasks: Task[];
  projects: Project[];
  users: User[];
}

export const Dashboard: React.FC<DashboardProps> = ({ tasks, projects, users }) => {
  // Stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === TaskStatus.DONE).length;
  const overdueTasks = tasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== TaskStatus.DONE).length;
  
  // Chart Data
  const statusData = [
    { name: 'К выполнению', value: tasks.filter(t => t.status === TaskStatus.TODO).length, color: '#9ca3af' },
    { name: 'В работе', value: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length, color: '#3b82f6' },
    { name: 'На проверке', value: tasks.filter(t => t.status === TaskStatus.REVIEW).length, color: '#a855f7' },
    { name: 'Готово', value: tasks.filter(t => t.status === TaskStatus.DONE).length, color: '#22c55e' },
  ].filter(d => d.value > 0);

  const projectData = projects.map(p => ({
    name: p.name,
    tasks: tasks.filter(t => t.projectId === p.id).length
  }));

  const StatCard = ({ title, value, icon: Icon, colorClass, bgClass }: any) => (
      <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700/50 flex justify-between items-center hover:shadow-xl transition-all hover:-translate-y-1">
          <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">{title}</p>
              <h3 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">{value}</h3>
          </div>
          <div className={`p-4 rounded-xl ${bgClass} ${colorClass} shadow-md`}>
              <Icon size={28} />
          </div>
      </div>
  );

  return (
    <div className="space-y-6 pb-20">
       {/* Stats Grid */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard 
            title="Всего задач" 
            value={totalTasks} 
            icon={Clock} 
            colorClass="text-blue-600" 
            bgClass="bg-blue-50 dark:bg-blue-900/20" 
          />
          <StatCard 
            title="Завершено" 
            value={completedTasks} 
            icon={CheckCircle2} 
            colorClass="text-green-600" 
            bgClass="bg-green-50 dark:bg-green-900/20" 
          />
          <StatCard 
            title="Просрочено" 
            value={overdueTasks} 
            icon={AlertCircle} 
            colorClass="text-red-600" 
            bgClass="bg-red-50 dark:bg-red-900/20" 
          />
          <StatCard 
            title="Участники" 
            value={users.length} 
            icon={Users} 
            colorClass="text-purple-600" 
            bgClass="bg-purple-50 dark:bg-purple-900/20" 
          />
       </div>

       {/* Charts Grid */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700/50 flex flex-col h-[400px] md:h-[350px]">
             <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Статус задач</h4>
             <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {statusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
             </div>
             {/* Custom Legend */}
             <div className="flex flex-wrap justify-center gap-3 mt-4">
                {statusData.map((s, i) => (
                    <div key={i} className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                        <div className="w-2.5 h-2.5 rounded-full mr-1.5" style={{ background: s.color }} />
                        {s.name} ({s.value})
                    </div>
                ))}
             </div>
          </div>

          <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700/50 flex flex-col h-[400px] md:h-[350px]">
              <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Задачи по проектам</h4>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} tickMargin={10} stroke="#9ca3af" />
                        <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="#9ca3af" />
                        <Tooltip cursor={{fill: 'rgba(243, 244, 246, 0.5)'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="tasks" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
              </div>
          </div>
       </div>
    </div>
  );
};
