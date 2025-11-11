'use client';

import { useState } from 'react';
import { Users, UserCheck, TrendingUp } from 'lucide-react';
import PlatformUsersTab from './PlatformUsersTab';

interface User {
  user_id: string;
  name: string;
  email: string;
  role: string;
  current_stage: string;
  created_at: string;
  last_active_at?: string;
}

interface PeopleAdoptionTabProps {
  orgId: string;
  users: any[];
  onAddUser: () => void;
  onEditUser: (user: any) => void;
  onDeleteUser: (userId: string) => void;
}

export default function PeopleAdoptionTab({
  orgId,
  users,
  onAddUser,
  onEditUser,
  onDeleteUser,
}: PeopleAdoptionTabProps) {
  const [activeSection, setActiveSection] = useState<'stakeholders' | 'platform'>('stakeholders');

  return (
    <div className="space-y-6">
      {/* Section Toggle */}
      <div className="flex items-center gap-3 p-1 bg-white/60 backdrop-blur-xl border border-gray-200 rounded-xl inline-flex">
        <button
          onClick={() => setActiveSection('stakeholders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeSection === 'stakeholders'
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-white/80'
          }`}
        >
          <Users className="w-4 h-4" />
          Trial Stakeholders
        </button>
        <button
          onClick={() => setActiveSection('platform')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeSection === 'platform'
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-white/80'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Platform Users
        </button>
      </div>

      {/* Content */}
      {activeSection === 'stakeholders' ? (
        <UsersSection
          users={users}
          onAddUser={onAddUser}
          onEditUser={onEditUser}
          onDeleteUser={onDeleteUser}
        />
      ) : (
        <PlatformUsersTab orgId={orgId} />
      )}
    </div>
  );
}

// Internal Users Section Component
function UsersSection({
  users,
  onAddUser,
  onEditUser,
  onDeleteUser,
}: {
  users: any[];
  onAddUser: () => void;
  onEditUser: (user: any) => void;
  onDeleteUser: (userId: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Trial Stakeholders</h3>
          <p className="text-sm text-gray-600 mt-1">Internal contacts and decision makers</p>
        </div>
        <button
          onClick={onAddUser}
          className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </button>
      </div>

      {/* Users Grid */}
      {users.length === 0 ? (
        <div className="bg-white/50 rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No users yet</p>
          <p className="text-sm text-gray-500 mt-1">Add trial stakeholders to start tracking</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <div
              key={user.user_id}
              className="bg-white/80 rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                  {user.name
                    ?.split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase() || 'U'}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => onEditUser(user)}
                    className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                    title="Edit user"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete ${user.name}?`)) {
                        onDeleteUser(user.user_id);
                      }
                    }}
                    className="p-1.5 hover:bg-red-50 rounded transition-colors"
                    title="Delete user"
                  >
                    <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <h4 className="font-semibold text-gray-900 mb-1">{user.name}</h4>
              <p className="text-sm text-gray-600 mb-2">{user.email}</p>

              {user.role && (
                <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                  {user.role}
                </span>
              )}

              {user.current_stage && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-500">Stage: {user.current_stage}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
