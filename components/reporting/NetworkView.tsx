'use client';

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Network,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Filter,
} from 'lucide-react';

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[400px] bg-neutral-50 rounded-xl">
      <div className="w-6 h-6 rounded-full border-2 border-neutral-200 border-t-neutral-800 animate-spin" />
    </div>
  ),
});

interface Organization {
  id: string;
  name: string;
  value: number;
  status: string;
  salesPoc?: string;
}

interface Document {
  id: string;
  type: 'quote' | 'msa';
  companyName: string;
  value: number;
  orgId?: string;
}

interface NetworkViewProps {
  organizations: Organization[];
  documents: Document[];
  onNodeClick?: (node: { id: string; type: string }) => void;
}

interface GraphNode {
  id: string;
  name: string;
  type: 'org' | 'quote' | 'msa' | 'am';
  value: number;
  color: string;
  size: number;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
  type: 'quote' | 'msa' | 'manages';
}

const NODE_COLORS = {
  org: '#8B5CF6', // violet
  quote: '#3B82F6', // blue
  msa: '#10B981', // emerald
  am: '#F59E0B', // amber
};

const STATUS_OPACITY: Record<string, number> = {
  onboarded: 1,
  proposal: 0.9,
  trial: 0.8,
  demo: 0.7,
  intro: 0.6,
  lost: 0.4,
};

