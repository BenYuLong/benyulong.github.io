# Hexo 重构设计
使用 Hexo 8.1.2、Node.js 24 和本地 EJS 主题。仅依赖公开 GitHub 仓库、标准 GitHub Actions runner 和 GitHub Pages，不增加服务器或付费服务。
保留站点名称、介绍、两篇文章、关于页面、分类标签及原 URL。恢复 Markdown 源码；图片保留在 source/img。
提供响应式中文阅读界面、归档、分类、标签、RSS。源码与 public 构建产物分离，Actions 构建后发布 Pages。
验证：干净安装与构建、文章内容对照、全部历史页面路径和内部链接检查。不添加无关单测。
用户已批准实施。发布前需在仓库 Settings > Pages 选择 GitHub Actions。
