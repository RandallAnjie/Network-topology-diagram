import React, { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  Node,
  NodeTypes,
  EdgeTypes,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  BackgroundVariant,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  useViewport,
  BezierEdge,
  SmoothStepEdge,
  StraightEdge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useNetworkData } from '../hooks/useNetworkData';
import { DeviceNode, RouterNode, GroupNode, CloudNode, ExternalServerNode } from './NetworkNodes';
import { Button } from '@/components/ui/button';
import { Expand, Minimize, Moon, Sun, ZoomIn, ZoomOut, RefreshCcw, ChevronsUp } from 'lucide-react';
import { useTheme } from 'next-themes';

const nodeTypes: NodeTypes = {
  deviceNode: DeviceNode,
  routerNode: RouterNode,
  group: GroupNode,
  cloudNode: CloudNode,
  externalServerNode: ExternalServerNode,
};

const edgeTypes = {
  bezier: BezierEdge,
  smoothstep: SmoothStepEdge,
  straight: StraightEdge,
};

// 实际的Flow组件，使用useReactFlow钩子
const ReactFlowContent = () => {
  const { nodes: initialNodes, edges: initialEdges, isLoading, error } = useNetworkData();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [compactView, setCompactView] = useState(true); // 是否启用紧凑视图
  const [isInitialLoad, setIsInitialLoad] = useState(true); // 控制初始加载
  const [isUserInteracting, setIsUserInteracting] = useState(false); // 用户是否正在交互
  const { theme, setTheme } = useTheme();
  const reactFlowInstance = useReactFlow();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const toggleCompactView = () => {
    setCompactView(!compactView);
    setTimeout(fitView, 50);
  };

  // 自动调整视图
  const fitView = useCallback(() => {
    if (reactFlowInstance && nodes.length > 0 && !isUserInteracting) {
      reactFlowInstance.fitView({ 
        padding: compactView ? 0.1 : 0.2, // 紧凑视图时减少内边距
        includeHiddenNodes: true,
        minZoom: 0.2,
        maxZoom: 1.5
      });
    }
  }, [reactFlowInstance, nodes, compactView, isUserInteracting]);

  React.useEffect(() => {
    if (initialNodes.length > 0) {
      setNodes(initialNodes);
    }
    if (initialEdges.length > 0) {
      // 添加调试信息
      console.log(`NetworkTopology: 接收到 ${initialEdges.length} 条边`);
      // 检查是否存在CDN边
      const cdnEdges = initialEdges.filter(edge => edge.id.includes('cdn') || edge.id.includes('static-cdn'));
      console.log(`NetworkTopology: 其中有 ${cdnEdges.length} 条CDN边`);
      if (cdnEdges.length > 0) {
        console.log('NetworkTopology: CDN边样本:', cdnEdges[0]);
      }
      setEdges(initialEdges);
    }
  }, [initialNodes, initialEdges]);

  // 在节点加载后自动调整视图，但仅在初始加载时执行一次
  useEffect(() => {
    if (nodes.length > 0 && isInitialLoad) {
      setTimeout(() => {
        fitView();
        setIsInitialLoad(false);
      }, 100);
    }
  }, [nodes, fitView, isInitialLoad]);

  // 处理用户交互状态
  const handleUserInteractionStart = useCallback(() => {
    setIsUserInteracting(true);
  }, []);

  const handleUserInteractionEnd = useCallback(() => {
    setIsUserInteracting(false);
  }, []);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect: OnConnect = useCallback(
    (params) => {
      setEdges((eds) => [...eds, { ...params, animated: true }]);
    },
    []
  );

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-lg text-gray-600 dark:text-gray-300">Loading network topology...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-lg text-red-600 dark:text-red-400">Error: {error.message}</div>
      </div>
    );
  }

  return (
    <div className={`${expanded ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900' : 'h-[80vh] w-full'}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView={isInitialLoad} // 只在初始加载时自动适配视图
        fitViewOptions={{ 
          padding: compactView ? 0.1 : 0.2, // 紧凑布局使用更小的内边距
          includeHiddenNodes: true,
          minZoom: 0.2,
          maxZoom: 1.5
        }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
        attributionPosition="bottom-right"
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        onMoveStart={handleUserInteractionStart}
        onMoveEnd={handleUserInteractionEnd}
        onNodeDragStart={handleUserInteractionStart}
        onNodeDragStop={handleUserInteractionEnd}
        elevateEdgesOnSelect={true}
        defaultEdgeOptions={{
          type: 'straight',
          animated: true,
          style: {
            strokeWidth: 2,
          }
        }}
      >
        <Background 
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color={theme === 'dark' ? '#333333' : '#f1f1f1'}
        />
        <MiniMap 
          position="bottom-right" 
          zoomable 
          pannable 
          className={theme === 'dark' ? 'bg-gray-800' : 'bg-blue-50'} 
        />
        
        <Panel position="top-right" className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm"
            title={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCompactView}
            className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm"
            title={compactView ? '普通视图' : '紧凑视图'}
          >
            <ChevronsUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(!expanded)}
            className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm"
            title={expanded ? '退出全屏' : '全屏显示'}
          >
            {expanded ? <Minimize className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={fitView}
            className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm"
            title="自动调整视图"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </Panel>
      </ReactFlow>
    </div>
  );
};

// 主组件，提供ReactFlowProvider包装器
const NetworkTopology: React.FC = () => {
  return (
    <ReactFlowProvider>
      <ReactFlowContent />
    </ReactFlowProvider>
  );
};

export default NetworkTopology;
