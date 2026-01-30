'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { GtmAccessRequired } from '@/components/gtm/GtmAccessRequired';

const dashboardCSS = `
  .gtm-catchup-root * { margin: 0; padding: 0; box-sizing: border-box; }
  .gtm-catchup-root {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #e8ecf3 0%, #f3eff8 50%, #edf5f2 100%);
    background-attachment: fixed;
    color: #1a1a2e;
    min-height: 100vh;
  }
  .gtm-catchup-root .dashboard {
    display: grid;
    grid-template-rows: auto auto 1fr auto;
    height: 100vh;
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px 28px;
    gap: 16px;
  }
  .gtm-catchup-root .header { display: flex; justify-content: space-between; align-items: center; }
  .gtm-catchup-root .header-left { display: flex; align-items: center; gap: 16px; }
  .gtm-catchup-root .header h1 { font-size: 22px; font-weight: 600; color: #1a1a2e; }
  .gtm-catchup-root .comparison-badge {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 12px; font-weight: 600; color: #16a34a;
    background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
    padding: 8px 14px; border-radius: 8px;
    border: 1px solid rgba(22, 163, 74, 0.2);
    box-shadow: 0 2px 8px rgba(22, 163, 74, 0.1);
  }
  .gtm-catchup-root .comparison-badge::before { content: '↑'; font-size: 14px; }
  .gtm-catchup-root .header-right { display: flex; align-items: center; gap: 16px; }
  .gtm-catchup-root .timestamp { font-size: 11px; color: #6b7280; }
  .gtm-catchup-root .header .date {
    font-size: 13px; color: #1a1a2e; font-weight: 500;
    background: rgba(255,255,255,0.85); padding: 8px 16px;
    border-radius: 8px; border: 1px solid rgba(255,255,255,0.9);
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  }
  .gtm-catchup-root .delta {
    display: inline-flex; align-items: center;
    font-size: 10px; font-weight: 600; padding: 2px 6px;
    border-radius: 4px; margin-left: 6px;
  }
  .gtm-catchup-root .delta.up { background: #dcfce7; color: #16a34a; }
  .gtm-catchup-root .delta.neutral { background: #f3f4f6; color: #6b7280; }
  .gtm-catchup-root .kpi-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .gtm-catchup-root .kpi-card {
    background: rgba(255,255,255,0.75); border-radius: 12px; padding: 16px 18px;
    border: 1px solid rgba(255,255,255,0.9); box-shadow: 0 4px 16px rgba(0,0,0,0.04);
    position: relative; cursor: default;
  }
  .gtm-catchup-root .kpi-card.has-tooltip { cursor: pointer; }
  .gtm-catchup-root .kpi-card.has-tooltip:hover { background: rgba(255,255,255,0.9); box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
  .gtm-catchup-root .kpi-label { font-size: 11px; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 6px; }
  .gtm-catchup-root .kpi-value-row { display: flex; align-items: center; gap: 8px; }
  .gtm-catchup-root .kpi-value { font-size: 32px; font-weight: 700; line-height: 1.1; }
  .gtm-catchup-root .kpi-value.dark { color: #1a1a2e; }
  .gtm-catchup-root .kpi-value.green { color: #059669; }
  .gtm-catchup-root .kpi-value.blue { color: #2563eb; }
  .gtm-catchup-root .kpi-meta { font-size: 11px; color: #9ca3af; margin-top: 4px; }
  .gtm-catchup-root .kpi-tooltip {
    display: none; position: absolute; left: 0; right: 0; top: 100%; margin-top: 8px;
    background: #1a1a2e; color: #fff; padding: 14px 16px; border-radius: 10px;
    font-size: 11px; line-height: 1.6; z-index: 100; box-shadow: 0 8px 24px rgba(0,0,0,0.25);
  }
  .gtm-catchup-root .kpi-tooltip::before {
    content: ''; position: absolute; top: -6px; left: 24px;
    width: 12px; height: 12px; background: #1a1a2e; transform: rotate(45deg);
  }
  .gtm-catchup-root .kpi-card.has-tooltip:hover .kpi-tooltip { display: block; }
  .gtm-catchup-root .kpi-tooltip-title { font-weight: 600; margin-bottom: 8px; color: rgba(255,255,255,0.6); font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
  .gtm-catchup-root .org-list-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 14px; }
  .gtm-catchup-root .org-list-grid span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .gtm-catchup-root .main { display: grid; grid-template-columns: 340px 1fr; gap: 16px; min-height: 0; }
  .gtm-catchup-root .left-col { display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }
  .gtm-catchup-root .card {
    background: rgba(255,255,255,0.7); border-radius: 14px; padding: 16px;
    border: 1px solid rgba(255,255,255,0.9); box-shadow: 0 4px 20px rgba(0,0,0,0.04);
  }
  .gtm-catchup-root .card-title { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 12px; }
  .gtm-catchup-root .pipeline-section { margin-bottom: 10px; }
  .gtm-catchup-root .pipeline-section:last-child { margin-bottom: 0; }
  .gtm-catchup-root .section-label { font-size: 9px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 6px; }
  .gtm-catchup-root .pipeline-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 12px; background: rgba(255,255,255,0.6); border-radius: 8px;
    margin-bottom: 4px; transition: all 0.15s; position: relative;
  }
  .gtm-catchup-root .pipeline-row:hover { background: rgba(255,255,255,0.9); }
  .gtm-catchup-root .pipeline-row:last-child { margin-bottom: 0; }
  .gtm-catchup-root .pipeline-row.has-tooltip { cursor: pointer; }
  .gtm-catchup-root .pipeline-row.has-tooltip:hover { background: rgba(255,255,255,0.95); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .gtm-catchup-root .pipeline-label { font-size: 13px; font-weight: 500; color: #1a1a2e; display: flex; flex-direction: column; gap: 2px; }
  .gtm-catchup-root .pipeline-sublabel { font-size: 10px; color: #9ca3af; font-weight: 400; }
  .gtm-catchup-root .pipeline-count-row { display: flex; align-items: center; gap: 6px; }
  .gtm-catchup-root .pipeline-count { font-size: 24px; font-weight: 800; }
  .gtm-catchup-root .pipeline-row.compact { padding: 8px 12px; }
  .gtm-catchup-root .pipeline-row.compact .pipeline-label { font-size: 12px; color: #4b5563; }
  .gtm-catchup-root .pipeline-row.compact .pipeline-count { font-size: 20px; }
  .gtm-catchup-root .c-trial { color: #7c3aed; }
  .gtm-catchup-root .c-rolled { color: #0891b2; }
  .gtm-catchup-root .c-post-demo { color: #d97706; }
  .gtm-catchup-root .c-demo-queued { color: #ea580c; }
  .gtm-catchup-root .c-dormant { color: #4b5563; }
  .gtm-catchup-root .c-lost { color: #dc2626; }
  .gtm-catchup-root .c-early { color: #6b7280; }
  .gtm-catchup-root .pipeline-divider { height: 1px; background: rgba(0,0,0,0.06); margin: 10px 0; }
  .gtm-catchup-root .pipeline-tooltip {
    display: none; position: absolute; left: 0; right: 0; top: 100%; margin-top: 4px;
    background: #1a1a2e; color: #fff; padding: 12px 14px; border-radius: 10px;
    font-size: 11px; line-height: 1.6; z-index: 100; box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  }
  .gtm-catchup-root .pipeline-tooltip::before {
    content: ''; position: absolute; top: -6px; left: 20px;
    width: 12px; height: 12px; background: #1a1a2e; transform: rotate(45deg);
  }
  .gtm-catchup-root .pipeline-row.has-tooltip:hover .pipeline-tooltip { display: block; }
  .gtm-catchup-root .pipeline-tooltip-title { font-weight: 600; margin-bottom: 6px; color: rgba(255,255,255,0.6); font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
  .gtm-catchup-root .leadgen-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .gtm-catchup-root .leadgen-box { background: rgba(255,255,255,0.6); border-radius: 10px; padding: 12px; border: 1px solid rgba(255,255,255,0.7); }
  .gtm-catchup-root .leadgen-label { font-size: 10px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 8px; }
  .gtm-catchup-root .leadgen-stats { display: flex; gap: 12px; }
  .gtm-catchup-root .stat { text-align: left; }
  .gtm-catchup-root .stat-value { font-size: 18px; font-weight: 700; color: #1a1a2e; display: flex; align-items: center; gap: 4px; }
  .gtm-catchup-root .stat-value .delta { margin-left: 4px; }
  .gtm-catchup-root .stat-value.green { color: #059669; }
  .gtm-catchup-root .stat-value.muted { color: #9ca3af; }
  .gtm-catchup-root .stat-value.gold { color: #d97706; }
  .gtm-catchup-root .stat-label { font-size: 10px; color: #6b7280; }
  .gtm-catchup-root .funnel-flow { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
  .gtm-catchup-root .funnel-arrow { color: #d1d5db; font-size: 11px; }
  .gtm-catchup-root .apollo-note { margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.06); font-size: 11px; color: #6b7280; }
  .gtm-catchup-root .apollo-note strong { color: #1a1a2e; }
  .gtm-catchup-root .warning { display: inline-flex; align-items: center; color: #dc2626; font-size: 10px; margin-top: 4px; background: #fee2e2; padding: 3px 8px; border-radius: 4px; }
  .gtm-catchup-root .right-col { display: flex; flex-direction: column; min-height: 0; }
  .gtm-catchup-root .cost-card {
    background: rgba(255,255,255,0.7); border-radius: 14px; padding: 18px;
    border: 1px solid rgba(255,255,255,0.9); box-shadow: 0 4px 20px rgba(0,0,0,0.04);
    display: flex; flex-direction: column; flex: 1; min-height: 0;
  }
  .gtm-catchup-root .cost-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
  .gtm-catchup-root .cost-title-group { display: flex; flex-direction: column; gap: 4px; }
  .gtm-catchup-root .cost-title-row { display: flex; align-items: center; gap: 10px; }
  .gtm-catchup-root .currency-badge { font-size: 10px; font-weight: 600; color: #fff; background: #1a1a2e; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.5px; }
  .gtm-catchup-root .cost-period { font-size: 11px; color: #6b7280; }
  .gtm-catchup-root .total-cost-banner {
    background: rgba(26,26,46,0.06); border-radius: 10px; padding: 14px 16px; margin-bottom: 6px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .gtm-catchup-root .total-cost-label { font-size: 12px; font-weight: 500; color: #4b5563; }
  .gtm-catchup-root .total-cost-value { font-size: 28px; font-weight: 700; color: #1a1a2e; }
  .gtm-catchup-root .total-cost-value .asterisk { font-size: 16px; color: #9ca3af; vertical-align: super; margin-left: 2px; }
  .gtm-catchup-root .cost-footnote { font-size: 10px; color: #9ca3af; margin-bottom: 14px; padding-left: 2px; }
  .gtm-catchup-root .cost-footnote .asterisk { color: #6b7280; margin-right: 3px; }
  .gtm-catchup-root .summary-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
  .gtm-catchup-root .summary-card {
    padding: 12px; border-radius: 10px; cursor: pointer;
    transition: all 0.2s; border: 2px solid transparent;
  }
  .gtm-catchup-root .summary-card:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.1); }
  .gtm-catchup-root .summary-card.active { border-color: currentColor; }
  .gtm-catchup-root .summary-card.paying { background: rgba(16, 185, 129, 0.12); color: #059669; }
  .gtm-catchup-root .summary-card.prospect { background: rgba(59, 130, 246, 0.12); color: #2563eb; }
  .gtm-catchup-root .summary-card.trial { background: rgba(139, 92, 246, 0.12); color: #7c3aed; }
  .gtm-catchup-root .summary-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px; opacity: 0.8; }
  .gtm-catchup-root .summary-value { font-size: 22px; font-weight: 700; }
  .gtm-catchup-root .summary-meta { font-size: 10px; margin-top: 3px; opacity: 0.7; }
  .gtm-catchup-root .tabs-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .gtm-catchup-root .tabs { display: flex; gap: 2px; background: rgba(0,0,0,0.05); padding: 3px; border-radius: 8px; }
  .gtm-catchup-root .tab {
    padding: 7px 12px; font-size: 11px; font-weight: 500; color: #6b7280;
    background: transparent; border: none; border-radius: 6px; cursor: pointer; transition: all 0.15s;
  }
  .gtm-catchup-root .tab:hover { color: #1a1a2e; }
  .gtm-catchup-root .tab.active { background: #fff; color: #1a1a2e; box-shadow: 0 2px 4px rgba(0,0,0,0.06); }
  .gtm-catchup-root .tab.active.paying { background: #ecfdf5; color: #059669; }
  .gtm-catchup-root .tab.active.prospect { background: #eff6ff; color: #2563eb; }
  .gtm-catchup-root .tab.active.trial { background: #f5f3ff; color: #7c3aed; }
  .gtm-catchup-root .sort-controls { display: flex; align-items: center; gap: 5px; font-size: 10px; color: #6b7280; }
  .gtm-catchup-root .sort-btn {
    padding: 5px 8px; font-size: 10px; font-weight: 500; color: #6b7280;
    background: rgba(255,255,255,0.8); border: 1px solid rgba(0,0,0,0.06);
    border-radius: 5px; cursor: pointer; transition: all 0.15s;
  }
  .gtm-catchup-root .sort-btn:hover { background: #fff; color: #1a1a2e; }
  .gtm-catchup-root .sort-btn.active { background: #1a1a2e; color: #fff; border-color: transparent; }
  .gtm-catchup-root .table-wrap {
    flex: 1; overflow-y: auto; min-height: 0; border-radius: 10px;
    background: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.7);
  }
  .gtm-catchup-root .table-wrap::-webkit-scrollbar { width: 6px; }
  .gtm-catchup-root .table-wrap::-webkit-scrollbar-track { background: transparent; }
  .gtm-catchup-root .table-wrap::-webkit-scrollbar-thumb { background: #c4c4c4; border-radius: 3px; }
  .gtm-catchup-root table { width: 100%; border-collapse: collapse; }
  .gtm-catchup-root th {
    text-align: left; padding: 11px 14px; font-size: 10px; font-weight: 600;
    color: #6b7280; text-transform: uppercase; letter-spacing: 0.4px;
    border-bottom: 1px solid rgba(0,0,0,0.06); position: sticky; top: 0;
    background: rgba(255,255,255,0.95);
  }
  .gtm-catchup-root th.right { text-align: right; }
  .gtm-catchup-root td { padding: 11px 14px; font-size: 13px; border-bottom: 1px solid rgba(0,0,0,0.03); }
  .gtm-catchup-root tr { transition: all 0.15s; }
  .gtm-catchup-root tr:hover td { background: rgba(255,255,255,0.7); }
  .gtm-catchup-root tr:hover td:first-child { border-radius: 8px 0 0 8px; }
  .gtm-catchup-root tr:hover td:last-child { border-radius: 0 8px 8px 0; }
  .gtm-catchup-root .org-name { font-weight: 500; color: #1a1a2e; }
  .gtm-catchup-root .cost-val { font-weight: 600; text-align: right; }
  .gtm-catchup-root .cost-val.paying { color: #059669; }
  .gtm-catchup-root .cost-val.prospect { color: #2563eb; }
  .gtm-catchup-root .cost-val.trial { color: #7c3aed; }
  .gtm-catchup-root .num-val { color: #6b7280; text-align: right; }
  .gtm-catchup-root tr.totals-row td { font-weight: 600; background: rgba(0,0,0,0.03); border-top: 2px solid rgba(0,0,0,0.08); border-bottom: none; }
  .gtm-catchup-root tr.totals-row:hover td { background: rgba(0,0,0,0.05); }
  .gtm-catchup-root tr.totals-row .org-name { color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.3px; }
  .gtm-catchup-root .footer { display: flex; flex-direction: column; gap: 12px; padding: 14px 0 0; border-top: 1px solid rgba(0,0,0,0.06); }
  .gtm-catchup-root .footer-main { display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #6b7280; }
  .gtm-catchup-root .roadmap-section { display: flex; align-items: center; gap: 14px; }
  .gtm-catchup-root .roadmap-label { font-size: 9px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.4px; font-weight: 600; flex-shrink: 0; }
  .gtm-catchup-root .roadmap-strip { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px; flex: 1; }
  .gtm-catchup-root .roadmap-strip::-webkit-scrollbar { height: 3px; }
  .gtm-catchup-root .roadmap-strip::-webkit-scrollbar-track { background: transparent; }
  .gtm-catchup-root .roadmap-strip::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 2px; }
  .gtm-catchup-root .roadmap-item {
    padding: 8px 14px; background: rgba(255,255,255,0.75); border-radius: 6px;
    border: 1px solid rgba(0,0,0,0.05); flex-shrink: 0; transition: all 0.15s;
    font-size: 11px; font-weight: 500; color: #4b5563;
  }
  .gtm-catchup-root .roadmap-item:hover { background: rgba(255,255,255,0.95); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
`;

