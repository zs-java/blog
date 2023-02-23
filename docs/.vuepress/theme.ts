import { hopeTheme } from "vuepress-theme-hope";
import * as navbar from "./navbar";
import * as sidebar from "./sidebar";

export default hopeTheme({
  hostname: "http://xzcoder.com",

  author: {
    name: "xzcoder",
    url: "http://xzcoder.com",
  },

  iconAssets: "iconfont",

  logo: "/avatar.jpeg",

  repo: "zs-java/blog",

  docsDir: "docs",

  pageInfo: ["Author", "Original", "Date", "Category", "Tag", "ReadingTime"],

  blog: {
    roundAvatar: true,
    medias: {
      QQ: "http://wpa.qq.com/msgrd?v=3&uin=249795005&site=qq&menu=yes",
      Gitee: "https://gitee.com/xzcoder",
      Dingding: "https://example.com",
      Email: "mailto:zhushuai_it@163.com",
      GitHub: "https://github.com/zs-java",
      Wechat: "zs52517",
      // Baidu: "https://example.com",
      // Bitbucket: "https://example.com",
      // Discord: "https://example.com",
      // Dribbble: "https://example.com",
      // Evernote: "https://example.com",
      // Facebook: "https://example.com",
      // Flipboard: "https://example.com",
      // Gitlab: "https://example.com",
      // Gmail: "https://example.com",
      // Instagram: "https://example.com",
      // Lines: "https://example.com",
      // Linkedin: "https://example.com",
      // Pinterest: "https://example.com",
      // Pocket: "https://example.com",
      // Qzone: "https://example.com",
      // Reddit: "https://example.com",
      // Rss: "https://example.com",
      // Steam: "https://example.com",
      // Twitter: "https://example.com",
      // Weibo: "https://example.com",
      // Whatsapp: "https://example.com",
      // Youtube: "https://example.com",
      // Zhihu: "https://example.com",
    },
  },

  locales: {

    /**
     * Chinese locale config
     */
    "/": {
      // navbar
      navbar: navbar.zh,

      // sidebar
      sidebar: sidebar.zh,

      footer: "<a href='https://beian.miit.gov.cn/'>苏ICP备18062776号-1<a/>",

      displayFooter: true,

      blog: {
        description: "Java、Go、Python、Node.js、Vue.js……",
        intro: "/intro.html",
      },
    },

    "/en/": {
      // navbar
      navbar: navbar.en,

      // sidebar
      sidebar: sidebar.en,

      footer: "<a href='https://beian.miit.gov.cn/'>苏ICP备18062776号-1<a/>",

      displayFooter: true,

      blog: {
        description: "Java、Go、Python、Node.js、Vue.js……",
        intro: "/en/intro.html",
      },
    },

  },

  plugins: {
    blog: {
      // autoExcerpt: true,
    },

    mdEnhance: {
      // enableAll: true,
      presentation: {
        plugins: ["highlight", "math", "search", "notes", "zoom"],
      },
    },
  },
});
