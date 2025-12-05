/**
 * myRA AI Status Widget
 *
 * Embeddable status widget that shows the current operational status.
 *
 * Usage:
 * <script src="https://your-status-domain.com/widget.js"
 *   data-theme="dark"
 *   data-size="compact"
 *   data-show-providers="true"
 *   data-providers="all">
 * </script>
 */

(function () {
  'use strict';

  // Configuration
  const WIDGET_VERSION = '1.0.0';
  const DEFAULT_REFRESH_INTERVAL = 60000; // 1 minute

  // Get the script element and its data attributes
  const scriptEl = document.currentScript;
  const config = {
    theme: scriptEl?.getAttribute('data-theme') || 'dark',
    size: scriptEl?.getAttribute('data-size') || 'standard',
    showProviders: scriptEl?.getAttribute('data-show-providers') !== 'false',
    providers: scriptEl?.getAttribute('data-providers') || 'all',
    refreshInterval: parseInt(scriptEl?.getAttribute('data-refresh') || DEFAULT_REFRESH_INTERVAL.toString(), 10),
  };

  // Determine the API base URL from the script source
  const scriptSrc = scriptEl?.src || '';
  const baseUrl = scriptSrc.replace(/\/widget\.js.*$/, '');

  // Status colors
  const STATUS_COLORS = {
    dark: {
      operational: { bg: '#064e3b', border: '#10b981', text: '#a7f3d0', dot: '#10b981' },
      degraded: { bg: '#713f12', border: '#f59e0b', text: '#fde68a', dot: '#f59e0b' },
      outage: { bg: '#7f1d1d', border: '#ef4444', text: '#fecaca', dot: '#ef4444' },
    },
    light: {
      operational: { bg: '#d1fae5', border: '#10b981', text: '#065f46', dot: '#10b981' },
      degraded: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', dot: '#f59e0b' },
      outage: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b', dot: '#ef4444' },
    },
  };

  // Size configurations
  const SIZE_CONFIG = {
    compact: { padding: '8px 12px', fontSize: '12px', dotSize: '8px', gap: '6px' },
    standard: { padding: '12px 16px', fontSize: '14px', dotSize: '10px', gap: '8px' },
    large: { padding: '16px 20px', fontSize: '16px', dotSize: '12px', gap: '10px' },
  };

  // Create widget container
  function createWidget() {
    const container = document.createElement('div');
    container.id = 'myra-status-widget';
    container.setAttribute('data-version', WIDGET_VERSION);

    const sizeStyle = SIZE_CONFIG[config.size] || SIZE_CONFIG.standard;
    const themeColors = STATUS_COLORS[config.theme] || STATUS_COLORS.dark;

    container.style.cssText = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      border-radius: 8px;
      display: inline-block;
      transition: all 0.2s ease;
      cursor: pointer;
      text-decoration: none;
    `;

    // Insert widget after the script tag
    if (scriptEl && scriptEl.parentNode) {
      scriptEl.parentNode.insertBefore(container, scriptEl.nextSibling);
    } else {
      document.body.appendChild(container);
    }

    return container;
  }

  // Update widget content
  function updateWidget(container, data) {
    const sizeStyle = SIZE_CONFIG[config.size] || SIZE_CONFIG.standard;
    const themeColors = STATUS_COLORS[config.theme] || STATUS_COLORS.dark;
    const colors = themeColors[data.overallStatus] || themeColors.operational;

    container.style.cssText = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      border-radius: 8px;
      display: inline-block;
      transition: all 0.2s ease;
      cursor: pointer;
      text-decoration: none;
      background: ${colors.bg};
      border: 1px solid ${colors.border};
      padding: ${sizeStyle.padding};
    `;

    let html = `
      <div style="display: flex; align-items: center; gap: ${sizeStyle.gap};">
        <span style="
          width: ${sizeStyle.dotSize};
          height: ${sizeStyle.dotSize};
          background: ${colors.dot};
          border-radius: 50%;
          display: inline-block;
          animation: ${data.overallStatus === 'operational' ? 'none' : 'pulse 2s infinite'};
        "></span>
        <span style="
          color: ${colors.text};
          font-size: ${sizeStyle.fontSize};
          font-weight: 500;
        ">${data.statusMessage}</span>
    `;

    // Add service count for standard and large sizes
    if (config.size !== 'compact' && data.servicesTotal > 0) {
      html += `
        <span style="
          color: ${colors.text};
          font-size: calc(${sizeStyle.fontSize} - 2px);
          opacity: 0.7;
          margin-left: 4px;
        ">(${data.servicesOperational}/${data.servicesTotal})</span>
      `;
    }

    html += '</div>';

    // Add provider list if enabled and showing
    if (config.showProviders && config.size === 'large' && data.providers && data.providers.length > 0) {
      html += `
        <div style="
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid ${colors.border}40;
          display: flex;
          flex-direction: column;
          gap: 4px;
        ">
      `;

      data.providers.slice(0, 5).forEach(provider => {
        const providerStatus = provider.status === 'operational' ? 'operational' :
                              provider.status.includes('outage') ? 'outage' : 'degraded';
        const providerColors = themeColors[providerStatus];

        html += `
          <div style="
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: calc(${sizeStyle.fontSize} - 2px);
          ">
            <span style="
              width: 6px;
              height: 6px;
              background: ${providerColors.dot};
              border-radius: 50%;
              display: inline-block;
            "></span>
            <span style="color: ${colors.text};">${provider.name}</span>
          </div>
        `;
      });

      html += '</div>';
    }

    container.innerHTML = html;

    // Click handler to open status page
    container.onclick = () => {
      window.open(baseUrl + '/status', '_blank');
    };
  }

  // Fetch status data
  async function fetchStatus() {
    try {
      const params = new URLSearchParams();
      if (config.providers && config.providers !== 'all') {
        params.set('providers', config.providers);
      }

      const url = `${baseUrl}/api/widget${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }

      return await response.json();
    } catch (error) {
      console.error('myRA Status Widget Error:', error);
      return {
        overallStatus: 'operational',
        statusMessage: 'Status Unavailable',
        servicesOperational: 0,
        servicesTotal: 0,
        providers: [],
      };
    }
  }

  // Add pulse animation
  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      #myra-status-widget:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
    `;
    document.head.appendChild(style);
  }

  // Initialize widget
  async function init() {
    addStyles();
    const container = createWidget();

    // Initial loading state
    const sizeStyle = SIZE_CONFIG[config.size] || SIZE_CONFIG.standard;
    const themeColors = STATUS_COLORS[config.theme] || STATUS_COLORS.dark;
    const colors = themeColors.operational;

    container.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        gap: ${sizeStyle.gap};
        padding: ${sizeStyle.padding};
        background: ${config.theme === 'dark' ? '#1f2937' : '#f3f4f6'};
        border: 1px solid ${config.theme === 'dark' ? '#374151' : '#d1d5db'};
        border-radius: 8px;
      ">
        <span style="
          width: ${sizeStyle.dotSize};
          height: ${sizeStyle.dotSize};
          background: ${config.theme === 'dark' ? '#6b7280' : '#9ca3af'};
          border-radius: 50%;
          display: inline-block;
          animation: pulse 1s infinite;
        "></span>
        <span style="
          color: ${config.theme === 'dark' ? '#9ca3af' : '#6b7280'};
          font-size: ${sizeStyle.fontSize};
          font-weight: 500;
        ">Loading...</span>
      </div>
    `;

    // Fetch and display status
    const data = await fetchStatus();
    updateWidget(container, data);

    // Set up refresh interval
    if (config.refreshInterval > 0) {
      setInterval(async () => {
        const newData = await fetchStatus();
        updateWidget(container, newData);
      }, config.refreshInterval);
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
