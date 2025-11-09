import React from 'react';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  type?: 'user' | 'org';
  stage?: 'invited' | 'low_activity' | 'active' | 'power_user' | 'dormant';
  className?: string;
}

const STAGE_COLORS = {
  invited: 'from-gray-400 to-gray-600',
  low_activity: 'from-blue-400 to-blue-600',
  active: 'from-green-400 to-green-600',
  power_user: 'from-purple-400 to-purple-600',
  dormant: 'from-gray-400 to-gray-600',
};

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

function getInitials(name: string): string {
  if (!name) return '?';

  const words = name.trim().split(' ');
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function stringToColor(str: string): string {
  // Generate consistent color from string
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colors = [
    'from-blue-400 to-blue-600',
    'from-purple-400 to-purple-600',
    'from-pink-400 to-pink-600',
    'from-indigo-400 to-indigo-600',
    'from-cyan-400 to-cyan-600',
    'from-teal-400 to-teal-600',
    'from-emerald-400 to-emerald-600',
    'from-amber-400 to-amber-600',
    'from-orange-400 to-orange-600',
    'from-rose-400 to-rose-600',
  ];

  return colors[Math.abs(hash) % colors.length];
}

export default function Avatar({ name, size = 'md', type = 'user', stage, className = '' }: AvatarProps) {
  const initials = getInitials(name);

  // Determine gradient color
  const gradientClass = stage && type === 'user'
    ? STAGE_COLORS[stage]
    : stringToColor(name);

  return (
    <div
      className={`
        relative flex items-center justify-center rounded-full
        bg-gradient-to-br ${gradientClass}
        text-white font-semibold
        shadow-lg shadow-black/20
        ring-2 ring-white/20
        transition-all duration-300 hover:scale-110 hover:shadow-xl
        ${SIZE_CLASSES[size]}
        ${className}
      `}
      title={name}
    >
      <span className="relative z-10">{initials}</span>

      {/* Glassmorphism shine effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />

      {/* Active pulse for active users */}
      {stage === 'active' && (
        <div className="absolute -top-0.5 -right-0.5 w-3 h-3">
          <div className="w-full h-full bg-green-400 rounded-full animate-pulse" />
          <div className="absolute inset-0 w-full h-full bg-green-400 rounded-full animate-ping opacity-75" />
        </div>
      )}

      {/* Power user pulse with purple color */}
      {stage === 'power_user' && (
        <div className="absolute -top-0.5 -right-0.5 w-3 h-3">
          <div className="w-full h-full bg-purple-400 rounded-full animate-pulse" />
          <div className="absolute inset-0 w-full h-full bg-purple-400 rounded-full animate-ping opacity-75" />
        </div>
      )}
    </div>
  );
}

// Avatar Group Component for showing multiple avatars
interface AvatarGroupProps {
  avatars: Array<{ name: string; stage?: 'invited' | 'low_activity' | 'active' | 'power_user' | 'dormant' }>;
  max?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function AvatarGroup({ avatars, max = 5, size = 'md' }: AvatarGroupProps) {
  const displayed = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className="flex -space-x-2">
      {displayed.map((avatar, idx) => (
        <div key={idx} className="relative z-10" style={{ zIndex: 50 - idx }}>
          <Avatar name={avatar.name} size={size} stage={avatar.stage} />
        </div>
      ))}

      {remaining > 0 && (
        <div
          className={`
            relative flex items-center justify-center rounded-full
            bg-gradient-to-br from-gray-300 to-gray-500
            text-gray-700 font-semibold text-xs
            shadow-lg ring-2 ring-white/20
            ${SIZE_CLASSES[size]}
          `}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
