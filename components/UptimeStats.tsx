'use client';

interface UptimeStatsProps {
  thirtyDayUptime: number;
  incidentsThisMonth: number;
}

export default function UptimeStats({ thirtyDayUptime, incidentsThisMonth }: UptimeStatsProps) {
  return (
    <div className="rounded-xl border bg-white/[0.02] border-white/10 backdrop-blur-sm p-5">
      {/* Header */}
      <h3 className="text-sm font-semibold text-white/80 mb-4 uppercase tracking-wide">
        Historical Performance
      </h3>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* 30-day uptime */}
        <div className="text-center p-3 rounded-lg bg-white/[0.02] border border-white/5">
          <div className="text-2xl font-bold text-white/90">
            {thirtyDayUptime > 0 ? `${thirtyDayUptime}%` : '--'}
          </div>
          <div className="text-xs text-white/50 mt-1">
            30-day uptime
          </div>
        </div>

        {/* Incidents this month */}
        <div className="text-center p-3 rounded-lg bg-white/[0.02] border border-white/5">
          <div className="text-2xl font-bold text-white/90">
            {incidentsThisMonth}
          </div>
          <div className="text-xs text-white/50 mt-1">
            Incidents this month
          </div>
        </div>
      </div>
    </div>
  );
}
