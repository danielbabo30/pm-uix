'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import UserManager from '@/components/users/UserManager';
import HolidaysManager from '@/components/holidays/HolidaysManager';
import ProjectsManager from '@/components/projects/ProjectsManager';

const TABS = [
  { key: 'users',    label: 'משתמשים' },
  { key: 'holidays', label: 'חופשות'  },
  { key: 'projects', label: 'פרויקטים' },
] as const;

type Tab = typeof TABS[number]['key'];

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('users');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <span className="text-lg font-bold text-gray-800">הגדרות</span>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 border-b flex-shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'text-blue-600 border-blue-600 bg-blue-50'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 py-6">
          {activeTab === 'users'    && <UserManager />}
          {activeTab === 'holidays' && <HolidaysManager />}
          {activeTab === 'projects' && <ProjectsManager />}
        </div>
      </div>
    </div>
  );
}
