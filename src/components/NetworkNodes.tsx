import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Server, Router, HardDrive, Cloud, Network, ExternalLink, Layers } from 'lucide-react';

type DeviceNodeData = {
  label: string;
  ip: string;
  interface?: string;
  interfaces?: Array<{
    name: string;
    type: string;
    ip: string;
  }>;
  diversion?: {
    target: string | string[];
    target_type: 'innerserver' | 'outerserver';
    traffic_type: string;
    label: string;
  };
  details?: any;
  isGateway?: boolean;
  isCdnOrigin?: boolean;
  isCdnEdge?: boolean;
};

type GroupNodeData = {
  label: string;
  subnet: string;
  type: 'as' | 'lan';
  network_type?: 'domestic' | 'international';
  level?: number;
};

type CloudNodeData = {
  label: string;
  type: 'domestic' | 'international';
};

type ExternalServerNodeData = {
  label: string;
  host: string;
};

export const DeviceNode = ({ data }: NodeProps) => {
  const nodeData = data as DeviceNodeData;
  
  // 检测长设备名，判断是否需要分行显示
  const isLongName = nodeData.label && nodeData.label.length > 12;
  // 如果名称超长，则将其分割成数组，每个元素最多12个字符
  const nameParts = isLongName ? 
    nodeData.label.match(/.{1,12}/g) || [nodeData.label] : 
    [nodeData.label];
    
  // 检查是否有CDN回源
  const hasCdnBacksource = nodeData.diversion && 
                           nodeData.diversion.traffic_type === 'cdn' && 
                           Array.isArray(nodeData.diversion.target);
                           
  // 检查是否是CDN源站或边缘站点
  const isCdnOrigin = !!nodeData.isCdnOrigin;
  const isCdnEdge = !!nodeData.isCdnEdge;
  
  // 决定边框颜色
  let borderColorClass = 'border-gray-300 dark:border-gray-600';
  if (isCdnOrigin) {
    borderColorClass = 'border-blue-500 dark:border-blue-400 border-2';
  } else if (isCdnEdge) {
    borderColorClass = 'border-orange-500 dark:border-orange-400 border-2';
  } else if (hasCdnBacksource) {
    borderColorClass = 'border-orange-500 dark:border-orange-400';
  }
  
  // 决定图标颜色
  let iconColorClass = 'text-blue-600 dark:text-blue-400';
  if (isCdnOrigin) {
    iconColorClass = 'text-blue-500 dark:text-blue-400';
  } else if (isCdnEdge || hasCdnBacksource) {
    iconColorClass = 'text-orange-500 dark:text-orange-400';
  }
  
  return (
    <div className={`bg-white dark:bg-gray-800 p-1.5 rounded-md border shadow-sm w-[130px] ${borderColorClass}`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top" 
        className={isCdnOrigin ? "cdn-source-handle" : isCdnEdge ? "cdn-target-handle" : ""}
      />
      <div className="flex flex-col items-center">
        <Server className={`w-6 h-6 ${iconColorClass}`} />
        
        {/* CDN标记 */}
        {(isCdnOrigin || isCdnEdge) && (
          <div className={`absolute -top-2 -right-2 ${isCdnOrigin ? 'bg-blue-100 dark:bg-blue-800' : 'bg-orange-100 dark:bg-orange-800'} rounded-full px-1 py-0.5`}>
            <span className={`text-[8px] font-bold ${isCdnOrigin ? 'text-blue-700 dark:text-blue-200' : 'text-orange-700 dark:text-orange-200'}`}>
              {isCdnOrigin ? 'CDN源站' : 'CDN边缘'}
            </span>
          </div>
        )}
        
        {/* 使用nameParts数组显示设备名，可能为1到2行 */}
        <div className="text-xs font-medium mt-0.5 dark:text-gray-200 text-center w-full">
          {nameParts.map((part, index) => (
            <div key={index} className="leading-tight">{part}</div>
          ))}
        </div>
        <div className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-full">{nodeData.ip}</div>
        {nodeData.interface && (
          <div className="text-[9px] text-gray-400 dark:text-gray-500 truncate max-w-full">{nodeData.interface}</div>
        )}
        {nodeData.diversion && (
          <div className="mt-0.5 w-full">
            <div className={`text-[9px] font-medium truncate max-w-full
              ${hasCdnBacksource ? 'text-orange-500 dark:text-orange-400' : 'text-pink-600 dark:text-pink-400'}`}>
              {nodeData.diversion.label}: {nodeData.diversion.traffic_type}
            </div>
            {/* 显示CDN回源信息，当traffic_type为cdn时显示目标数量 */}
            {hasCdnBacksource && (
              <div className="text-[8px] text-orange-500 dark:text-orange-400 font-bold truncate max-w-full">
                回源节点: {(nodeData.diversion.target as string[]).length}个
              </div>
            )}
          </div>
        )}
      </div>
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom-source" 
        className={isCdnOrigin ? "cdn-source-handle" : ""}
      />
      <Handle 
        type="target" 
        position={Position.Bottom} 
        id="bottom-target" 
        className={isCdnEdge ? "cdn-target-handle" : ""}
      />
      <Handle id="right-source" type="source" position={Position.Right} />
      <Handle id="right-target" type="target" position={Position.Right} />
      <Handle id="left-source" type="source" position={Position.Left} />
      <Handle id="left-target" type="target" position={Position.Left} />
    </div>
  );
};

export const RouterNode = ({ data }: NodeProps) => {
  const nodeData = data as DeviceNodeData;
  const hasDiversion = nodeData.diversion !== undefined;
  
  // 检测长设备名，判断是否需要分行显示
  const isLongName = nodeData.label && nodeData.label.length > 12;
  // 如果名称超长，则将其分割成数组，每个元素最多12个字符
  const nameParts = isLongName ? 
    nodeData.label.match(/.{1,12}/g) || [nodeData.label] : 
    [nodeData.label];
    
  // 检查是否有CDN回源
  const hasCdnBacksource = nodeData.diversion && 
                           nodeData.diversion.traffic_type === 'cdn' && 
                           Array.isArray(nodeData.diversion.target);
  
  return (
    <div className={`bg-white dark:bg-gray-800 p-1.5 rounded-md border shadow-sm w-[130px] 
      ${nodeData.isGateway ? 'border-orange-400 dark:border-orange-500' : 'border-purple-400 dark:border-purple-500'} 
      ${hasCdnBacksource ? 'border-orange-500 dark:border-orange-400' : 
        (hasDiversion ? 'border-pink-400 dark:border-pink-500' : '')}`}>
      <Handle type="target" position={Position.Top} id="top" />
      
      <div className="flex flex-col items-center">
        <Router className={`w-6 h-6 
          ${hasCdnBacksource ? 'text-orange-500 dark:text-orange-400' : 
            (nodeData.isGateway ? 'text-orange-600 dark:text-orange-500' : 'text-purple-600 dark:text-purple-500')} 
          ${!hasCdnBacksource && hasDiversion ? 'text-pink-600 dark:text-pink-500' : ''}`} />
        {/* 使用nameParts数组显示设备名，可能为1到2行 */}
        <div className="text-xs font-medium mt-0.5 dark:text-gray-200 text-center w-full">
          {nameParts.map((part, index) => (
            <div key={index} className="leading-tight">{part}</div>
          ))}
        </div>
        <div className="text-[9px] text-gray-500 dark:text-gray-400 truncate max-w-full">{nodeData.ip}</div>
        
        {nodeData.interfaces && nodeData.interfaces.length > 0 && (
          <div className="mt-0.5 w-full">
            <div className="text-[9px] font-medium text-gray-700 dark:text-gray-300">Interfaces:</div>
            {nodeData.interfaces.map((intf) => (
              <div key={intf.name} className="text-[8px] text-gray-500 dark:text-gray-400 flex justify-between truncate max-w-full">
                <span>{intf.name}:</span>
                <span className="ml-1">{intf.ip}</span>
              </div>
            ))}
          </div>
        )}
        
        {hasDiversion && (
          <div className="mt-0.5 w-full">
            <div className={`text-[9px] font-medium truncate max-w-full
              ${hasCdnBacksource ? 'text-orange-500 dark:text-orange-400' : 'text-pink-600 dark:text-pink-400'}`}>
              {nodeData.diversion.label}: {nodeData.diversion.traffic_type}
            </div>
            {/* 显示CDN回源信息，当traffic_type为cdn时显示目标数量 */}
            {hasCdnBacksource && (
              <div className="text-[8px] text-orange-500 dark:text-orange-400 font-bold truncate max-w-full">
                回源节点: {(nodeData.diversion.target as string[]).length}个
              </div>
            )}
          </div>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} id="bottom-source" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" />
      <Handle id="right-source" type="source" position={Position.Right} />
      <Handle id="right-target" type="target" position={Position.Right} />
      <Handle id="left-source" type="source" position={Position.Left} />
      <Handle id="left-target" type="target" position={Position.Left} />
    </div>
  );
};

export const GroupNode = ({ data }: NodeProps) => {
  const nodeData = data as GroupNodeData;
  const isAS = nodeData.type === 'as';
  const isSubnet = nodeData.level && nodeData.level > 0;
  const level = nodeData.level || 0;
  
  return (
    <div className="absolute left-0 top-0 p-1.5 w-full">
      <div className={`flex items-center gap-1.5 ${isSubnet ? 'bg-opacity-60 bg-green-50 dark:bg-green-900 dark:bg-opacity-20 p-0.5 rounded' : ''}`}>
        {isAS ? (
          <Network className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        ) : (
          <div className="flex items-center">
            <HardDrive className="w-4 h-4 text-green-600 dark:text-green-400" />
            {isSubnet && (
              <div className="absolute -top-1 -right-1 bg-emerald-100 dark:bg-emerald-800 rounded-full w-4 h-4 flex items-center justify-center">
                <span className="text-[8px] text-emerald-700 dark:text-emerald-200 font-bold">{level}</span>
              </div>
            )}
          </div>
        )}
        <div className={`text-xs font-semibold ${isAS ? 'text-blue-700 dark:text-blue-400' : 'text-green-700 dark:text-green-400'}`}>
          {nodeData.label.replace('_', ' ')}
          {isAS && nodeData.network_type && (
            <span className={`ml-1 text-[9px] ${nodeData.network_type === 'domestic' ? 'text-blue-500' : 'text-purple-500'}`}>
              ({nodeData.network_type === 'domestic' ? '国内' : '国外'})
            </span>
          )}
          {isSubnet && (
            <span className="ml-1 text-[9px] text-emerald-600 dark:text-emerald-400 flex items-center">
              <Layers className="w-3 h-3 mr-0.5" /> L{level}
            </span>
          )}
        </div>
      </div>
      {nodeData.subnet && (
        <div className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5">
          Subnet: {nodeData.subnet}
        </div>
      )}
    </div>
  );
};

export const CloudNode = ({ data, id, selected }: NodeProps) => {
  const nodeData = data as CloudNodeData;
  
  return (
    <div 
      className={`flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 border-2 rounded-md shadow-md 
      ${nodeData.type === 'domestic' ? 'border-blue-400 dark:border-blue-500' : 'border-purple-400 dark:border-purple-500'}
      ${selected ? 'ring-2 ring-offset-2 ring-blue-500' : ''}
      h-full w-full relative`}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        id="top" 
        className="w-4 h-4 bg-blue-500" 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom-source" 
        className="w-4 h-4 bg-blue-500" 
      />
      <Handle 
        type="target" 
        position={Position.Bottom} 
        id="bottom-target" 
        className="w-4 h-4 bg-blue-500" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right-source" 
        className="w-4 h-4 bg-blue-500" 
      />
      <Handle 
        type="target" 
        position={Position.Right} 
        id="right-target" 
        className="w-4 h-4 bg-blue-500" 
      />
      <Handle 
        type="source" 
        position={Position.Left} 
        id="left-source" 
        className="w-4 h-4 bg-blue-500" 
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left-target" 
        className="w-4 h-4 bg-blue-500" 
      />
      
      <Cloud className={`w-12 h-12 ${nodeData.type === 'domestic' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'}`} />
      <div className="text-sm font-medium mt-2 text-center dark:text-gray-200">
        {nodeData.label}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {nodeData.type === 'domestic' ? '(国内)' : '(国际)'}
      </div>
    </div>
  );
};

export const ExternalServerNode = ({ data }: NodeProps) => {
  const nodeData = data as ExternalServerNodeData;
  return (
    <div className="flex flex-col items-center p-1 bg-white dark:bg-gray-800 border rounded-md border-yellow-400 dark:border-yellow-500 shadow-sm w-[100px]">
      <Handle type="target" position={Position.Top} id="top" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      
      <div className="flex justify-center">
        <ExternalLink className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
      </div>
      <div className="text-xs font-medium text-center mt-0.5 dark:text-gray-200">
        {nodeData.label}
      </div>
      <div className="text-[9px] text-gray-500 dark:text-gray-400 text-center">
        {nodeData.host}
      </div>
    </div>
  );
};
