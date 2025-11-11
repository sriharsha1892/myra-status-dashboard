'use client';

import { useState } from 'react';
import { Users, UserCheck, Activity } from 'lucide-react';
import PlatformUsersTab from './PlatformUsersTab';
import UpdatesTab from './UpdatesTab';

interface PeopleEngagementTabProps {
  orgId: string;
  users: any[];
  onAddUser: () => void;
  onEditUser: (user: any) => void;
  onDeleteUser: (userId: string) => void;
}

export default function PeopleEngagementTab({
  orgId,
  users,
  onAddUser,
  onEditUser,
  onDeleteUser,
}: PeopleEngagementTabProps) {
  const [activeSection, setActiveSection] = useState<'stakeholders' | 'platform' | 'activity'>('stakeholders');

  return (
    <div className="space-y-6">
      {/* Section Toggle - 3 sections */}
      <div className="flex items-center gap-2 p-1 bg-white/60 backdrop-blur-xl border border-gray-200 rounded-xl inline-flex">
        <button
          onClick={() => setActiveSection('stakeholders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeSection === 'stakeholders'
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-white/80'
          }`}
        >
          <Users className="w-4 h-4" />
          Stakeholders
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
        <button
          onClick={() => setActiveSection('activity')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeSection === 'activity'
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg'
              : 'text-gray-600 hover:bg-white/80'
          }`}
        >
          <Activity className="w-4 h-4" />
          User Activity
        </button>
      </div>

      {/* Content */}
      {activeSection === 'stakeholders' && (
        <UsersSection
          users={users}
          onAddUser={onAddUser}
          onEditUser={onEditUser}
          onDeleteUser={onDeleteUser}
        />
      )}

      {activeSection === 'platform' && (
        <PlatformUsersTab orgId={orgId} />
      )}

      {activeSection === 'activity' && (
        <UpdatesTab orgId={orgId} />
      )}
    </div>
  );
}

// Internal Users Section Component (Stakeholders)
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
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Contact
        </button>
      </div>

      {/* Users Grid */}
      {users.length === 0 ? (
        <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No stakeholders yet</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Add internal contacts and decision makers to track relationships
          </p>
          <button
            onClick={onAddUser}
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent-500 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add First Contact
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <div
              key={user.user_id}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{user.name}</h4>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  user.role === 'Decision Maker' ? 'bg-accent-100 text-purple-800' :
                  user.role === 'Influencer' ? 'bg-blue-100 text-blue-800' :
                  user.role === 'Champion' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {user.role || 'Contact'}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  user.current_stage === 'Engaged' ? 'bg-green-100 text-green-800' :
                  user.current_stage === 'Interested' ? 'bg-blue-100 text-blue-800' :
                  user.current_stage === 'Cold' ? 'bg-gray-100 text-gray-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {user.current_stage || 'Unknown'}
                </span>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEditUser(user)}
                  className="flex-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDeleteUser(user.user_id)}
                  className="flex-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