const dashboardHTML = `
  <div class="dashboard">
    <header class="header">
      <div class="header-left">
        <h1>myRA GTM</h1>
        <span class="comparison-badge">Changes since 23 Jan 2026</span>
      </div>
      <div class="header-right">
        <span class="timestamp">Last updated: 30 Jan 2026, 9:00 AM</span>
        <span class="date">30 January 2026</span>
      </div>
    </header>

    <div class="kpi-strip">
      <div class="kpi-card has-tooltip">
        <div class="kpi-label">Paying Customers</div>
        <div class="kpi-value-row">
          <span class="kpi-value green">8</span>
          <span class="delta neutral">—</span>
        </div>
        <div class="kpi-meta">Revenue generating</div>
        <div class="kpi-tooltip">
          <div class="kpi-tooltip-title">Paying Organizations</div>
          <div class="org-list-grid">
            <span>Kemin</span><span>Cereal Docks</span>
            <span>Mitsubishi Chemical</span><span>Wipak</span>
            <span>Synarchy</span><span>Andeco</span>
            <span>Israel Export Institute</span><span>Unit Consulting</span>
          </div>
        </div>
      </div>
      <div class="kpi-card has-tooltip">
        <div class="kpi-label">Strong Prospects</div>
        <div class="kpi-value-row">
          <span class="kpi-value blue">19</span>
          <span class="delta up">+5</span>
        </div>
        <div class="kpi-meta">High conversion intent</div>
        <div class="kpi-tooltip">
          <div class="kpi-tooltip-title">Prospect Organizations</div>
          <div class="org-list-grid">
            <span>Actio Consultancy</span><span>Amazon</span>
            <span>CCAD</span><span>Dubai Investments</span>
            <span>Ergomed Group</span><span>ExxonMobil</span>
            <span>Foremost Farms</span><span>Horwath HTL</span>
            <span>Rich</span><span>Schneider Electric</span>
            <span>Solution for Dev</span><span>TD Synnex</span>
            <span>TotalEnergies</span><span>Wacker</span>
            <span>Sherwin-Williams</span><span>+ 4 more</span>
          </div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Active Engagement</div>
        <div class="kpi-value dark">54</div>
        <div class="kpi-meta">Paying + Prospects + Trials</div>
      </div>
    </div>

    <div class="main">
      <div class="left-col">
        <div class="card">
          <div class="card-title">Pipeline</div>
          <div class="pipeline-section">
            <div class="section-label">Product Engagement</div>
            <div class="pipeline-row has-tooltip">
              <div class="pipeline-label">
                <span>Active Trial Users</span>
                <span class="pipeline-sublabel">beyond prospect stage</span>
              </div>
              <span class="pipeline-count c-trial">18</span>
              <div class="pipeline-tooltip">
                <div class="pipeline-tooltip-title">Organizations in Trial</div>
                <div class="org-list-grid">
                  <span>Samsung</span><span>TCS</span>
                  <span>Aramex</span><span>TDK</span>
                  <span>Touche Consulting</span><span>Vardaan Global</span>
                  <span>Mitsui &amp; Co.</span><span>Sojitz</span>
                  <span>Advantest</span><span>+ 9 more</span>
                </div>
              </div>
            </div>
            <div class="pipeline-row">
              <span class="pipeline-label">Recently Rolled Out</span>
              <div class="pipeline-count-row">
                <span class="pipeline-count c-rolled">9</span>
                <span class="delta up">+5</span>
              </div>
            </div>
          </div>
          <div class="pipeline-divider"></div>
          <div class="pipeline-section">
            <div class="section-label">Sales Pipeline</div>
            <div class="pipeline-row compact">
              <div class="pipeline-label">
                <span>Post-Demo</span>
                <span class="pipeline-sublabel">awaiting trial setup</span>
              </div>
              <span class="pipeline-count c-post-demo">18</span>
            </div>
            <div class="pipeline-row compact">
              <div class="pipeline-label">
                <span>Demo Queued</span>
                <span class="pipeline-sublabel">scheduled &amp; rescheduled</span>
              </div>
              <span class="pipeline-count c-demo-queued">17</span>
            </div>
          </div>
          <div class="pipeline-divider"></div>
          <div class="pipeline-section">
            <div class="section-label">Inactive</div>
            <div class="pipeline-row compact">
              <span class="pipeline-label">Dormant</span>
              <span class="pipeline-count c-dormant">30</span>
            </div>
            <div class="pipeline-row compact">
              <div class="pipeline-label">
                <span>Lost</span>
                <span class="pipeline-sublabel">mainly cost or lack of myRA fit</span>
              </div>
              <span class="pipeline-count c-lost">20</span>
            </div>
            <div class="pipeline-row compact">
              <span class="pipeline-label">Early / No Info</span>
              <span class="pipeline-count c-early">5</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">Lead Generation</div>
          <div class="leadgen-row">
            <div class="leadgen-box">
              <div class="leadgen-label">Inbound</div>
              <div class="leadgen-stats">
                <div class="stat">
                  <div class="stat-value">30<span class="delta up">+7</span></div>
                  <div class="stat-label">Total</div>
                </div>
                <div class="stat">
                  <div class="stat-value green">6</div>
                  <div class="stat-label">Active</div>
                </div>
                <div class="stat">
                  <div class="stat-value muted">22</div>
                  <div class="stat-label">Junk</div>
                </div>
              </div>
            </div>
            <div class="leadgen-box">
              <div class="leadgen-label">Outbound</div>
              <div class="funnel-flow">
                <div class="stat"><div class="stat-value">10K</div><div class="stat-label">Leads</div></div>
                <span class="funnel-arrow">\u2192</span>
                <div class="stat"><div class="stat-value">8.1K</div><div class="stat-label">Reached</div></div>
                <span class="funnel-arrow">\u2192</span>
                <div class="stat"><div class="stat-value">5.2K</div><div class="stat-label">Followed</div></div>
                <span class="funnel-arrow">\u2192</span>
                <div class="stat"><div class="stat-value gold">4</div><div class="stat-label">Qualified</div></div>
              </div>
              <div class="apollo-note">
                <strong>Apollo:</strong> 1.4K contacts
                <div class="warning">No progress since last update</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="right-col">
        <div class="cost-card">
          <div class="cost-header">
            <div class="cost-title-group">
              <div class="cost-title-row">
                <div class="card-title" style="marginBottom: 0">Cost Economics</div>
                <span class="currency-badge">USD</span>
              </div>
              <span class="cost-period">1 October 2025 \u2013 29 January 2026</span>
            </div>
          </div>
          <div class="total-cost-banner">
            <span class="total-cost-label">Total Platform Cost</span>
            <span class="total-cost-value">16,970<span class="asterisk">*</span></span>
          </div>
          <div class="cost-footnote">
            <span class="asterisk">*</span>Summation of tracked accounts below. Dormant and Lost segments not yet included.
          </div>
          <div class="summary-row">
            <div class="summary-card paying active" data-segment="Paying">
              <div class="summary-label">Paying</div>
              <div class="summary-value">12,419</div>
              <div class="summary-meta">8 orgs \u00b7 21 users</div>
            </div>
            <div class="summary-card prospect" data-segment="Strong Prospect">
              <div class="summary-label">Prospects</div>
              <div class="summary-value">2,795</div>
              <div class="summary-meta">17 orgs \u00b7 40 users</div>
            </div>
            <div class="summary-card trial" data-segment="Active Trial">
              <div class="summary-label">Trials</div>
              <div class="summary-value">1,756</div>
              <div class="summary-meta">13 orgs \u00b7 33 users</div>
            </div>
          </div>
          <div class="tabs-row">
            <div class="tabs">
              <button class="tab paying active" data-segment="Paying">Paying (8)</button>
              <button class="tab prospect" data-segment="Strong Prospect">Prospects (17)</button>
              <button class="tab trial" data-segment="Active Trial">Trials (13)</button>
            </div>
            <div class="sort-controls">
              <span>Sort:</span>
              <button class="sort-btn active" data-sort="cost">Cost</button>
              <button class="sort-btn" data-sort="conversations">Convos</button>
              <button class="sort-btn" data-sort="users">Users</button>
            </div>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Organization</th>
                  <th class="right">Cost</th>
                  <th class="right">Conversations</th>
                  <th class="right">Users</th>
                </tr>
              </thead>
              <tbody id="gtm-table-body"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-main">
        <span>myRA GTM Dashboard</span>
        <span>Data as of 29 January 2026</span>
      </div>
      <div class="roadmap-section">
        <span class="roadmap-label">Coming up</span>
        <div class="roadmap-strip">
          <div class="roadmap-item">Dormant &amp; Lost cost data</div>
          <div class="roadmap-item">Real-time data feeds</div>
          <div class="roadmap-item">Prospect call feedback</div>
          <div class="roadmap-item">Account-level notes</div>
          <div class="roadmap-item">Lead source attribution</div>
        </div>
      </div>
    </div>
  </div>
`;

