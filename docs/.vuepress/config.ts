import { defineUserConfig } from "vuepress";
import theme from "./theme";

export default defineUserConfig({
  base: "/",

  locales: {
    "/": {
      lang: "zh-CN",
      title: "朱帅的博客",
      description: "朱帅的博客主页",
    },
    "/en/": {
      lang: "en-US",
      title: "xzcoder's Blog",
      description: "xzcoder's Blog Page",
    },
  },

  port: 8099,

  theme,
});
