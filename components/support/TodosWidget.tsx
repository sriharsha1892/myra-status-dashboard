'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import {
  CheckCircle2, Circle, Plus, X, Calendar, Building2,
  Flag, ChevronDown, ChevronRight, Loader2, AtSign, Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import { handleError } from '@/lib/utils/errorHandler';

interface Todo {
  todo_id: string;
  title: string;
  description?: string;
  todo_type: 'demo' | 'follow_up' | 'feedback' | 'task' | 'meeting';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  related_org_id?: string;
  due_date?: string;
  created_at: string;
  user_id: string;
  trial_organizations?: { org_name: string };
  mention_count?: number;
  is_mentioned?: boolean;
}

interface TeamMember {
  user_id: string;
  email: string;
  full_name: string;
  username: string;
}

interface TodosWidgetProps {
  userId?: string;
}

export default function TodosWidget({ userId }: TodosWidgetProps) {
  const [myTodos, setMyTodos] = useState<Todo[]>([]);
  const [mentionedTodos, setMentionedTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my' | 'mentioned'>('my');
  const [showCompleted, setShowCompleted] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTodo, setNewTodo] = useState({
    title: '',
    todo_type: 'task' as const,
    priority: 'normal' as const,
    due_date: '',
    related_org_id: '',
  });
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [mentionType, setMentionType] = useState<'user' | 'org'>('user');
  const [cursorPosition, setCursorPosition] = useState(0);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (userId) {
      fetchAllData();
    }
  }, [userId]);

  const fetchAllData = async () => {
    await Promise.all([
      fetchMyTodos(),
      fetchMentionedTodos(),
      fetchOrganizations(),
      fetchTeamMembers(),
    ]);
    setLoading(false);
  };

  const fetchMyTodos = async () => {
    try {
      const response = await fetch('/api/todos?type=my');
      const data = await response.json();

      if (!response.ok) {
        console.error('Error fetching my todos:', data.error);
        setMyTodos([]);
        return;
      }

      setMyTodos(data.todos || []);
    } catch (error: any) {
      console.error('Error fetching my todos:', error?.message || error);
      setMyTodos([]);
    }
  };

  const fetchMentionedTodos = async () => {
    try {
      const response = await fetch('/api/todos?type=mentioned');
      const data = await response.json();

      if (!response.ok) {
        console.error('Error fetching mentioned todos:', data.error);
        setMentionedTodos([]);
        return;
      }

      setMentionedTodos(data.todos || []);
    } catch (error: any) {
      console.error('Error fetching mentioned todos:', error?.message || error);
      setMentionedTodos([]);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('trial_organizations')
        .select('org_id, org_name')
        .order('org_name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch('/api/account-managers');
      const data = await response.json();

      if (data.managers) {
        const members = data.managers.map((m: any) => ({
          user_id: m.user_id,
          email: m.email,
          full_name: m.full_name,
          username: m.email.split('@')[0].toLowerCase(),
        }));
        setTeamMembers(members);
      }
    } catch (error: any) {
      console.error('Error fetching team members:', error);
    }
  };

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const matches = text.match(mentionRegex);
    return matches ? matches.map(m => m.slice(1).toLowerCase()) : [];
  };

  const extractOrgMentions = (text: string): string[] => {
    const orgRegex = /#([\w-]+)/g;
    const matches = text.match(orgRegex);
    return matches ? matches.map(m => m.slice(1).toLowerCase()) : [];
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const position = e.target.selectionStart || 0;

    setNewTodo({ ...newTodo, title: value });
    setCursorPosition(position);

    // Check if user is typing @ mention or # org
    const beforeCursor = value.slice(0, position);
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    const lastHashIndex = beforeCursor.lastIndexOf('#');

    // Determine which symbol is closer to cursor
    if (lastAtIndex > lastHashIndex && lastAtIndex !== -1) {
      // @ mention for users
      const afterAt = beforeCursor.slice(lastAtIndex + 1);
      if (!afterAt.includes(' ') && !afterAt.includes('#')) {
        setMentionSearchQuery(afterAt.toLowerCase());
        setMentionType('user');
        setShowMentionDropdown(true);
      } else {
        setShowMentionDropdown(false);
      }
    } else if (lastHashIndex > lastAtIndex && lastHashIndex !== -1) {
      // # mention for orgs
      const afterHash = beforeCursor.slice(lastHashIndex + 1);
      if (!afterHash.includes(' ') && !afterHash.includes('@')) {
        setMentionSearchQuery(afterHash.toLowerCase());
        setMentionType('org');
        setShowMentionDropdown(true);
      } else {
        setShowMentionDropdown(false);
      }
    } else {
      setShowMentionDropdown(false);
    }
  };

  const insertMention = (name: string) => {
    const title = newTodo.title;
    const beforeCursor = title.slice(0, cursorPosition);
    const afterCursor = title.slice(cursorPosition);

    if (mentionType === 'user') {
      const lastAtIndex = beforeCursor.lastIndexOf('@');
      const newTitle =
        title.slice(0, lastAtIndex) +
        `@${name} ` +
        afterCursor;
      setNewTodo({ ...newTodo, title: newTitle });
    } else {
      const lastHashIndex = beforeCursor.lastIndexOf('#');
      const newTitle =
        title.slice(0, lastHashIndex) +
        `#${name} ` +
        afterCursor;
      setNewTodo({ ...newTodo, title: newTitle });
    }

    setShowMentionDropdown(false);
    titleInputRef.current?.focus();
  };

  const handleAddTodo = async () => {
    if (!newTodo.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      // Extract org mentions and find org_id
      let resolvedOrgId = newTodo.related_org_id;
      const orgMentions = extractOrgMentions(newTodo.title);

      if (orgMentions.length > 0 && !resolvedOrgId) {
        // Use the first org mention to set the related_org_id
        const orgMention = orgMentions[0];
        const matchedOrg = organizations.find(org =>
          org.org_name.toLowerCase().replace(/\s+/g, '-') === orgMention ||
          org.org_name.toLowerCase() === orgMention.replace(/-/g, ' ')
        );

        if (matchedOrg) {
          resolvedOrgId = matchedOrg.org_id;
        }
      }

      // Extract user mentions and get their IDs
      const mentions = extractMentions(newTodo.title);
      const mentionedUserIds = teamMembers
        .filter(member => mentions.includes(member.username))
        .map(member => member.user_id);

      // Create todo with mentions using the RPC function (handles permissions correctly)
      const { data: todoData, error: todoError } = await supabase.rpc('create_todo_with_mentions', {
        p_user_id: userId,
        p_title: newTodo.title,
        p_todo_type: newTodo.todo_type,
        p_priority: newTodo.priority,
        p_due_date: newTodo.due_date || null,
        p_related_org_id: resolvedOrgId || null,
        p_mentioned_user_ids: mentionedUserIds,
      });

      if (todoError) throw todoError;

      toast.success('Todo added');
      setNewTodo({ title: '', todo_type: 'task', priority: 'normal', due_date: '', related_org_id: '' });
      setShowAddForm(false);
      fetchAllData();
    } catch (error: any) {
      handleError(error, {
        context: 'adding todo',
        additionalContext: {
          todoTitle: newTodo.title,
          todoType: newTodo.todo_type,
          priority: newTodo.priority,
        }
      });
      toast.error(error.message || 'Failed to create todo. Please try again.');
    }
  };

  const toggleTodoStatus = async (todoId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';

    try {
      const { error } = await supabase
        .from('user_todos')
        .update({ status: newStatus })
        .eq('todo_id', todoId);

      if (error) throw error;

      fetchAllData();
    } catch (error: any) {
      console.error('Error toggling todo:', error);
      toast.error('Failed to update todo');
    }
  };

  const markMentionAsRead = async (todoId: string) => {
    try {
      await supabase
        .from('todo_mentions')
        .update({ is_read: true })
        .eq('todo_id', todoId)
        .eq('mentioned_user_id', userId);
    } catch (error: any) {
      console.error('Error marking mention as read:', error);
    }
  };

  const deleteTodo = async (todoId: string) => {
    try {
      const { error } = await supabase
        .from('user_todos')
        .delete()
        .eq('todo_id', todoId);

      if (error) throw error;

      toast.success('Todo deleted');
      fetchAllData();
    } catch (error: any) {
      console.error('Error deleting todo:', error);
      toast.error('Failed to delete todo');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'demo': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'follow_up': return 'bg-accent-50 text-accent-700 border-accent-200';
      case 'feedback': return 'bg-green-50 text-green-700 border-green-200';
      case 'meeting': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default: return 'bg-neutral-50 text-neutral-700 border-neutral-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'normal': return 'text-blue-600';
      default: return 'text-neutral-600';
    }
  };

  const filteredMembers = teamMembers.filter(member =>
    member.username.includes(mentionSearchQuery) ||
    member.full_name.toLowerCase().includes(mentionSearchQuery)
  );

  const filteredOrgs = organizations.filter(org =>
    org.org_name.toLowerCase().includes(mentionSearchQuery) ||
    org.org_name.toLowerCase().replace(/\s+/g, '-').includes(mentionSearchQuery)
  );

  const currentTodos = activeTab === 'my' ? myTodos : mentionedTodos;
  const activeTodos = currentTodos.filter(t => t.status !== 'completed');
  const completedTodos = currentTodos.filter(t => t.status === 'completed');
  const unreadMentionCount = mentionedTodos.filter((t: any) => !t.is_read && t.status !== 'completed').length;

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'my'
                ? 'bg-blue-100 text-blue-700'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            My Todos
          </button>
          <button
            onClick={() => setActiveTab('mentioned')}
            className={`relative px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'mentioned'
                ? 'bg-accent-100 text-accent-700'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <AtSign className="w-3 h-3" />
              <span>Mentioned</span>
              {unreadMentionCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-accent-600 text-white text-[10px] font-bold rounded-full">
                  {unreadMentionCount}
                </span>
              )}
            </div>
          </button>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && activeTab === 'my' && (
        <div className="mb-4 p-3 bg-neutral-50 rounded-lg space-y-2">
          <div className="relative">
            <input
              ref={titleInputRef}
              type="text"
              value={newTodo.title}
              onChange={handleTitleChange}
              placeholder="What needs to be done? (use @username or #org-name)"
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Mention Autocomplete Dropdown */}
            {showMentionDropdown && mentionType === 'user' && filteredMembers.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {filteredMembers.slice(0, 5).map((member) => (
                  <button
                    key={member.user_id}
                    onClick={() => insertMention(member.username)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 flex items-center gap-2"
                  >
                    <Users className="w-3 h-3 text-neutral-400" />
                    <div>
                      <div className="font-medium text-neutral-900">@{member.username}</div>
                      <div className="text-xs text-neutral-500">{member.full_name}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Org Mention Autocomplete Dropdown */}
            {showMentionDropdown && mentionType === 'org' && filteredOrgs.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {filteredOrgs.slice(0, 5).map((org) => (
                  <button
                    key={org.org_id}
                    onClick={() => insertMention(org.org_name.toLowerCase().replace(/\s+/g, '-'))}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 flex items-center gap-2"
                  >
                    <Building2 className="w-3 h-3 text-neutral-400" />
                    <div>
                      <div className="font-medium text-neutral-900">#{org.org_name.toLowerCase().replace(/\s+/g, '-')}</div>
                      <div className="text-xs text-neutral-500">{org.org_name}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={newTodo.todo_type}
              onChange={(e) => setNewTodo({ ...newTodo, todo_type: e.target.value as any })}
              className="px-3 py-2 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="task">Task</option>
              <option value="demo">Demo</option>
              <option value="follow_up">Follow-up</option>
              <option value="feedback">Feedback</option>
              <option value="meeting">Meeting</option>
            </select>

            <select
              value={newTodo.priority}
              onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value as any })}
              className="px-3 py-2 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <input
              type="date"
              value={newTodo.due_date}
              onChange={(e) => setNewTodo({ ...newTodo, due_date: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Due date (optional)"
            />
          </div>

          {/* Org selection via #mention in title */}
          <div className="text-xs text-neutral-500 italic">
            Tip: Use #org-name in the title to link to an organization
          </div>

          <button
            onClick={handleAddTodo}
            className="w-full px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Add Todo
          </button>
        </div>
      )}

      {/* Todos List */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
          </div>
        ) : activeTodos.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-neutral-500">
              {activeTab === 'my' ? 'No active todos' : 'No mentions yet'}
            </p>
          </div>
        ) : (
          activeTodos.map(todo => (
            <div
              key={todo.todo_id}
              className={`flex items-start gap-2 p-2 rounded-lg group ${
                activeTab === 'mentioned' && !(todo as any).is_read
                  ? 'bg-accent-50 hover:bg-accent-100 border border-accent-200'
                  : 'hover:bg-neutral-50'
              }`}
              onClick={() => {
                if (activeTab === 'mentioned' && !(todo as any).is_read) {
                  markMentionAsRead(todo.todo_id);
                }
              }}
            >
              <button
                onClick={() => toggleTodoStatus(todo.todo_id, todo.status)}
                className="mt-0.5 flex-shrink-0"
              >
                <Circle className="w-4 h-4 text-neutral-400 hover:text-blue-600" strokeWidth={2} />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-xs font-medium text-neutral-900">{todo.title}</p>
                  <span className={`px-1.5 py-0.5 text-[10px] font-medium border rounded ${getTypeColor(todo.todo_type)}`}>
                    {todo.todo_type.replace('_', ' ')}
                  </span>
                  {activeTab === 'mentioned' && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium border rounded bg-accent-50 text-accent-700 border-accent-200">
                      mentioned
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[10px] text-neutral-500 flex-wrap">
                  {todo.due_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{format(new Date(todo.due_date), 'MMM d')}</span>
                    </div>
                  )}
                  {todo.trial_organizations && (
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      <span>{todo.trial_organizations.org_name}</span>
                    </div>
                  )}
                  {todo.priority !== 'normal' && (
                    <div className="flex items-center gap-1">
                      <Flag className={`w-3 h-3 ${getPriorityColor(todo.priority)}`} />
                    </div>
                  )}
                </div>
              </div>

              {activeTab === 'my' && (
                <button
                  onClick={() => deleteTodo(todo.todo_id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-600 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Completed Todos Toggle */}
      {completedTodos.length > 0 && (
        <div className="mt-4 pt-4 border-t border-neutral-200">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-xs text-neutral-600 hover:text-neutral-900 font-medium"
          >
            {showCompleted ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <span>Completed ({completedTodos.length})</span>
          </button>

          {showCompleted && (
            <div className="mt-2 space-y-2">
              {completedTodos.map(todo => (
                <div
                  key={todo.todo_id}
                  className="flex items-start gap-2 p-2 hover:bg-neutral-50 rounded-lg group opacity-60"
                >
                  <button
                    onClick={() => toggleTodoStatus(todo.todo_id, todo.status)}
                    className="mt-0.5 flex-shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-600" strokeWidth={2} />
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-neutral-900 line-through">{todo.title}</p>
                  </div>

                  {activeTab === 'my' && (
                    <button
                      onClick={() => deleteTodo(todo.todo_id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-600 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