type OrgData = { name: string; cost: number; conversations: number; users: number };
type SegmentKey = 'Paying' | 'Strong Prospect' | 'Active Trial';
type SortKey = 'cost' | 'conversations' | 'users';

const segmentData: Record<SegmentKey, OrgData[]> = {
  'Paying': [
    { name: 'Wipak', cost: 3781, conversations: 753, users: 2 },
    { name: 'Synarchy', cost: 1890, conversations: 545, users: 2 },
    { name: 'Andeco', cost: 1652, conversations: 1476, users: 4 },
    { name: 'Kemin', cost: 1207, conversations: 760, users: 5 },
    { name: 'Cereal Docks', cost: 1173, conversations: 520, users: 2 },
    { name: 'Mitsubishi Chemical Group', cost: 423, conversations: 180, users: 2 },
    { name: 'Israel Export Institute', cost: 239, conversations: 196, users: 2 },
    { name: 'Unit Consulting', cost: 54, conversations: 26, users: 2 },
  ],
  'Strong Prospect': [
    { name: 'Wacker', cost: 493.92, conversations: 218, users: 3 },
    { name: 'Ergomed Group', cost: 444, conversations: 285, users: 2 },
    { name: 'Dubai Investments', cost: 430, conversations: 272, users: 2 },
    { name: 'Rich', cost: 298, conversations: 109, users: 3 },
    { name: 'Schneider Electric', cost: 223, conversations: 88, users: 2 },
    { name: 'TotalEnergies', cost: 167, conversations: 136, users: 3 },
    { name: 'ExxonMobil', cost: 155, conversations: 89, users: 5 },
    { name: 'Actio Consultancy', cost: 84, conversations: 73, users: 3 },
    { name: 'Solution for Development', cost: 68, conversations: 44, users: 2 },
    { name: 'Foremost Farms', cost: 66, conversations: 25, users: 1 },
    { name: 'Horwath HTL', cost: 58, conversations: 38, users: 2 },
    { name: 'Amazon', cost: 43.03, conversations: 30, users: 3 },
    { name: 'TD Synnex', cost: 30, conversations: 30, users: 2 },
    { name: 'Sherwin-Williams', cost: 22, conversations: 25, users: 1 },
    { name: 'CCAD', cost: 16, conversations: 24, users: 1 },
  ],
  'Active Trial': [
    { name: 'TCS', cost: 356, conversations: 307, users: 5 },
    { name: 'Touche Consulting', cost: 345, conversations: 232, users: 2 },
    { name: 'TDK', cost: 237, conversations: 185, users: 3 },
    { name: 'Samsung', cost: 206, conversations: 178, users: 5 },
    { name: 'Aramex', cost: 182, conversations: 129, users: 1 },
    { name: 'Vardaan Global', cost: 136, conversations: 93, users: 3 },
    { name: 'Mitsui & Co.', cost: 70, conversations: 57, users: 3 },
    { name: 'Littler Associates', cost: 67, conversations: 44, users: 3 },
    { name: 'Sojitz', cost: 42, conversations: 40, users: 2 },
    { name: 'Advantest', cost: 38, conversations: 23, users: 1 },
    { name: 'O-I', cost: 33.1, conversations: 22, users: 1 },
    { name: 'Piramal Consumer Products', cost: 22, conversations: 22, users: 3 },
  ],
};

