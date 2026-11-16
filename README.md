# BIG BEN’s Blog

基于 Hexo 8.1.2 的中文博客。仅使用公开 GitHub 仓库、标准 GitHub Actions runner 和 GitHub Pages，不需要额外服务器、数据库或付费域名。

## 本地使用

安装 Node.js 24（`.nvmrc`），然后：

```sh
npm ci
npm run server
```

打开 http://localhost:4000 。构建运行 `npm run build`，产物位于 `public/`；清理运行 `npm run clean`。

## 写文章

```sh
npx hexo new "文章标题"
```

编辑 `source/_posts/` 下的 Markdown。头部可设置 `title`、`date`、`categories`、`tags`；`slug` 控制文章链接，已发布文章请勿随意改动日期或 slug。图片放在 `source/img/`，通过 `/img/文件名` 引用。

## 免费部署

1. 在 GitHub 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
2. 将源码推送到 `master`，工作流会运行 `npm ci`、构建并部署 `public/`。也可以从 Actions 手动运行。PR 只构建、不发布。
3. 网站地址为 https://benyulong.github.io 。首次部署可能要求仓库管理员批准 github-pages 环境。

不需要配置个人访问令牌，也不需要单独的部署分支。工作流使用内置 `GITHUB_TOKEN` 和 Pages 权限。仅使用标准托管 runner；免费服务仍受 GitHub 的配额及使用政策约束。

## 目录

- `_config.yml`：站点名称、域名、时区、链接和生成配置
- `source/_posts/`：两篇从旧 HTML 恢复的文章
- `source/about/`、`source/categories/`、`source/tags/`：独立页面
- `source/img/`：保留的原站图片
- `themes/ben/`：本地维护的响应式 EJS 主题，支持系统深色模式，无外部字体或脚本依赖
- `.github/workflows/pages.yml`：构建发布工作流

## 迁移说明

旧仓库只包含 2015 年生成的静态文件。本次恢复可编辑源码，保留两篇文章的发布日期、中文 URL、分类和标签，以及归档路径。首篇文章的历史标题锚点也予以保留；正文和关于页面沿用原内容。

《当我真正开始爱自己》包含一个原站的外部 HTTP 图片链接。该链接保留以避免凭空替换原文配图，但上游可用性和 HTTPS 混合内容限制可能导致图片无法显示；如有原图，可保存到 `source/img/` 后替换引用。旧多说评论服务不再接入。

`public/` 与 `node_modules/` 不提交，旧生成文件可通过 Git 历史查看。RSS 地址为 `/atom.xml`。

## 依赖审计

迁移时 `npm audit` 报告 7 项 low 告警，源于 Hexo 上游的 `deepmerge` 传递依赖；无 moderate/high/critical 告警。当前没有通过降级 Hexo 消除告警，后续应随上游修复更新锁文件。
