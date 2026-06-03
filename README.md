# 客服预约管理系统

一个基于 Cloudflare D1 + Pages 的客服预约管理系统，采用 Apple 风格设计，主要运行在移动端。

## 技术栈

- **前端**: React 18 + TypeScript + Vite
- **样式**: Tailwind CSS + 自定义 Apple 风格主题
- **状态管理**: Zustand
- **数据获取**: TanStack Query
- **数据库**: Cloudflare D1
- **部署**: Cloudflare Pages
- **ORM**: Drizzle ORM

## 功能模块

- 多店家管理
- 妹妹管理（在岗/休息/离职状态）
- 套餐管理
- 顾客管理（支持多账号：微信/Telegram）
- 顾客标签管理
- 预约订单管理
- 自动提成计算
- 数据看板（今日/本月统计 + 排行）

## 设计风格

参考 Apple 官网 / iOS 系统风格：
- 极简设计，充足留白
- 卡片式布局，大圆角
- 毛玻璃效果
- 高级灰配色
- 柔和动画

## 开发命令

```bash
# 安装依赖
npm install

# 本地开发
npm run dev

# 构建
npm run build

# 数据库迁移
npm run db:migrate

# 部署到 Cloudflare Pages
npm run pages:deploy
```

## 项目结构

```
├── src/
│   ├── components/     # UI组件
│   ├── pages/          # 页面组件
│   ├── stores/         # Zustand状态管理
│   ├── lib/            # 工具函数
│   ├── types/          # TypeScript类型
│   └── hooks/          # 自定义Hooks
├── functions/api/      # Pages Functions API
├── db/                 # 数据库Schema和迁移
└── public/             # 静态资源
```

## 数据库表

- `stores` - 店家
- `girls` - 妹妹
- `packages` - 套餐
- `girl_package_prices` - 妹妹套餐价格
- `customers` - 顾客
- `customer_accounts` - 顾客账号
- `tags` - 标签
- `customer_tags` - 顾客标签关联
- `orders` - 订单
- `order_snapshots` - 订单快照

## 部署说明

1. 创建 Cloudflare D1 数据库
2. 更新 `wrangler.toml` 中的 `database_id`
3. 运行数据库迁移：`npm run db:migrate:prod`
4. 部署：`npm run pages:deploy`