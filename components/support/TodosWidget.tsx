'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import {
  CheckCircle2, Circle, Plus, X, Calendar, Building2,
  Flag, ChevronDown, ChevronRight, Loader2
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
  trial_organizations?: { org_name: string };
}

interface TodosWidgetProps {
  userId?: string;
}

export default function TodosWidget({ userId }: TodosWidgetProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
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
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchTodos();
    fetchOrganizations();
  }, [userId]);

  const fetchTodos = async () => {
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
      setTodos(data || []);
    } catch (error: any) {
      console.error('Error fetching todos:', error);
    } finally {
      setLoading(false);
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

  const handleAddTodo = async () => {
    if (!newTodo.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_todos')
        .insert({
          user_id: userId,
          ...newTodo,
          related_org_id: newTodo.related_org_id || null,
          due_date: newTodo.due_date || null,
        });

      if (error) throw error;

      toast.success('Todo added');
      setNewTodo({ title: '', todo_type: 'task', priority: 'normal', due_date: '', related_org_id: '' });
      setShowAddForm(false);
      fetchTodos();
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

      fetchTodos();
    } catch (error: any) {
      console.error('Error toggling todo:', error);
      toast.error('Failed to update todo');
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
      fetchTodos();
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

  const activeTodos = todos.filter(t => t.status !== 'completed');
  const completedTodos = todos.filter(t => t.status === 'completed');

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900">My Todos</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg space-y-2">
          <input
            type="text"
            value={newTodo.title}
            onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
            placeholder="What needs to be done?"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

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

      {/* Active Todos */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
          </div>
        ) : activeTodos.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-slate-500">No active todos</p>
          </div>
        ) : (
          activeTodos.map(todo => (
            <div
              key={todo.todo_id}
              className="flex items-start gap-2 p-2 hover:bg-slate-50 rounded-lg group"
            >
              <button
                onClick={() => toggleTodoStatus(todo.todo_id, todo.status)}
                className="mt-0.5 flex-shrink-0"
              >
                <Circle className="w-4 h-4 text-slate-400 hover:text-blue-600" strokeWidth={2} />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-medium text-slate-900">{todo.title}</p>
                  <span className={`px-1.5 py-0.5 text-[10px] font-medium border rounded ${getTypeColor(todo.todo_type)}`}>
                    {todo.todo_type.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-slate-500">
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

              <button
                onClick={() => deleteTodo(todo.todo_id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
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

                  <button
                    onClick={() => deleteTodo(todo.todo_id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
