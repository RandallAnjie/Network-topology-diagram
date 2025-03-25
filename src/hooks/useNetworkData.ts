import { useEffect, useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import networkConfig from '../data/network-config.json';

type NetworkDataResult = {
  nodes: Node[];
  edges: Edge[];
  isLoading: boolean;
  error: Error | null;
};

type DiversionConfig = {
  target: string | string[];
  target_type: 'innerserver' | 'outerserver';
  traffic_type: string;
  internet_type?: 'domestic' | 'international';
  label?: string;
};

/**
 * 递归计算网络及其所有子网的最大嵌套深度
 * @param networkName 网络名称
 * @param childNetworksMap 子网映射关系
 */
function calculateMaxNetworkDepth(networkName: string, childNetworksMap: {[key: string]: string[]}): number {
  if (!childNetworksMap[networkName] || childNetworksMap[networkName].length === 0) {
    return 0; // 没有子网，深度为0
  }
  
  // 计算所有子网的最大深度
  const childDepths = childNetworksMap[networkName].map(childName => 
    1 + calculateMaxNetworkDepth(childName, childNetworksMap)
  );
  
  // 返回最大值
  return Math.max(...childDepths);
}

/**
 * 计算节点组大小的函数 - 更精确地适应内容
 * @param deviceCount 设备数量
 * @param hasSubnetworks 是否包含子网
 * @param level 网络嵌套的层级
 * @param maxSubnetDepth 最大子网嵌套深度
 * @param isAS 是否为自治系统
 */
function calculateGroupSize(
  deviceCount: number, 
  hasSubnetworks: boolean = false, 
  level: number = 0,
  maxSubnetDepth: number = 0,
  isAS: boolean = false
): { width: number, height: number } {
  // 基础大小，AS比LAN需要更高的基础高度，增加基础宽度
  const baseWidth = isAS ? 300 : 400; // 减小AS基础宽度，增加LAN基础宽度
  const baseHeight = isAS ? 250 : 400; // 保持局域网基础高度
  
  // 更精确地计算设备空间
  const devicesPerRow = Math.max(2, Math.min(4, deviceCount)); // 每行最多4个设备
  const widthPerDevice = isAS ? 130 : 180; // 减小AS中设备占用宽度，增加LAN中设备宽度
  const heightPerDevice = isAS ? 140 : 100; // AS中设备占用更多高度
  
  // 计算行数和列数
  const rows = Math.ceil(deviceCount / devicesPerRow);
  const cols = Math.min(devicesPerRow, deviceCount);
  
  // 计算基本大小，添加一些额外边距，计算宽度时加上额外一个设备的空间防止挤一块
  let width = Math.max(baseWidth, (cols + 2) * widthPerDevice); // 加上两个额外设备的宽度
  let height = isAS 
    ? Math.max(baseHeight, rows * heightPerDevice + 100)
    : Math.max(baseHeight, rows * heightPerDevice + 220); // 大幅增加局域网垂直空间
  
  // 子网情况，根据子网深度增加大小
  if (hasSubnetworks) {
    width = Math.max(width * 1.2, isAS ? 500 : 600); // 为LAN提供更多宽度
    
    // 根据最大子网深度调整高度，每一层子网增加额外空间
    const depthFactor = isAS ? 
      1.3 + (maxSubnetDepth * 0.2) : // AS的子网深度系数更大  
      1.4 + (maxSubnetDepth * 0.3); // 增加LAN的子网深度系数  
    
    // 提高最小高度，确保嵌套时有足够空间
    height = Math.max(
      height * depthFactor, 
      (isAS ? 350 : 600) + (maxSubnetDepth * 150) // 显著增加带子网的网络最小高度
    );
  }
  
  // 随层级减小大小，但确保最小值
  if (level > 0) { // 只对子网应用层级缩放
    const levelFactor = Math.max(0.85, 1 - level * 0.08);
    width *= levelFactor;
    // 高度不随层级缩小太多，确保子网有足够高度
    height *= Math.max(0.9, 1 - level * 0.05);
  }
  
  return { width, height };
}

export function useNetworkData(): NetworkDataResult {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      const processedNodes: Node[] = [];
      const processedEdges: Edge[] = [];
      
      // 创建一个集合来存储已处理的外部分流设备ID
      const handledExternalDiversionDevices = new Set<string>();
      
      const inwallsCloudId = 'cloud-inwalls';
      const globalCloudId = 'cloud-global';
      
      const routerDiversions: Array<{routerId: string, targetName: string, diversion: DiversionConfig}> = [];
      
      // 调整云节点大小和位置，将它们放在同一水平线上，国内左侧，国际右侧
      processedNodes.push({
        id: inwallsCloudId,
        type: 'cloudNode',
        data: { 
          label: 'Inwalls Internet',
          type: 'domestic'
        },
        position: { x: 200, y: 20 }, // 国内网络位置调整
        style: { 
          width: 300, // 更大的宽度
          height: 120, // 更大的高度
        }
      });
      
      processedNodes.push({
        id: globalCloudId,
        type: 'cloudNode',
        data: { 
          label: 'Global Internet',
          type: 'international'
        },
        position: { x: 600, y: 20 }, // 国际网络位置提高
        style: { 
          width: 300, // 更大的宽度
          height: 120, // 更大的高度
        }
      });
      
      // 添加一条明确的紫色虚线，从国际互联网连接到国内互联网
      processedEdges.push({
        id: 'global-to-inwalls-connection',
        source: globalCloudId,
        target: inwallsCloudId,
        animated: true,
        type: 'bezier', // 使用贝塞尔曲线
        label: '国际连接',
        labelBgPadding: [8, 4],
        labelBgBorderRadius: 4,
        style: { 
          stroke: '#9C27B0', 
          strokeWidth: 3, 
          strokeDasharray: '10,5'
        },
        labelStyle: { fill: '#9C27B0', fontWeight: 'bold', fontSize: 14 },
        labelBgStyle: { fill: 'rgba(255, 255, 255, 0.9)' }
      });
      
      const asGroups = networkConfig.network.public.autonomous_systems;
      
      const nodeIdMap: Record<string, string> = {};
      
      // 更紧凑的AS节点布局
      let totalAsWidth = 0;
      const asNodes: Node[] = [];
      
      // 先计算所有AS节点信息，以便后续布局
      asGroups.forEach((as) => {
        const asSize = calculateGroupSize(as.devices.length, false, 0, 0, true);
        totalAsWidth += asSize.width + 40; // 增加AS之间的间距从20到40
        
        const asNode = {
          size: asSize,
          deviceCount: as.devices.length,
          asInfo: as
        };
        
        asNodes.push(asNode as any);
      });
      
      // 更合理的水平间距计算
      const horizontalSpacing = Math.min(80, Math.max(40, 900 / asNodes.length)); // 增加最小和最大间距
      
      // 使用动态布局计算各AS的位置，整体位置下移为云节点留空间
      let currentX = 50;
      asNodes.forEach((asNode: any, asIndex) => {
        const as = asNode.asInfo;
        const asSize = asNode.size;
        const asId = `as-${as.as_number}`;
        const networkType = as.network_type || (asIndex === 0 ? 'domestic' : 'international');
        
        // 增加AS节点宽度以确保容纳所有设备
        const asWidth = Math.max(asSize.width, as.devices.length * 120 + 60); // 减小每个设备占用的宽度
        
        processedNodes.push({
          id: asId,
          type: 'group',
          data: { 
            label: as.as_number,
            subnet: '', 
            type: 'as',
            network_type: networkType
          },
          position: { x: currentX, y: 280 }, // 保持原有位置
          style: { 
            width: asWidth, // 使用计算的宽度确保内部设备都能显示
            height: asSize.height,
            backgroundColor: networkType === 'domestic' ? 'rgba(173, 216, 230, 0.15)' : 'rgba(230, 173, 230, 0.15)',
            borderRadius: '12px',
            padding: '15px'
          },
          className: 'as-group'
        });
        
        // 更新下一个AS的起始位置
        currentX += asWidth + horizontalSpacing;
        
        // 根据网络类型连接到相应的云节点
        const asCloudId = networkType === 'domestic' ? inwallsCloudId : globalCloudId;
        
        // 优化AS内部设备布局的设备间距计算
        const deviceSpacing = Math.min(200, Math.max(150, asWidth / (as.devices.length + 1)));
        
        as.devices.forEach((device, deviceIndex) => {
          const deviceId = `device-${as.as_number}-${device.name}`;
          
          nodeIdMap[device.name] = deviceId;
                    
          // 更均匀分布设备，起始点从左侧边缘开始，不预留路由器空间
          const deviceX = 25 + deviceIndex * deviceSpacing; // 从25px开始，减小左侧边距
          
          processedNodes.push({
            id: deviceId,
            type: 'deviceNode',
            data: { 
              label: device.name,
              ip: device.ip,
              interface: device.interface,
              diversion: device.diversion,
              details: device
            },
            position: { x: deviceX, y: 100 },
            parentId: asId,
            extent: 'parent',
          });
          
          processedEdges.push({
            id: `edge-${asCloudId}-${deviceId}`,
            source: asCloudId,
            sourceHandle: 'bottom-source', // 从云节点底部出发
            target: deviceId,
            targetHandle: 'top',
            animated: true,
            type: 'bezier', // 使用贝塞尔曲线
            style: { stroke: '#4285F4', strokeWidth: 2, opacity: 0.7 }, // 蓝色线条
            label: 'Internet'
          });
          
          if (device.diversion && device.diversion.target_type === 'outerserver') {
            const targetCloudId = device.diversion.internet_type === 'domestic' ? inwallsCloudId : globalCloudId;
            
            if (targetCloudId !== asCloudId) {
              processedEdges.push({
                id: `edge-diversion-${targetCloudId}-${deviceId}`,
                source: targetCloudId,
                sourceHandle: 'bottom-source', // 从云节点底部出发
                target: deviceId,
                targetHandle: 'top',
                animated: true,
                type: 'bezier', // 使用贝塞尔曲线
                style: { stroke: '#4285F4', strokeWidth: 2 }, // 蓝色线条
                label: device.diversion.label || '外部服务器',
                labelStyle: { fill: '#4285F4', fontWeight: 'bold', fontSize: 11 },
                labelBgStyle: { fill: 'rgba(232, 240, 254, 0.8)' },
                labelBgPadding: [4, 2],
                labelBgBorderRadius: 4
              });
            }
          }
        });
      });

      const privateNetworks = networkConfig.network.private;
      
      // 节点映射和关系映射
      const networkNodes: {[key: string]: Node} = {};
      const routerIds: Set<string> = new Set();
      const gatewayIdByNetwork: {[key: string]: string} = {};
      const networkDeviceCounts: {[key: string]: number} = {};
      
      // 子网关系映射：记录哪些网络是哪些网络的子网
      const parentNetworkMap: {[key: string]: string} = {};
      const childNetworksMap: {[key: string]: string[]} = {};
      
      // 第一次遍历：创建基本的网络节点，记录子网关系
      for (const [networkName, networkData] of Object.entries(privateNetworks)) {
        const network = networkData as any;
        
        // 记录设备数量
        const deviceCount = network.devices ? network.devices.length + 1 : 1;
        networkDeviceCounts[networkName] = deviceCount;
        
        // 检查接口，识别子网关系
        if (network.gateway && network.gateway.interfaces) {
          for (const intf of network.gateway.interfaces) {
            // 如果接口类型与某个网络名匹配，则该网络可能是该接口类型网络的子网
            if (intf.type && Object.keys(privateNetworks).includes(intf.type)) {
              const parentNetwork = intf.type;
              
              // 记录父网络关系
              parentNetworkMap[networkName] = parentNetwork;
              
              // 记录子网关系
              if (!childNetworksMap[parentNetwork]) {
                childNetworksMap[parentNetwork] = [];
              }
              childNetworksMap[parentNetwork].push(networkName);
              break;
            }
          }
        }
      }
      
      // 计算网络的层级深度，用于布局和大小计算
      const getNetworkLevel = (networkName: string): number => {
        let level = 0;
        let currentNetwork = networkName;
        
        while (parentNetworkMap[currentNetwork]) {
          level++;
          currentNetwork = parentNetworkMap[currentNetwork];
        }
        
        return level;
      };
      
      // 计算根网络的总数量（不包括子网）
      const rootNetworksCount = Object.keys(privateNetworks).filter(name => !parentNetworkMap[name]).length;
      
      // 使用更紧凑的布局
      const networkSpacing = Math.min(400, Math.max(250, 900 / rootNetworksCount)); // 增加网络之间的间距
      let networkStartX = 50;
      
      // 第二次遍历：创建网络节点
      for (const [networkName, networkData] of Object.entries(privateNetworks)) {
        // 跳过已经作为子网处理的网络
        if (parentNetworkMap[networkName]) {
          continue;
        }
        
        const createNetworkNode = (name: string, data: any, index: number, parentId?: string, level: number = 0) => {
          const networkId = `network-${name}`;
          const network = data;
          
          // 检查是否有子网
          const hasSubnetworks = childNetworksMap[name] && childNetworksMap[name].length > 0;
          
          // 计算包含子网设备在内的总设备数
          let totalDeviceCount = networkDeviceCounts[name] || 0;
          
          if (hasSubnetworks) {
            for (const childNetwork of childNetworksMap[name]) {
              totalDeviceCount += networkDeviceCounts[childNetwork] || 0;
            }
          }
          
          // 计算子网的最大嵌套深度，用于调整父容器高度
          const maxSubnetDepth = hasSubnetworks ? calculateMaxNetworkDepth(name, childNetworksMap) : 0;
          
          // 更精确地计算网络组大小，考虑子网深度
          const networkSize = calculateGroupSize(totalDeviceCount, hasSubnetworks, level, maxSubnetDepth, false);
          
          // 更紧凑的位置计算，为云节点和AS留出足够空间
          const position = parentId 
            ? { x: 40, y: 150 + level * 120 } // 子网位置，增加垂直间距
            : { x: networkStartX, y: 560 }; // 根网络位置，往下调整更多，避免与AS重叠
        
        const networkNode: Node = {
          id: networkId,
          type: 'group',
          data: { 
              label: name.replace('_', ' '),
            subnet: network.subnet,
              type: 'lan',
              level: level
          },
            position: position,
          style: { 
              width: networkSize.width, 
              height: networkSize.height,
              backgroundColor: level === 0 
                ? 'rgba(144, 238, 144, 0.15)'  // 根网络
                : `rgba(144, 238, 144, ${0.15 + level * 0.05})`, // 子网颜色稍深
            borderRadius: '12px',
            padding: '15px'
          },
            parentId: parentId,
            extent: parentId ? 'parent' : undefined,
          className: 'lan-group'
        };
        
          networkNodes[name] = networkNode;
        processedNodes.push(networkNode);
        
          const gatewayId = `device-${name}-${network.gateway.name}`;
          gatewayIdByNetwork[name] = gatewayId;
        
          if (!(name === 'internal_network' && network.gateway.name === 'testnet_router')) {
          if (!routerIds.has(gatewayId)) {
            routerIds.add(gatewayId);
            processedNodes.push({
              id: gatewayId,
              type: 'routerNode',
              data: { 
                label: network.gateway.name,
                ip: network.gateway.ip,
                interfaces: network.gateway.interfaces,
                diversion: network.gateway.diversion,
                details: network.gateway,
                isGateway: true
              },
                position: { x: 30, y: 30 }, // 路由器位置保持在顶部
              parentId: networkId,
              extent: 'parent',
            });
              
              // 处理路由器接口连接
              if (network.gateway.interfaces && Array.isArray(network.gateway.interfaces)) {
                network.gateway.interfaces.forEach(intf => {
                  if (intf.type === 'domestic') {
                    processedEdges.push({
                      id: `edge-${inwallsCloudId}-${gatewayId}-domestic`,
                      source: inwallsCloudId, // 使用左侧的国内云节点
                      sourceHandle: 'bottom-source', // 从云节点底部出发
                      target: gatewayId,
                      targetHandle: 'top',
                      animated: true,
                      type: 'bezier', // 使用贝塞尔曲线
                      style: { stroke: '#4285F4', strokeWidth: 2 }, // 蓝色线条
                      label: '国内网络连接',
                      labelStyle: { fill: '#4285F4', fontWeight: 'bold', fontSize: 11 },
                      labelBgStyle: { fill: 'rgba(232, 240, 254, 0.8)' },
                      labelBgPadding: [4, 2],
                      labelBgBorderRadius: 4
                    });
                  }
                  else if (intf.type === 'international') {
                    processedEdges.push({
                      id: `edge-${globalCloudId}-${gatewayId}-international`,
                      source: globalCloudId, // 使用右侧的国际云节点
                      sourceHandle: 'bottom-source', // 从云节点底部出发
                      target: gatewayId,
                      targetHandle: 'top',
                      animated: true,
                      type: 'bezier', // 使用贝塞尔曲线
                      style: { stroke: '#4285F4', strokeWidth: 2 }, // 蓝色线条
                      label: '国际网络连接',
                      labelStyle: { fill: '#4285F4', fontWeight: 'bold', fontSize: 11 },
                      labelBgStyle: { fill: 'rgba(232, 240, 254, 0.8)' },
                      labelBgPadding: [4, 2],
                      labelBgBorderRadius: 4
                    });
                  }
                });
              }
            
            if (network.gateway.diversion && network.gateway.diversion.target_type === 'innerserver') {
              const diversion = network.gateway.diversion;
                // 处理target可能是数组的情况
                if (Array.isArray(diversion.target)) {
                  // 如果是CDN回源类型的多目标，只取第一个目标进行处理
                  const targetDeviceName = diversion.target[0];
                  routerDiversions.push({
                    routerId: gatewayId,
                    targetName: targetDeviceName,
                    diversion: diversion
                  });
                } else {
                  // 单个目标的情况
              const targetDeviceName = diversion.target;
              routerDiversions.push({
                routerId: gatewayId,
                targetName: targetDeviceName,
                diversion: diversion
              });
                  
                  // 不再在这里标记为已处理
                  // 等待连接创建后再标记
                }
              }
            }
          }
          
          // 添加设备 - 更合理的设备布局
          if (network.devices && Array.isArray(network.devices)) {
            // 计算每个设备的间距，确保均匀分布
            const deviceSpacing = Math.min(180, Math.max(150, networkSize.width / (network.devices.length + 1))); // 增加间距
            
            // 分类设备：路由器和普通设备
            const regularDevices = network.devices.filter(device => 
              !(name === 'test_network' && device.name === 'testnet_router') && 
              !(device.interfaces !== undefined)
            );
            
            // 处理普通设备 - 放在第二行
            regularDevices.forEach((device: any, deviceIndex: number) => {
              const deviceId = `device-${name}-${device.name}`;
          
          nodeIdMap[device.name] = deviceId;
          
              // 计算水平位置，确保不在路由器的正下方
              const horizontalOffset = 180; // 增加路由器下方空白区域的宽度
              let deviceX;
              
              if (deviceIndex === 0) {
                // 第一个设备放在路由器右侧
                deviceX = horizontalOffset;
              } else {
                // 其他设备均匀分布，并确保最右侧设备有足够的边距
                const effectiveWidth = networkSize.width - horizontalOffset - 100; // 减去100px右侧边距
                deviceX = horizontalOffset + (deviceIndex) * (effectiveWidth / Math.max(1, regularDevices.length - 1));
          }
          
          processedNodes.push({
            id: deviceId,
                type: 'deviceNode',
            data: { 
              label: device.name,
              ip: device.ip,
              interface: device.interface,
              diversion: device.diversion,
              details: device,
              isGateway: false
            },
                position: { x: deviceX, y: 160 }, // 在第二行显示，增加Y坐标到160，给它们更多垂直空间
            parentId: networkId,
            extent: 'parent',
          });
          
          processedEdges.push({
            id: `edge-${gatewayId}-${deviceId}`,
            source: gatewayId,
            target: deviceId,
            animated: false,
                type: 'bezier', // 使用贝塞尔曲线
            style: { stroke: '#b1b1b7' }
          });
          
              // 处理设备的外部服务器分流
          if (device.diversion && device.diversion.target_type === 'outerserver') {
                // 确保网关的云连接存在
            const cloudEdge = processedEdges.find(edge => 
              edge.source === inwallsCloudId && edge.target === 'device-internal_network-internal_router'
            );
            
            if (cloudEdge) {
              const diversionEdgeId = `edge-diversion-${deviceId}-${gatewayId}`;
              const edgeIndex = processedEdges.findIndex(edge => edge.id === `edge-${gatewayId}-${deviceId}`);
              
              if (edgeIndex !== -1) {
                    // 特殊处理: 如果gateway是home_openwrt并且diversionType是external，使用紫色样式
                    let strokeColor = '#4285F4';  // 默认蓝色
                    let strokeDasharray = undefined;
                    let label = device.diversion.label || '外部服务器';
                    
                    // 如果是外部分流，使用紫色样式
                    if (device.diversion.traffic_type === 'external') {
                      strokeColor = '#9C27B0'; // 紫色
                      strokeDasharray = '5, 5';
                      label = device.diversion.label || '外部分流';
                      
                      // 标记为已处理的外部分流
                      handledExternalDiversionDevices.add(deviceId);
                    }
                    
                processedEdges[edgeIndex] = {
                  ...processedEdges[edgeIndex],
                  id: diversionEdgeId,
                  animated: true,
                      // 对于外部分流，修正连接点设置
                      sourceHandle: device.diversion.traffic_type === 'external' ? 'bottom-source' : undefined,
                      targetHandle: device.diversion.traffic_type === 'external' ? 'top' : undefined,
                      style: { 
                        stroke: strokeColor, 
                        strokeWidth: 2,
                        strokeDasharray 
                      },
                      label: label,
                      labelStyle: { fill: strokeColor, fontWeight: 'bold', fontSize: 11 },
                      labelBgStyle: { fill: strokeColor === '#4285F4' ? 'rgba(232, 240, 254, 0.8)' : 'rgba(240, 225, 255, 0.8)' },
                  labelBgPadding: [4, 2],
                  labelBgBorderRadius: 4
                };
              }
            }
          }
        });
        
            // 处理内部路由器设备，但不包括主路由器
            network.devices.forEach((device: any, deviceIndex: number) => {
              if (name === 'test_network' && device.name === 'testnet_router') {
                return;
              }
              
              const isRouter = device.interfaces !== undefined;
              if (!isRouter) {
                return; // 跳过已处理的普通设备
              }
              
              const deviceId = `device-${name}-${device.name}`;
              
              nodeIdMap[device.name] = deviceId;
              
              if (routerIds.has(deviceId)) {
                return;
              }
              
              routerIds.add(deviceId);
              
              // 路由器放在对应的位置
              const routerX = 30 + deviceIndex * 200; // 路由器间距加大
              
              processedNodes.push({
                id: deviceId,
                type: 'routerNode',
                data: { 
                  label: device.name,
                  ip: device.ip,
                  interfaces: device.interfaces,
                  interface: device.interface,
                  diversion: device.diversion,
                  details: device,
                  isGateway: false
                },
                position: { x: routerX, y: 30 }, // 在顶部和主路由器同一行
                parentId: networkId,
                extent: 'parent',
              });
              
              processedEdges.push({
                id: `edge-${gatewayId}-${deviceId}`,
                source: gatewayId,
                target: deviceId,
                animated: false,
                type: 'bezier', // 使用贝塞尔曲线
                style: { stroke: '#b1b1b7' }
              });
            });
          }
          
          // 递归处理子网 - 更合理的子网布局
          if (childNetworksMap[name]) {
            const childCount = childNetworksMap[name].length;
            // 调整子网间的间距，确保它们不会太靠近边缘
            const childSpacing = (networkSize.width - 100) / (childCount + 1); // 减去100px边距
            
            childNetworksMap[name].forEach((childName, childIndex) => {
              const childData = privateNetworks[childName];
              
              // 水平分布子网，避免重叠，增加更多空间
              const childXPosition = childIndex * childSpacing + 50; // 增加水平起始位置到50
              
              createNetworkNode(childName, childData, childIndex, networkId, level + 1);
              
              // 调整子网的位置到第三行
              const childNetworkNode = networkNodes[childName];
              if (childNetworkNode) {
                childNetworkNode.position = { 
                  x: childXPosition, 
                  y: 280 // 子网固定在第三行，位置更低
                };
              }
              
              // 添加从父网关到子网关的连接
              const parentGatewayId = gatewayIdByNetwork[name];
              const childGatewayId = gatewayIdByNetwork[childName];
              
              if (parentGatewayId && childGatewayId) {
                processedEdges.push({
                  id: `edge-subnet-${parentGatewayId}-${childGatewayId}`,
                  source: parentGatewayId,
                  sourceHandle: 'bottom-source',
                  target: childGatewayId,
                  targetHandle: 'top',
                  animated: true,
                  type: 'bezier', // 使用贝塞尔曲线
                  style: { stroke: '#4CAF50', strokeWidth: 2 },
                  label: '子网连接',
                  labelStyle: { fill: '#4CAF50', fontWeight: 'bold', fontSize: 11 },
                  labelBgStyle: { fill: 'rgba(232, 245, 233, 0.8)' },
                  labelBgPadding: [4, 2],
                  labelBgBorderRadius: 4
                });
              }
            });
          }
        };
        
        // 处理根网络及其所有子网
        createNetworkNode(networkName, networkData, 0);
        
        // 更新下一个根网络的位置
        const currentNetworkNode = networkNodes[networkName];
        if (currentNetworkNode && currentNetworkNode.style) {
          networkStartX += (currentNetworkNode.style.width as number) + networkSpacing;
        } else {
          networkStartX += 350; // 默认间距
        }
      }
      
      // 处理接口类型连接，除了已经作为子网处理的网络
      for (const [networkName, networkData] of Object.entries(privateNetworks)) {
        // 跳过已经作为子网处理的网络
        if (parentNetworkMap[networkName]) {
          continue;
        }
        
        const network = networkData as any;
        const currentGatewayId = gatewayIdByNetwork[networkName];
        
        if (network.gateway.interfaces && Array.isArray(network.gateway.interfaces)) {
          // 处理非子网接口类型
          network.gateway.interfaces.forEach(intf => {
            // 跳过导致子网关系的接口类型
            if (intf.type && Object.keys(privateNetworks).includes(intf.type)) {
              return;
            }
            
            // 处理两种情况：网络类型接口和设备类型接口
            if (intf.type) {
              let targetNodeId = null;
              
              // 1. 检查是否是网络网关
              if (gatewayIdByNetwork[intf.type]) {
                targetNodeId = gatewayIdByNetwork[intf.type];
              } 
              // 2. 检查是否是设备节点
              else {
                // 查找设备节点
                const deviceNode = processedNodes.find(node => 
                  node.id.includes(intf.type) || // 匹配设备名称
                  (node.data?.label === intf.type) // 匹配设备标签
                );
                if (deviceNode) {
                  targetNodeId = deviceNode.id;
                }
              }
              
              // 如果找到目标节点，创建连接
              if (targetNodeId && currentGatewayId && networkName !== intf.type) {
                processedEdges.push({
                  id: `edge-${targetNodeId}-${currentGatewayId}-${intf.type}`,
                  source: targetNodeId,
                  sourceHandle: 'bottom-source',
                  target: currentGatewayId,
                  targetHandle: 'top',
                  animated: true,
                  type: 'bezier',
                  style: { stroke: '#4CAF50', strokeWidth: 2 },
                  label: `${intf.type.replace('_', ' ')}内部连接`,
                  labelStyle: { fill: '#4CAF50', fontWeight: 'bold', fontSize: 11 },
                  labelBgStyle: { fill: 'rgba(232, 245, 233, 0.8)' },
                  labelBgPadding: [4, 2],
                  labelBgBorderRadius: 4
                });
              }
            }
          });
        }
      }
      
      // 特殊处理 test_network 和 internal_network 关系
      if (networkNodes['test_network'] && networkNodes['internal_network']) {
        const testNetworkNode = networkNodes['test_network'];
        const internalNetworkNode = networkNodes['internal_network'];
        
        // 调整internal_network大小以适应其子网
        if (internalNetworkNode.style) {
          const childSize = testNetworkNode.style?.width || 450;
          internalNetworkNode.style.width = Math.max(internalNetworkNode.style.width as number, (childSize as number) + 200); // 增加更多宽度
          internalNetworkNode.style.height = Math.max(internalNetworkNode.style.height as number, 650); // 大幅增加高度
        }
        
        // 更合理的子网位置
        testNetworkNode.position = { x: 80, y: 300 };
        testNetworkNode.parentId = internalNetworkNode.id;
        testNetworkNode.extent = 'parent';
      }
      
      // 连接到云的特殊边
      const internalRouterNode = processedNodes.find(node => 
        node.id === 'device-internal_network-internal_router'
      );
      
      if (internalRouterNode) {
        processedEdges.push({
          id: 'edge-cloud-internal',
          source: inwallsCloudId,
          sourceHandle: 'bottom-source', // 从云节点底部出发
          target: internalRouterNode.id,
          targetHandle: 'top',
          animated: true,
          type: 'bezier', // 使用贝塞尔曲线
          style: { stroke: '#4285F4', strokeWidth: 2 }, // 蓝色线条
          label: 'Internet Connection'
        });
      }
      
      // 网络间的内部连接
      const internalNetworkRouter = processedNodes.find(node => 
        node.id === 'device-internal_network-internal_router'
      );
      
      const testNetworkRouter = processedNodes.find(node => 
        node.id === 'device-test_network-testnet_router'
      );
      
      if (internalNetworkRouter && testNetworkRouter) {
        processedEdges.push({
          id: 'edge-internal-test',
          source: internalNetworkRouter.id,
          target: testNetworkRouter.id,
          animated: true,
          type: 'bezier', // 使用贝塞尔曲线
          style: { stroke: '#9C27B0', strokeWidth: 2 },
          label: '内网连接'
        });
      }
      
      // 路由分流连接
      routerDiversions.forEach(({routerId, targetName, diversion}) => {
        // 调试信息
        console.log(`处理路由分流: ${routerId}, 目标: ${targetName}, 类型: ${diversion.traffic_type}`);
        
        // 打印出所有节点以便调试
        if (targetName === 'server0') {
          console.log('查找server0节点，所有节点ID:');
          processedNodes.forEach(node => {
            if (node.id.includes('server0') || node.id.includes('AS4') || node.id.includes('AS40')) {
              console.log(`  - ${node.id}`);
            }
          });
        }
        
        // 如果是外部分流类型且已被处理，则跳过
        const isExternalDiversion = diversion.traffic_type === 'external';
        if (isExternalDiversion && handledExternalDiversionDevices.has(routerId)) {
          return;
        }
        
        const targetNode = processedNodes.find(n => {
          const targetId = nodeIdMap[targetName] || targetName;
          return n.id === targetId || n.id.endsWith(`-${targetName}`);
        });
        
        // 对于server0目标，使用更宽松的搜索
        if (!targetNode && targetName === 'server0') {
          const server0Node = processedNodes.find(n => 
            n.id.includes('server0') || 
            (n.data?.label === 'server0')
          );
          
          if (server0Node) {
            console.log(`使用备用方法找到server0节点: ${server0Node.id}`);
            
            // 创建边 - 恢复正确方向：从server0Node到routerId
          processedEdges.push({
              id: `edge-diversion-router-${routerId}-${server0Node.id}`,
              source: server0Node.id,              // 恢复：将源设为服务器节点ID
              sourceHandle: 'bottom-source',
              target: routerId,                    // 恢复：将目标设为路由器ID
            targetHandle: 'top',
            animated: true,
              type: 'bezier', // 使用贝塞尔曲线
            style: { stroke: '#9C27B0', strokeWidth: 2, strokeDasharray: '5, 5' },
              label: diversion.label || (isExternalDiversion ? '外部分流' : '路由分流'),
            labelStyle: { fill: '#9C27B0', fontWeight: 'bold', fontSize: 11 },
            labelBgStyle: { fill: 'rgba(240, 225, 255, 0.8)' },
            labelBgPadding: [4, 2],
            labelBgBorderRadius: 4
          });
            
            if (isExternalDiversion) {
              handledExternalDiversionDevices.add(routerId);
            }
            
            return;
          }
        }
        
        if (targetNode) {
          // 对于外部分流类型，使用紫色线条
          const strokeColor = isExternalDiversion ? '#9C27B0' : '#9C27B0';
          
          // 创建边 - 恢复正确方向：从targetNode到routerId
          processedEdges.push({
            id: `edge-diversion-router-${routerId}-${targetNode.id}`,
            source: targetNode.id,              // 恢复：将源设为目标节点ID
            sourceHandle: 'bottom-source',
            target: routerId,                   // 恢复：将目标设为路由器ID
            targetHandle: 'top',
            animated: true,
            type: 'bezier', // 使用贝塞尔曲线
            style: { stroke: strokeColor, strokeWidth: 2, strokeDasharray: '5, 5' },
            label: diversion.label || (isExternalDiversion ? '外部分流' : '路由分流'),
            labelStyle: { fill: strokeColor, fontWeight: 'bold', fontSize: 11 },
            labelBgStyle: { fill: 'rgba(240, 225, 255, 0.8)' },
            labelBgPadding: [4, 2],
            labelBgBorderRadius: 4
          });
          
          // 创建连接后标记为已处理
          if (isExternalDiversion) {
            handledExternalDiversionDevices.add(routerId);
          }
          
          console.log(`创建路由分流连接: ${targetNode.id} -> ${routerId}, 类型: ${diversion.traffic_type}`);
        } else {
          console.log(`未找到路由分流目标节点: ${targetName}, 路由器: ${routerId}`);
        }
      });

      // 设备分流连接
      processedNodes.forEach(node => {
        if (node.data?.diversion) {
          const diversion = node.data.diversion as DiversionConfig;
          
          // 检查是否为外部分流且已处理过
          const isHandledExternalDiversion = 
            diversion.traffic_type === 'external' && 
            handledExternalDiversionDevices.has(node.id);
            
          // 跳过已处理的外部分流
          if (isHandledExternalDiversion) {
            return;
          }
          
          if (diversion.target_type === 'innerserver') {
            // 处理CDN回源类型的多目标情况
            if (diversion.traffic_type === 'cdn' && Array.isArray(diversion.target)) {
              console.log(`处理CDN回源: ${node.id}, 目标: ${diversion.target.join(', ')}`);
              
              // 为每个目标创建连接
              diversion.target.forEach((targetName, index) => {
                // 改进目标节点查找逻辑，更宽松的匹配方式
            const targetNode = processedNodes.find(n => {
                  // 检查所有可能的ID格式
                  return n.id === targetName || 
                         n.id === `device-AS31898-${targetName}` || 
                         n.id.includes(targetName) ||
                         n.id.endsWith(`-${targetName}`) || 
                         (n.data?.label === targetName);
            });
            
            if (targetNode) {
                  console.log(`找到目标节点: ${targetNode.id}`);
                  // 从源站上方到边缘节点下方的双向连接
              processedEdges.push({
                    id: `edge-cdn-regular-${node.id}-${targetNode.id}-${index}`,
                source: node.id,
                    sourceHandle: 'top', // 从源站上方出发
                target: targetNode.id,
                    targetHandle: 'bottom-target', // 到边缘节点下方
                animated: true,
                    type: 'straight', // 使用直线代替贝塞尔曲线
                    style: { 
                      stroke: '#FF5722', // 更亮的橙色，而不是灰色
                      strokeWidth: 6,     // 更粗的线条
                      strokeDasharray: '8,4' // 更明显的虚线
                    }, 
                    label: `${diversion.label || 'CDN回源'}`,
                    labelStyle: { fill: '#FF5722', fontWeight: 'bold', fontSize: 14 },
                    labelBgStyle: { fill: 'rgba(255, 245, 230, 0.9)' }, // 更高对比度的背景
                    labelBgPadding: [8, 4] as [number, number], // 更大的标签填充
                    labelBgBorderRadius: 4,
                    zIndex: 9999 // 确保高z-index
                  });
                } else {
                  console.log(`未找到目标节点: ${targetName}`);
                  
                  // 尝试一个更宽松的搜索
                  const looseMatchNode = processedNodes.find(n => 
                    (n.id.includes('oracle') && (n.id.includes('dubai') || n.id.includes('osaka'))) ||
                    (n.data?.label && String(n.data.label).includes('oracle'))
                  );
                  
                  if (looseMatchNode) {
                    console.log(`使用宽松匹配找到节点: ${looseMatchNode.id}`);
                    processedEdges.push({
                      id: `edge-cdn-loose-${node.id}-${looseMatchNode.id}-${index}`,
                      source: node.id,
                      sourceHandle: 'top', // 从源站上方出发
                      target: looseMatchNode.id,
                      targetHandle: 'bottom-target', // 到边缘节点下方
                      animated: true,
                      type: 'bezier', // 使用贝塞尔曲线
                      style: { stroke: '#888888', strokeWidth: 2, strokeDasharray: '5,2,2,2' }, // 灰色细线且使用双虚线
                      label: `${diversion.label || 'CDN回源'}`,
                      labelStyle: { fill: '#888888', fontWeight: 'bold', fontSize: 12 },
                      labelBgStyle: { fill: 'rgba(242, 242, 242, 0.9)' },
                      labelBgPadding: [4, 2],
                      labelBgBorderRadius: 4
                    });
                  } else {
                    // 尝试查找无法匹配的目标节点的ID
                    console.log('无法找到Oracle节点。');
                  }
                }
              });
            } else if (diversion.traffic_type === 'external') {
              // external流量类型只显示一条紫色线到出口服务器
              const targetNode = processedNodes.find(n => {
                const targetId = nodeIdMap[diversion.target as string] || diversion.target;
                return n.id === targetId || n.id.endsWith(`-${diversion.target}`);
              });
              
              if (targetNode) {
                processedEdges.push({
                  id: `edge-diversion-${node.id}-${targetNode.id}`,
                  source: targetNode.id,           // 修改：将源设为目标节点（target）
                  sourceHandle: 'bottom-source',   // 从目标节点底部出发
                  target: node.id,                // 修改：将目标设为当前节点
                  targetHandle: 'top',            // 到当前节点顶部
                  animated: true,
                  type: 'bezier', // 使用贝塞尔曲线
                  style: { stroke: '#9C27B0', strokeWidth: 2, strokeDasharray: '5, 5' }, // 紫色线条
                  label: diversion.label || '外部分流',
                  labelStyle: { fill: '#9C27B0', fontWeight: 'bold', fontSize: 11 },
                  labelBgStyle: { fill: 'rgba(240, 225, 255, 0.8)' },
                  labelBgPadding: [4, 2],
                  labelBgBorderRadius: 4
                });
              }
            } else {
              // 原有的单目标处理逻辑
              const targetNode = processedNodes.find(n => {
                const targetId = nodeIdMap[diversion.target as string] || diversion.target;
                return n.id === targetId || n.id.endsWith(`-${diversion.target}`);
              });
              
              if (targetNode) {
                processedEdges.push({
                  id: `edge-diversion-${node.id}-${targetNode.id}`,
                  source: targetNode.id,         // 修改：将源设为目标节点
                  sourceHandle: 'bottom-source',  // 从目标节点底部出发
                  target: node.id,              // 修改：将目标设为当前节点
                  targetHandle: 'top',           // 到当前节点顶部
                  animated: true,
                  type: 'bezier', // 使用贝塞尔曲线
                  style: { stroke: '#9C27B0', strokeWidth: 2, strokeDasharray: '5, 5' }, // 紫色线条
                  label: diversion.label || '外部分流',
                  labelStyle: { fill: '#9C27B0', fontWeight: 'bold', fontSize: 11 },
                  labelBgStyle: { fill: 'rgba(240, 225, 255, 0.8)' },
                labelBgPadding: [4, 2],
                labelBgBorderRadius: 4
              });
              
              const targetCloudId = diversion.internet_type === 'domestic' ? inwallsCloudId : globalCloudId;
              
              const edgeExists = processedEdges.some(edge => 
                edge.source === targetCloudId && edge.target === targetNode.id
              );
              
              if (!edgeExists) {
                processedEdges.push({
                  id: `edge-${targetCloudId}-${targetNode.id}`,
                  source: targetCloudId,
                    sourceHandle: 'bottom-source', // 从云节点底部出发
                  target: targetNode.id,
                  targetHandle: 'top',
                  animated: true,
                    type: 'bezier', // 使用贝塞尔曲线
                    style: { stroke: '#4285F4', strokeWidth: 2 }, // 蓝色线条
                  label: '专线连接',
                    labelStyle: { fill: '#4285F4', fontWeight: 'bold', fontSize: 11 },
                    labelBgStyle: { fill: 'rgba(232, 240, 254, 0.8)' },
                  labelBgPadding: [4, 2],
                  labelBgBorderRadius: 4
                });
                }
              }
            }
          }
        }
      });

      // 特殊连接
      const device3Node = processedNodes.find(node => node.id === 'device-AS2-device3');
      const internalServerNode = processedNodes.find(node => node.id === 'device-internal_network-internal_server');
      
      if (device3Node && internalServerNode) {
        processedEdges.push({
          id: `edge-diversion-${device3Node.id}-${internalServerNode.id}`,
          source: device3Node.id,
          sourceHandle: 'bottom-source',
          target: internalServerNode.id,
          targetHandle: 'top',
          animated: true,
          type: 'bezier', // 使用贝塞尔曲线
          style: { stroke: '#9C27B0', strokeWidth: 2 },
          label: '专线分流',
          labelStyle: { fill: '#9C27B0', fontWeight: 'bold', fontSize: 11 },
          labelBgStyle: { fill: 'rgba(240, 225, 255, 0.8)' },
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 4
        });
      }
      
      const testnetRouterNode = processedNodes.find(node => node.id === 'device-test_network-testnet_router');
      if (testnetRouterNode && device3Node && testnetRouterNode.data?.diversion) {
        const diversion = testnetRouterNode.data.diversion as DiversionConfig;
        
        processedEdges.push({
          id: `edge-diversion-${testnetRouterNode.id}-${device3Node.id}`,
          source: device3Node.id,
          sourceHandle: 'bottom-source',
          target: testnetRouterNode.id,
          targetHandle: 'top',
          animated: true,
          type: 'bezier', // 使用贝塞尔曲线
          style: { stroke: '#9C27B0', strokeWidth: 2, strokeDasharray: '5, 5' },
          label: diversion.label || '路由分流',
          labelStyle: { fill: '#9C27B0', fontWeight: 'bold', fontSize: 11 },
          labelBgStyle: { fill: 'rgba(240, 225, 255, 0.8)' },
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 4
        });
      }

      // 确保为rdch-server-ubuntu创建CDN回源连接 - 特殊处理
      const ubuntuServerNode = processedNodes.find(node => node.id === 'device-home_server_network-rdch-server-ubuntu');
      
      if (ubuntuServerNode && ubuntuServerNode.data?.diversion) {
        const diversion = ubuntuServerNode.data.diversion as DiversionConfig;
        
        if (diversion.traffic_type === 'cdn' && Array.isArray(diversion.target)) {
          console.log('找到Ubuntu服务器节点，处理CDN回源连接', ubuntuServerNode.id);
          console.log('CDN回源目标节点名称:', diversion.target);
          
          // 打印所有节点ID以便调试
          console.log('所有节点ID:');
          processedNodes.forEach(node => {
            console.log(`  - ${node.id} (${node.data?.label || 'unknown'})`);
          });
          
          // 查找所有可能的Oracle节点，使用更宽松的匹配条件
          const oracleNodes = processedNodes.filter(node => 
            node.id.includes('oracle') || 
            node.id.includes('dubai') || 
            node.id.includes('osaka') ||
            (node.data?.label && 
              (String(node.data.label).includes('oracle') || 
               String(node.data.label).includes('dubai') || 
               String(node.data.label).includes('osaka')))
          );
          
          console.log('找到Oracle节点数量:', oracleNodes.length);
          console.log('Oracle节点:', oracleNodes.map(n => n.id));
          
          if (oracleNodes.length > 0) {
            // 首先删除之前的CDN连接，避免重复
            const cdnEdgeIdsToRemove = processedEdges
              .filter(edge => edge.id.includes('edge-cdn-') && 
                              (edge.source === ubuntuServerNode.id || 
                              edge.target === ubuntuServerNode.id))
              .map(edge => edge.id);
            
            if (cdnEdgeIdsToRemove.length > 0) {
              console.log('删除已有的CDN连接:', cdnEdgeIdsToRemove);
              // 过滤掉这些边，使用数组方法而不是重新赋值
              for (let i = processedEdges.length - 1; i >= 0; i--) {
                if (cdnEdgeIdsToRemove.includes(processedEdges[i].id)) {
                  processedEdges.splice(i, 1);
                }
              }
            }
            
            // 添加直接连接
            oracleNodes.forEach((oracleNode, index) => {
              console.log(`创建CDN回源连接: ${ubuntuServerNode.id} -> ${oracleNode.id}`);
              
              // 创建一个唯一的ID，确保不会有重复
              const edgeId = `edge-cdn-direct-${ubuntuServerNode.id}-${oracleNode.id}-${index}`;
              
              // 从源站上方到边缘节点下方的CDN连接
              const newEdge = {
                id: edgeId,
                source: ubuntuServerNode.id,
                sourceHandle: 'top', // 从源站上方出发
                target: oracleNode.id,
                targetHandle: 'bottom-target', // 到边缘节点下方
                animated: true, // 启用动画效果
                type: 'bezier', // 贝塞尔曲线
                style: { 
                  stroke: '#888888', // 灰色
                  strokeWidth: 0.5,  // 更细的线宽
                  strokeDasharray: '5,2', // 虚线样式
                  opacity: 0.6,      // 不透明度
                  animation: 'dash 1s linear infinite' // 添加CSS动画效果
                }, 
                zIndex: -10, // 放到最底层
                className: 'cdn-animated-path' // 添加类名以便CSS选择器匹配
              };
              
              processedEdges.push(newEdge);
            });
            
            // 为了更清晰地显示CDN架构，添加标记Oracle节点为CDN边缘站点
            oracleNodes.forEach((oracleNode) => {
              if (oracleNode.data) {
                oracleNode.data.isCdnEdge = true;
              }
            });
            
            // 标记Ubuntu服务器为CDN源站
            if (ubuntuServerNode.data) {
              ubuntuServerNode.data.isCdnOrigin = true;
            }
          } else {
            console.log('未找到Oracle节点。所有节点:', processedNodes.map(n => n.id).join(', '));
          }
        }
      }

      // 特殊处理：确保CDN连接在最后添加，并使用更明显的样式
      // 查找所有CDN源站和目标节点
      const cdnSourceNodes = processedNodes.filter(node => 
        node.data?.diversion && 
        (node.data.diversion as DiversionConfig).traffic_type === 'cdn' && 
        Array.isArray((node.data.diversion as DiversionConfig).target)
      );
      
      console.log('找到CDN源站节点数量:', cdnSourceNodes.length);
      console.log('查看所有CDN源站节点:', cdnSourceNodes.map(n => n.id));
      
      // 为了直接测试CDN连接是否显示，添加一个直接的连接测试
      const homeServerUbuntu = processedNodes.find(node => node.id === 'device-home_server_network-rdch-server-ubuntu');
      const oracleNodes = processedNodes.filter(node => 
        node.id.includes('oracle') || 
        node.id.includes('dubai') || 
        node.id.includes('osaka')
      );
      
      if (homeServerUbuntu && oracleNodes.length > 0) {
        console.log('== 强制添加CDN连线用于测试 ==');
        console.log('Ubuntu服务器ID:', homeServerUbuntu.id);
        console.log('Oracle节点IDs:', oracleNodes.map(n => n.id));
        
        // 移除所有之前可能存在的CDN连接
        for (let i = processedEdges.length - 1; i >= 0; i--) {
          if (processedEdges[i].id.includes('edge-cdn-')) {
            processedEdges.splice(i, 1);
          }
        }
        
        // 添加明显的测试连接
        oracleNodes.forEach((oracleNode, index) => {
          const testEdgeId = `edge-cdn-test-${Date.now()}-${index}`;
          console.log(`添加测试CDN连线: ${testEdgeId}, 源: ${homeServerUbuntu.id}, 目标: ${oracleNode.id}`);
          
          processedEdges.push({
            id: testEdgeId,
            source: homeServerUbuntu.id,
            target: oracleNode.id,
            // 使用贝塞尔曲线
            type: 'bezier',
            animated: true, // 启用动画效果
            style: {
              stroke: '#888888', // 灰色线条
              strokeWidth: 0.5,  // 更细的线宽
              strokeDasharray: '5,2',
              opacity: 0.6,      // 降低不透明度
              animation: 'dash 1s linear infinite' // 添加CSS动画效果
            },
            zIndex: -10 // 放到最底层
          });
          
          // 标记节点为CDN源站和边缘站点
          if (homeServerUbuntu.data) {
            homeServerUbuntu.data.isCdnOrigin = true;
          }
          
          if (oracleNode.data) {
            oracleNode.data.isCdnEdge = true;
          }
        });
      }
      
      if (cdnSourceNodes.length > 0) {
        // 特别处理rdch-server-ubuntu到Oracle节点的连接
        const ubuntuServerNode = processedNodes.find(node => 
          node.id === 'device-home_server_network-rdch-server-ubuntu'
        );
        
        if (ubuntuServerNode) {
          // 获取所有Oracle节点
          const oracleNodes = processedNodes.filter(node => 
            node.id.includes('oracle') || 
            node.id.includes('dubai') || 
            node.id.includes('osaka') ||
            (node.data?.label && 
              (String(node.data.label).includes('oracle') || 
               String(node.data.label).includes('dubai') || 
               String(node.data.label).includes('osaka')))
          );
          
          console.log('找到Oracle节点数量:', oracleNodes.length);
          
          if (oracleNodes.length > 0) {
            // 确保每个Oracle节点与rdch-server-ubuntu有连接
            oracleNodes.forEach((oracleNode, index) => {
              // 创建一个唯一的边ID
              const edgeId = `edge-cdn-final-direct-${ubuntuServerNode.id}-${oracleNode.id}-${index}`;
              
              // 检查是否已存在相同连接的边（不只是相同ID）
              const existingEdge = processedEdges.find(e => 
                e.source === ubuntuServerNode.id && 
                e.target === oracleNode.id
              );
              
              // 如果不存在，则添加新边
              if (!existingEdge) {
                console.log(`在最终处理中添加CDN连接: ${ubuntuServerNode.id} -> ${oracleNode.id}`);
                
                processedEdges.push({
                  id: edgeId,
                  source: ubuntuServerNode.id,
                  sourceHandle: 'top',
                  target: oracleNode.id,
                  targetHandle: 'bottom-target',
                  animated: true, // 启用动画效果
                  type: 'bezier', // 贝塞尔曲线
                  style: { 
                    stroke: '#888888', 
                    strokeWidth: 0.5,  // 更细的线宽
                    strokeDasharray: '5,2', // 虚线样式
                    opacity: 0.6,      // 不透明度
                    animation: 'dash 1s linear infinite' // 添加CSS动画效果
                  },
                  zIndex: -10, // 放到最底层
                  className: 'cdn-animated-path' // 添加类名以便CSS选择器匹配
                });
                
                // 标记节点
                if (ubuntuServerNode.data) {
                  ubuntuServerNode.data.isCdnOrigin = true;
                }
                
                if (oracleNode.data) {
                  oracleNode.data.isCdnEdge = true;
                }
              }
            });
          }
        }
        
        // 处理其他CDN源站
        cdnSourceNodes.forEach(sourceNode => {
          // 如果是rdch-server-ubuntu则跳过，因为已经特殊处理过了
          if (sourceNode.id === 'device-home_server_network-rdch-server-ubuntu') {
            return;
          }
          
          const diversion = sourceNode.data?.diversion as DiversionConfig;
          if (!diversion?.target) return;
          
          const targets = diversion.target as string[];
          console.log(`处理CDN源站 ${sourceNode.id} 的连接，目标数量: ${targets.length}`);
          
          targets.forEach((targetName, index) => {
            // 查找目标节点
            const targetNode = processedNodes.find(n => 
              n.id.includes(targetName) || 
              n.id.endsWith(`-${targetName}`) || 
              (n.data?.label === targetName)
            );
            
            if (targetNode) {
              console.log(`创建CDN连接: ${sourceNode.id} -> ${targetNode.id}`);
              
              // 创建一个唯一的边ID
              const edgeId = `edge-cdn-final-${sourceNode.id}-${targetNode.id}-${index}`;
              
              // 检查是否已存在相同ID的边
              const existingEdgeIndex = processedEdges.findIndex(e => e.id === edgeId);
              
              // 如果已存在，则替换；否则添加新边
              const newEdge: Edge = {
                id: edgeId,
                source: sourceNode.id,
                sourceHandle: 'top',
                target: targetNode.id,
                targetHandle: 'bottom-target',
                animated: true, // 启用动画效果
                type: 'bezier', // 贝塞尔曲线
                style: { 
                  stroke: '#888888', 
                  strokeWidth: 0.5,  // 更细的线宽
                  strokeDasharray: '5,2', // 虚线样式
                  opacity: 0.6,      // 不透明度
                  animation: 'dash 1s linear infinite' // 添加CSS动画效果
                },
                zIndex: -10, // 放到最底层
                className: 'cdn-animated-path' // 添加类名以便CSS选择器匹配
              };
              
              if (existingEdgeIndex >= 0) {
                processedEdges[existingEdgeIndex] = newEdge;
              } else {
                processedEdges.push(newEdge);
              }
              
              // 标记节点
              if (sourceNode.data) {
                sourceNode.data.isCdnOrigin = true;
              }
              
              if (targetNode.data) {
                targetNode.data.isCdnEdge = true;
              }
            }
          });
        });
      }

      // 检查所有CDN连接并输出日志
      const cdnEdges = processedEdges.filter(edge => 
        edge.id.includes('edge-cdn-')
      );
      
      console.log(`==== 最终创建的CDN连接数量: ${cdnEdges.length} ====`);
      cdnEdges.forEach(edge => {
        console.log(`CDN连接: ${edge.id}, 源: ${edge.source}, 目标: ${edge.target}, 类型: ${edge.type}`);
      });

      // 在所有处理结束后，强制添加固定的CDN连接，确保连线的显示
      const finalUbuntuNode = processedNodes.find(n => n.id === 'device-home_server_network-rdch-server-ubuntu');
      const finalOracleNodes = processedNodes.filter(n => 
        n.id.includes('oracle') || n.id.includes('dubai') || n.id.includes('osaka')
      );
      
      if (finalUbuntuNode && finalOracleNodes.length > 0) {
        console.log("=== 在最终阶段添加固定CDN连线 ===");
        finalOracleNodes.forEach((oracleNode, index) => {
          // 使用静态固定ID，避免任何ID冲突
          const staticEdgeId = `static-cdn-edge-${index}`;
          
          // 移除可能已存在的同ID边
          const existingEdgeIndex = processedEdges.findIndex(e => e.id === staticEdgeId);
          if (existingEdgeIndex >= 0) {
            processedEdges.splice(existingEdgeIndex, 1);
          }
          
          // 添加新的固定边
          processedEdges.push({
            id: staticEdgeId,
            source: finalUbuntuNode.id,
            target: oracleNode.id,
            // 使用贝塞尔曲线代替直线
            type: 'bezier',
            animated: true, // 启用动画效果
            style: {
              stroke: '#888888', // 灰色线条
              strokeWidth: 0.5,    // 降低线宽
              strokeDasharray: '5,2',
              opacity: 0.6,      // 降低不透明度
              animation: 'dash 1s linear infinite' // 添加CSS动画效果
            },
            zIndex: -10, // 放到最底层
            className: 'cdn-animated-path' // 添加类名以便CSS选择器匹配
          });
          
          // 继续标记节点为CDN源站和边缘站点
          if (finalUbuntuNode.data) {
            finalUbuntuNode.data.isCdnOrigin = true;
          }
          
          if (oracleNode.data) {
            oracleNode.data.isCdnEdge = true;
          }
        });
      }

      // 为home_server_network提供更多空间，因为它可能有更多设备
      if (networkNodes['home_server_network']) {
        const homeServerNetworkNode = networkNodes['home_server_network'];
        if (homeServerNetworkNode.style) {
          homeServerNetworkNode.style.height = Math.max(homeServerNetworkNode.style.height as number, 500);
          homeServerNetworkNode.style.width = Math.max(homeServerNetworkNode.style.width as number, 800); // 大幅增加宽度
        }
      }

      setNodes(processedNodes);
      setEdges(processedEdges);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error processing network data'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { nodes, edges, isLoading, error };
}
