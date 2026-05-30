import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "唐旭东的学习笔记",
  description: "嵌入式 · RoboMaster · C++ · 折腾记录",
  lang: 'zh-CN',
  lastUpdated: true,

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '文章', link: '/posts/' },
      { text: '关于', link: '/about' },
    ],

    sidebar: {
      '/posts/': [
        {
          text: '嵌入式',
          items: [
            { text: 'RoboWalker 步兵机器人电控分析', link: '/posts/robowalker-analysis' },
            { text: 'IMU 九轴姿态解算工程分析', link: '/posts/imu9-analysis' },
          ],
        },
        {
          text: '工具与工作流',
          items: [
            { text: '多 Agent 协作分析工作流', link: '/posts/kanban-workflow' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-username' },
    ],

    footer: {
      message: '用 ❤️ 和 VitePress 构建',
      copyright: 'Copyright © 2024 唐旭东',
    },

    editLink: {
      pattern: 'https://github.com/your-username/blog/edit/main/posts/:path',
      text: '在 GitHub 上编辑此页',
    },
  },
})
