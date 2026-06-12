# CSOrderSystem 项目记忆

## 项目概况
- 技术栈：React + TypeScript (Vite) 前端，Cloudflare Workers (Hono) 后端，D1 数据库
- 前端部署：Cloudflare Pages (project: cs-order-system)
- 后端部署：Cloudflare Workers
- 数据库：D1 (cs-order-db)

## 业务规则
- **免单**: finalPrice=0，不扣余额，不消耗会员日权益，提成照常按原价计算，discountType='freeOrder'
- **试钟**: 一口价(trialPrice)，不按小时计费，不参与任何优惠，提成按 trialPrice 计算，discountType='trial'，hours=1
- **会员日首钟优惠**: 会员日当天首单折扣，免单时不消耗该权益
- **excludeFromDiscount**: 妹妹级别的不参与优惠开关

## 关键文件
- 前端入口: `src/App.tsx`
- 订单页: `src/pages/OrdersPage.tsx`（最复杂的页面）
- 妹妹管理: `src/pages/GirlsPage.tsx`
- 底部导航: `src/components/BottomNav.tsx`（tabs 数组定义页面入口）
- API 路由: `CSOrderSystem-api/src/routes/`（orders.ts, girls.ts, dashboard.ts 等）
- DB Schema: `CSOrderSystem-api/src/db/schema.ts`
- 类型定义: `src/types/index.ts`
- 迁移文件: `CSOrderSystem-api/migrations/`

## 部署流程
1. API: `cd CSOrderSystem-api && npx wrangler deploy`
2. 前端构建: `cmd /c "node node_modules\vite\bin\vite.js build"` (PowerShell 下需用 cmd 包裹)
3. 前端部署: `npx wrangler pages deploy dist --project-name=cs-order-system`
4. 数据库迁移需本地和远程都执行: `npx wrangler d1 execute cs-order-db --remote --file=migrations/xxx.sql`

## 注意事项
- PowerShell 下 vite build 命令可能卡住，需用 `cmd /c` 包裹或 `node -e "execSync()"` 方式
- discountType 类型需在 types/index.ts、useApi.ts、OrdersPage.tsx 三处同步
- 数据库 schema 变更后需同步更新迁移文件
- 妹妹的 girls 表字段变更需检查 insert 和 update 两处路由代码
