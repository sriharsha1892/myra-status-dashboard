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
      const { data, error } = await supabase
        .from('user_todos')
        .select(`
          *,
          trial_organizations(org_name)
        `)
        .eq('user_id', userId)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyTodos(data || []);
    } catch (error: any) {
      console.error('Error fetching my todos:', error);
    }
  };

  const fetchMentionedTodos = async () => {
    try {
      // Get todos where current user is mentioned
      const { data: mentions, error: mentionsError } = await supabase
        .from('todo_mentions')
        .select('todo_id, is_read')
        .eq('mentioned_user_id', userId);

      if (mentionsError) throw mentionsError;

      if (!mentions || mentions.length === 0) {
        setMentionedTodos([]);
        return;
      }

      const todoIds = mentions.map(m => m.todo_id);

      const { data: todos, error: todosError } = await supabase
        .from('user_todos')
        .select(`
          *,
          trial_organizations(org_name)
        `)
        .in('todo_id', todoIds)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (todosError) throw todosError;

      // Add is_mentioned flag and is_read status
      const todosWithMentions = (todos || []).map(todo => ({
        ...todo,
        is_mentioned: true,
        is_read: mentions.find(m => m.todo_id === todo.todo_id)?.is_read || false,
      }));

      setMentionedTodos(todosWithMentions as any);
    } catch (error: any) {
      console.error('Error fetching mentioned todos:', error);
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

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const position = e.target.selectionStart || 0;

    setNewTodo({ ...newTodo, title: value });
    setCursorPosition(position);

    // Check if user is typing @ mention
    const beforeCursor = value.slice(0, position);
    const lastAtIndex = beforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const afterAt = beforeCursor.slice(lastAtIndex + 1);
      if (!afterAt.includes(' ')) {
        setMentionSearchQuery(afterAt.toLowerCase());
        setShowMentionDropdown(true);
      } else {
        setShowMentionDropdown(false);
      }
    } else {
      setShowMentionDropdown(false);
    }
  };

  const insertMention = (username: string) => {
    const title = newTodo.title;
    const beforeCursor = title.slice(0, cursorPosition);
    const afterCursor = title.slice(cursorPosition);
    const lastAtIndex = beforeCursor.lastIndexOf('@');

    const newTitle =
      title.slice(0, lastAtIndex) +
      `@${username} ` +
      afterCursor;

    setNewTodo({ ...newTodo, title: newTitle });
    setShowMentionDropdown(false);
    titleInputRef.current?.focus();
  };

  const handleAddTodo = async () => {
    if (!newTodo.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      // Create the todo
      const { data: todoData, error: todoError } = await supabase
        .from('user_todos')
        .insert({
          user_id: userId,
          ...newTodo,
          related_org_id: newTodo.related_org_id || null,
          due_date: newTodo.due_date || null,
        })
        .select()
        .single();

      if (todoError) throw todoError;

      // Extract mentions and create mention records
      const mentions = extractMentions(newTodo.title);
      if (mentions.length > 0 && todoData) {
        const mentionedUserIds = teamMembers
          .filter(member => mentions.includes(member.username))
          .map(member => member.user_id);

        if (mentionedUserIds.length > 0) {
          const mentionRecords = mentionedUserIds.map(mentionedUserId => ({
            todo_id: todoData.todo_id,
            mentioned_user_id: mentionedUserId,
            mentioned_by_user_id: userId,
          }));

          const { error: mentionError } = await supabase
            .from('todo_mentions')
            .insert(mentionRecords);

          if (mentionError) {
            console.error('Error creating mentions:', mentionError);
          }
        }
      }

      toast.success('Todo added');
      setNewTodo({ title: '', todo_type: 'task', priority: 'normal', due_date: '', related_org_id: '' });
      setShowAddForm(false);
      fetchAllData();
    } catch (error: any) {
      console.error('Error adding todo:', error);
      toast.error('Failed to add todo');
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
      case 'follow_up': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'feedback': return 'bg-green-50 text-green-700 border-green-200';
      case 'meeting': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'normal': return 'text-blue-600';
      default: return 'text-slate-600';
    }
  };

  const filteredMembers = teamMembers.filter(member =>
    member.username.includes(mentionSearchQuery) ||
    member.full_name.toLowerCase().includes(mentionSearchQuery)
  );

  const currentTodos = activeTab === 'my' ? myTodos : mentionedTodos;
  const activeTodos = currentTodos.filter(t => t.status !== 'completed');
  const completedTodos = currentTodos.filter(t => t.status === 'completed');
  const unreadMentionCount = mentionedTodos.filter((t: any) => !t.is_read && t.status !== 'completed').length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'my'
                ? 'bg-blue-100 text-blue-700'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Todos
          </button>
          <button
            onClick={() => setActiveTab('mentioned')}
            className={`relative px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'mentioned'
                ? 'bg-purple-100 text-purple-700'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <AtSign className="w-3 h-3" />
              <span>Mentioned</span>
              {unreadMentionCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-purple-600 text-white text-[10px] font-bold rounded-full">
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
        <div className="mb-4 p-3 bg-slate-50 rounded-lg space-y-2">
          <div className="relative">
            <input
              ref={titleInputRef}
              type="text"
              value={newTodo.title}
              onChange={handleTitleChange}
              placeholder="What needs to be done? (use @username to mention)"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Mention Autocomplete Dropdown */}
            {showMentionDropdown && filteredMembers.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {filteredMembers.slice(0, 5).map((member) => (
                  <button
                    key={member.user_id}
                    onClick={() => insertMention(member.username)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Users className="w-3 h-3 text-slate-400" />
                    <div>
                      <div className="font-medium text-slate-900">@{member.username}</div>
                      <div className="text-xs text-slate-500">{member.full_name}</div>
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
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={newTodo.due_date}
              onChange={(e) => setNewTodo({ ...newTodo, due_date: e.target.value })}
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={newTodo.related_org_id}
              onChange={(e) => setNewTodo({ ...newTodo, related_org_id: e.target.value })}
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No org</option>
              {organizations.map(org => (
                <option key={org.org_id} value={org.org_id}>{org.org_name}</option>
              ))}
            </select>
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
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
          </div>
        ) : activeTodos.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-slate-500">
              {activeTab === 'my' ? 'No active todos' : 'No mentions yet'}
            </p>
          </div>
        ) : (
          activeTodos.map(todo => (
            <div
              key={todo.todo_id}
              className={`flex items-start gap-2 p-2 rounded-lg group ${
                activeTab === 'mentioned' && !(todo as any).is_read
                  ? 'bg-purple-50 hover:bg-purple-100 border border-purple-200'
                  : 'hover:bg-slate-50'
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
                <Circle className="w-4 h-4 text-slate-400 hover:text-blue-600" strokeWidth={2} />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-xs font-medium text-slate-900">{todo.title}</p>
                  <span className={`px-1.5 py-0.5 text-[10px] font-medium border rounded ${getTypeColor(todo.todo_type)}`}>
                    {todo.todo_type.replace('_', ' ')}
                  </span>
                  {activeTab === 'mentioned' && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium border rounded bg-purple-50 text-purple-700 border-purple-200">
                      mentioned
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
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
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-all"
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
        <div className="mt-4 pt-4 border-t border-slate-200">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 font-medium"
          >
            {showCompleted ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <span>Completed ({completedTodos.length})</span>
          </button>

          {showCompleted && (
            <div className="mt-2 space-y-2">
              {completedTodos.map(todo => (
                <div
                  key={todo.todo_id}
                  className="flex items-start gap-2 p-2 hover:bg-slate-50 rounded-lg group opacity-60"
                >
                  <button
                    onClick={() => toggleTodoStatus(todo.todo_id, todo.status)}
                    className="mt-0.5 flex-shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-600" strokeWidth={2} />
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900 line-through">{todo.title}</p>
                  </div>

                  {activeTab === 'my' && (
                    <button
                      onClick={() => deleteTodo(todo.todo_id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-all"
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
