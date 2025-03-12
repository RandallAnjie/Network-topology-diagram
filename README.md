# 网络可视化工具 (Network-topology-diagram)

## 项目概述

这是一个网络拓扑可视化工具，主要是展示我自己本人的服务器架构情况。该工具能够直观地呈现自治系统(AS)、局域网(LAN)、服务器和设备之间的关系及其流量路径。

## 主要功能

- **多层次网络结构展示**：
    - 国际互联网和国内互联网云节点
    - 自治系统(AS)节点及其内部设备
    - 局域网(LAN)及嵌套子网结构
    - 服务器和路由器设备

- **连接关系可视化**：
    - 互联网到AS的连接
    - 不同网络之间的连接
    - 设备间的流量分流路径
    - CDN回源连接

- **交互式操作**：
    - 缩放和平移视图
    - 节点拖拽与重排
    - 点击查看节点详细信息

- **样式定制**：
    - 不同类型网络的视觉差异化
    - 各类连接的独特样式
    - 自适应布局算法

## 技术栈

- React + TypeScript
- Vite
- @xyflow/react（基于React Flow的网络流图库）
- JSON配置驱动的网络模型
- Tailwind CSS

## 安装与运行

### 环境要求

- Node.js 14.x 或更高版本
- npm 7.x 或更高版本

### 安装步骤

1. 克隆代码库
```bash
git clone https://github.com/RandallAnjie/Network-topology-diagram.git
cd Network-topology-diagram
```

2. 安装依赖
```bash
npm install
```

3. 本地开发运行
```bash
npm run dev
```

4. 构建生产版本
```bash
npm run build
```

## 使用方法

### 配置网络数据

网络配置存储在 `src/data/network-config.json` 文件中。您可以修改此文件来定义自己的网络拓扑结构：

```json
{
  "network": {
    "public": {
      "autonomous_systems": [
        {
          "as_number": "AS123",
          "network_type": "domestic",
          "devices": [...]
        }
      ]
    },
    "private": {
      "home_network": {
        "subnet": "192.168.1.0/24",
        "gateway": {...},
        "devices": [...]
      }
    }
  }
}
```

### 自定义布局

您可以在 `src/hooks/useNetworkData.ts` 文件中调整布局参数：

- AS节点的尺寸与间距
- 局域网容器的宽度和高度
- 设备在容器中的定位
- 子网的垂直和水平位置

### 扩展功能

想要添加新的节点类型或连接样式，可以：

1. 在 `src/components/` 目录下创建新的节点组件
2. 在 `useNetworkData.ts` 中注册新的节点类型
3. 更新布局算法以适应新的节点类型

## 布局指南

本可视化工具使用多层架构展示网络结构：

1. **顶层**：互联网云节点（国内和国际）
2. **中层**：自治系统(AS)节点
3. **底层**：局域网、家庭网络等私有网络

### 布局优化注意事项

- **AS节点**宽度已优化，防止过宽
- **局域网容器**已调整为足够大的尺寸，确保所有设备都不会超出边界
- **设备间距**已调整，确保设备不会挤在一起
- **子网定位**在垂直方向上保持足够间距，避免重叠

## 项目结构

```
src/
├── components/     # 自定义节点组件
├── data/           # 网络配置数据
├── hooks/          # 自定义钩子，包括useNetworkData
├── lib/            # 工具函数和类型定义
├── pages/          # 页面组件
├── App.tsx         # 主应用组件
└── main.tsx        # 入口文件
```

## 许可证

本项目采用MIT许可证

---
