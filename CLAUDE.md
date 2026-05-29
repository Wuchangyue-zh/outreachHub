# OutreachHub 开发规章

## 🛠️ 核心开发命令
- 启动本地开发服务：`npm run dev` 或 `yarn dev`
- 数据库迁移：`npx prisma db push` 或 `npx prisma migrate dev`
- 打开数据库面板：`npx prisma studio`
- 项目打包编译：`npm run build`

## 🎨 代码风格规范
- 全面拥抱 TailwindCSS，严禁手写繁琐的独立 CSS 文件。
- 路由使用 Next.js App Router 架构。
- 所有数据模型必须严格遵循 `prisma/schema.prisma`。