export default function NetworkView({
  organizations,
  documents,
  onNodeClick,
}: NetworkViewProps) {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [selectedAM, setSelectedAM] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Get unique AMs
  const accountManagers = useMemo(() => {
    const ams = new Set<string>();
    organizations.forEach((org) => {
      if (org.salesPoc) ams.add(org.salesPoc);
    });
    return Array.from(ams);
  }, [organizations]);

  // Build graph data
  const graphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const orgMap = new Map<string, string>(); // companyName -> orgId

    // Filter by selected AM if any
    const filteredOrgs = selectedAM
      ? organizations.filter((o) => o.salesPoc === selectedAM)
      : organizations;

    // Add AM nodes
    const activeAMs = new Set<string>();
    filteredOrgs.forEach((org) => {
      if (org.salesPoc) activeAMs.add(org.salesPoc);
    });

    activeAMs.forEach((am) => {
      nodes.push({
        id: `am-${am}`,
        name: am,
        type: 'am',
        value: 0,
        color: NODE_COLORS.am,
        size: 12,
      });
    });

    // Add organization nodes
    filteredOrgs.forEach((org) => {
      const opacity = STATUS_OPACITY[org.status] || 0.7;
      const size = Math.max(6, Math.min(20, Math.sqrt(org.value / 10000) * 3));

      nodes.push({
        id: org.id,
        name: org.name,
        type: 'org',
        value: org.value,
        color: `rgba(139, 92, 246, ${opacity})`, // violet with opacity
        size,
      });

      orgMap.set(org.name.toLowerCase(), org.id);

      // Link org to AM
      if (org.salesPoc) {
        links.push({
          source: `am-${org.salesPoc}`,
          target: org.id,
          type: 'manages',
        });
      }
    });

    // Add document nodes and link to orgs
    documents.forEach((doc) => {
      // Find matching org
      const orgId = orgMap.get(doc.companyName.toLowerCase());

      if (orgId || !selectedAM) {
        const size = Math.max(4, Math.min(12, Math.sqrt(doc.value / 10000) * 2));

        nodes.push({
          id: doc.id,
          name: `${doc.type.toUpperCase()}: ${doc.companyName}`,
          type: doc.type,
          value: doc.value,
          color: doc.type === 'quote' ? NODE_COLORS.quote : NODE_COLORS.msa,
          size,
        });

        if (orgId) {
          links.push({
            source: orgId,
            target: doc.id,
            type: doc.type,
          });
        }
      }
    });

    return { nodes, links };
  }, [organizations, documents, selectedAM]);

  // Handle container resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height: 400 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom * 1.3, 300);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom();
      graphRef.current.zoom(currentZoom / 1.3, 300);
    }
  }, []);

  const handleFitToView = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 50);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.d3ReheatSimulation();
    }
  }, []);

  // Node click handler
  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (onNodeClick && node.type !== 'am') {
        onNodeClick({ id: node.id, type: node.type });
      }
    },
    [onNodeClick]
  );

  // Custom node rendering
  const nodeCanvasObject = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const label = node.name;
      const fontSize = Math.max(10 / globalScale, 3);
      const nodeSize = node.size;

      // Draw node circle
      ctx.beginPath();
      ctx.arc(node.x || 0, node.y || 0, nodeSize, 0, 2 * Math.PI);
      ctx.fillStyle = node.color;
      ctx.fill();

      // Draw border for hovered node
      if (hoveredNode?.id === node.id) {
        ctx.strokeStyle = '#1F2937';
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();
      }

      // Draw label for larger nodes or when zoomed in
      if (nodeSize > 8 || globalScale > 1.5) {
        ctx.font = `${fontSize}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#374151';

        // Truncate long labels
        const maxWidth = 60 / globalScale;
        let displayLabel = label;
        if (ctx.measureText(label).width > maxWidth) {
          displayLabel = label.substring(0, 12) + '...';
        }

        ctx.fillText(displayLabel, node.x || 0, (node.y || 0) + nodeSize + 2);
      }
    },
    [hoveredNode]
  );

  // Link rendering
  const linkColor = useCallback((link: GraphLink) => {
    switch (link.type) {
      case 'quote':
        return 'rgba(59, 130, 246, 0.3)';
      case 'msa':
        return 'rgba(16, 185, 129, 0.3)';
      case 'manages':
        return 'rgba(245, 158, 11, 0.2)';
      default:
        return 'rgba(156, 163, 175, 0.2)';
    }
  }, []);

  const formatCurrency = (value: number): string => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-neutral-500" />
          <h3 className="font-semibold text-neutral-900">Network View</h3>
          <span className="text-xs text-neutral-400">
            {graphData.nodes.length} nodes · {graphData.links.length} connections
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* AM Filter */}
          <select
            value={selectedAM || ''}
            onChange={(e) => setSelectedAM(e.target.value || null)}
            className="text-sm border border-neutral-200 rounded-lg px-2 py-1.5 bg-white"
          >
            <option value="">All Account Managers</option>
            {accountManagers.map((am) => (
              <option key={am} value={am}>
                {am}
              </option>
            ))}
          </select>

          {/* Zoom controls */}
          <div className="flex items-center border border-neutral-200 rounded-lg overflow-hidden">
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-neutral-100 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4 text-neutral-600" />
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-neutral-100 transition-colors border-x border-neutral-200"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4 text-neutral-600" />
            </button>
            <button
              onClick={handleFitToView}
              className="p-1.5 hover:bg-neutral-100 transition-colors"
              title="Fit to view"
            >
              <Maximize2 className="w-4 h-4 text-neutral-600" />
            </button>
          </div>

          <button
            onClick={handleRefresh}
            className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
            title="Refresh layout"
          >
            <RefreshCw className="w-4 h-4 text-neutral-600" />
          </button>
        </div>
      </div>

      {/* Graph */}
      <div ref={containerRef} className="relative bg-neutral-50">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeCanvasObject={nodeCanvasObject}
          nodePointerAreaPaint={(node: GraphNode, color, ctx) => {
            ctx.beginPath();
            ctx.arc(node.x || 0, node.y || 0, node.size + 2, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
          }}
          linkColor={linkColor}
          linkWidth={1.5}
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleSpeed={0.005}
          onNodeHover={(node) => setHoveredNode(node as GraphNode | null)}
          onNodeClick={(node) => handleNodeClick(node as GraphNode)}
          cooldownTicks={100}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          enableNodeDrag={true}
          enableZoomPanInteraction={true}
        />

        {/* Hover tooltip */}
        {hoveredNode && (
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg border border-neutral-200 p-3 pointer-events-none z-10">
            <p className="font-medium text-neutral-900">{hoveredNode.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`px-1.5 py-0.5 text-xs rounded ${
                  hoveredNode.type === 'org'
                    ? 'bg-violet-100 text-violet-700'
                    : hoveredNode.type === 'quote'
                      ? 'bg-blue-100 text-blue-700'
                      : hoveredNode.type === 'msa'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                }`}
              >
                {hoveredNode.type.toUpperCase()}
              </span>
              {hoveredNode.value > 0 && (
                <span className="text-sm text-neutral-600">
                  {formatCurrency(hoveredNode.value)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 px-5 py-3 border-t border-neutral-100 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-xs text-neutral-600">Account Manager</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-violet-500" />
          <span className="text-xs text-neutral-600">Organization</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-neutral-600">Quote</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-xs text-neutral-600">MSA</span>
        </div>
      </div>
    </div>
  );
}