function getColorClass(segment: SegmentKey): string {
  if (segment === 'Paying') return 'paying';
  if (segment === 'Strong Prospect') return 'prospect';
  return 'trial';
}

function GtmDashboard() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let currentSegment: SegmentKey = 'Paying';
    let currentSort: SortKey = 'cost';

    function renderTable() {
      const tbody = root!.querySelector('#gtm-table-body');
      if (!tbody) return;

      const orgs = [...segmentData[currentSegment]].sort((a, b) => b[currentSort] - a[currentSort]);
      const colorClass = getColorClass(currentSegment);

      const totals = orgs.reduce(
        (acc, org) => ({
          cost: acc.cost + org.cost,
          conversations: acc.conversations + org.conversations,
          users: acc.users + org.users,
        }),
        { cost: 0, conversations: 0, users: 0 }
      );

      let html = orgs
        .map(
          (org) => `
        <tr>
          <td class="org-name">${org.name}</td>
          <td class="cost-val ${colorClass}">${org.cost.toLocaleString()}</td>
          <td class="num-val">${org.conversations.toLocaleString()}</td>
          <td class="num-val">${org.users}</td>
        </tr>
      `
        )
        .join('');

      html += `
        <tr class="totals-row">
          <td class="org-name">Total</td>
          <td class="cost-val ${colorClass}">${totals.cost.toLocaleString()}</td>
          <td class="num-val">${totals.conversations.toLocaleString()}</td>
          <td class="num-val">${totals.users}</td>
        </tr>
      `;

      tbody.innerHTML = html;
    }

    function setActiveSegment(segment: SegmentKey) {
      currentSegment = segment;
      root!.querySelectorAll<HTMLElement>('.summary-card').forEach((card) => {
        card.classList.toggle('active', card.dataset.segment === segment);
      });
      root!.querySelectorAll<HTMLElement>('.tab').forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.segment === segment);
      });
      renderTable();
    }

    function setActiveSort(sort: SortKey) {
      currentSort = sort;
      root!.querySelectorAll<HTMLElement>('.sort-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.sort === sort);
      });
      renderTable();
    }

    root.querySelectorAll<HTMLElement>('.summary-card').forEach((card) => {
      card.addEventListener('click', () => setActiveSegment(card.dataset.segment as SegmentKey));
    });

    root.querySelectorAll<HTMLElement>('.tab').forEach((tab) => {
      tab.addEventListener('click', () => setActiveSegment(tab.dataset.segment as SegmentKey));
    });

    root.querySelectorAll<HTMLElement>('.sort-btn').forEach((btn) => {
      btn.addEventListener('click', () => setActiveSort(btn.dataset.sort as SortKey));
    });

    renderTable();
  }, []);

  return (
    <>
      <style>{dashboardCSS}</style>
      <div
        ref={rootRef}
        className="gtm-catchup-root"
        dangerouslySetInnerHTML={{ __html: dashboardHTML }}
      />
    </>
  );
}

export default function GtmCatchupPage() {
  const [gtmEmail, setGtmEmail] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    fetch('/api/gtm/auth')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setGtmEmail(data.email);
        }
      })
      .catch(() => {})
      .finally(() => setIsCheckingAuth(false));
  }, []);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!gtmEmail) {
    return <GtmAccessRequired />;
  }

  return <GtmDashboard />;
}
