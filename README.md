# WebGIS 可视化系统

基于 React + TypeScript + Vite 构建的 WebGIS 可视化学习项目，集成 CesiumJS 三维地球与 MapboxGL 二维地图，支持 3D Tiles 加载、模型展示、绘制标注、测量及大规模数据渲染性能对比。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 19 + TypeScript 6 |
| 构建 | Vite 8 + Rolldown |
| 三维地图 | CesiumJS 1.140 |
| 二维地图 | Mapbox GL JS 3 |
| UI 组件 | Ant Design 6 |
| 状态管理 | Zustand 5 |
| 路由 | React Router 7 |

## 功能模块

### 三维地图（CesiumJS）
- **基础地图** — Cesium 地球，World Terrain 地形
- **3D Tiles** — 18 个本地数据集（Batched / Instanced / PointCloud / Composite / Voxel），支持按分类过滤、加载/定位/移除
- **3D 模型** — glTF/GLB 模型加载与展示
- **绘制工具** — 点、线、面绘制，结果保存为图层
- **标注工具** — 地图标注，支持自定义文字
- **测量工具** — 距离与面积测量
- **图层管理** — 图层显隐、重命名、删除

### 二维地图（MapboxGL）
- 街道底图，默认中心北京
- 点击地图显示经纬度 Popup（深色风格）
- 底部坐标状态栏
- 放大 / 缩小 / 复位工具栏

### 大规模数据渲染对比
对比三种 Cesium 渲染方式在不同数量级下的性能差异：

| 渲染方式 | 适用场景 | 性能 |
|----------|----------|------|
| Entity | 少量交互对象 | 1 万以上明显卡顿 |
| PointPrimitiveCollection | 海量点云 | 10 万个点流畅渲染 |
| BillboardCollection | 图标标记 | 性能居中 |

- 实时 FPS 监测（低于 30 FPS 标红）
- 构建耗时记录（最近 6 次）
- 数据量可选：1k / 1w / 5w / 10w

## 快速开始

### 环境要求
- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
npm install
```

### 配置环境变量

在项目根目录创建 `.env` 文件：

```env
VITE_MAPBOX_TOKEN=your_mapbox_access_token
```

Mapbox Token 申请地址：https://account.mapbox.com/access-tokens/

### 复制 Cesium 静态资源

```bash
npm run copy-cesium
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

### 构建生产包

```bash
npm run build
```

## 项目结构

```
src/
├── components/
│   ├── CesiumViewer.tsx      # Cesium 主视图（含绘制/标注/测量工具栏）
│   ├── AnnotationPanel.tsx   # 标注面板
│   └── LayerPanel.tsx        # 图层管理面板
├── hooks/
│   ├── useDrawHandler.ts     # 绘制逻辑
│   ├── useAnnotationHandler.ts
│   ├── useMeasureHandler.ts  # 测量逻辑
│   └── useLayerManager.ts
├── pages/
│   ├── Home.tsx
│   ├── Map.tsx               # 基础地图页
│   ├── TilesViewer.tsx       # 3D Tiles 数据集
│   ├── ModelViewer.tsx       # 3D 模型查看
│   ├── MapboxViewer.tsx      # MapboxGL 二维地图
│   └── MassDataViewer.tsx    # 大规模数据渲染对比
├── router/
│   ├── routes.tsx            # 路由配置
│   ├── lazy.tsx              # 懒加载导出
│   └── index.tsx
├── store/
│   ├── layerStore.ts         # 图层状态
│   ├── drawStore.ts
│   ├── annotationStore.ts
│   └── measureStore.ts
└── utils/
    ├── shapeStorage.ts
    └── transformRoutes.tsx
```

## 路由

| 路径 | 页面 |
|------|------|
| `/` | 首页 |
| `/map/base` | 基础地图 |
| `/map/3dtiles` | 3D Tiles 数据集 |
| `/map/models` | 3D 模型查看 |
| `/map/mapbox` | MapboxGL 二维地图 |
| `/map/massdata` | 大规模数据渲染对比 |
