import { defineConfig } from "vitepress";

const sidebar = [
  {
    text: "Welcome",
    collapsed: false,
    items: [
      { text: "Introduction", link: "/welcome" },
      { text: "Getting Started", link: "/Getting-Started" },
      { text: "User Experience", link: "/End-User-Usage" },
    ],
  },
  {
    text: "Admin Guides",
    collapsed: false,
    items: [
      { text: "Configuration", link: "/Configuration" },
      { text: "OIDC App Setup", link: "/OIDC-Setup" },
      { text: "OIDC App Guides", link: "/OIDC-Guides" },
      { text: "ProxyAuth", link: "/ProxyAuth-and-Trusted-Header-SSO-Setup" },
      { text: "LDAP Directory Sync", link: "/LDAP-Sync" },
      { text: "LDAP Server", link: "/LDAP-Server" },
      { text: "LDAP Client Guides", link: "/LDAP-Guides" },
      { text: "User Management", link: "/User-Management" },
      { text: "Security Groups", link: "/Security-Groups" },
      { text: "Password Resets", link: "/Password-Resets" },
      { text: "Email Templates", link: "/Email-Templates" },
      { text: "CLI Commands", link: "/CLI-Commands" },
      { text: "Database Migration", link: "/DB-Migration" },
      { text: "Troubleshooting", link: "/Troubleshooting" },
    ],
  },
  {
    text: "Contributing",
    collapsed: true,
    items: [
      { text: "Translations", link: "/Contributing-Translations" },
    ],
  },
];

export default defineConfig({
  title: "Mitch‑VoidAuth",
  description:
    "VoidAuth with LDAP Directory Sync — Single Sign-On for your self-hosted universe. A fork of voidauth/voidauth.",
  lang: "en-US",
  srcDir: ".",
  base: "/",
  cleanUrls: true,
  lastUpdated: true,

  head: [
    [
      "link",
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg",
      },
    ],
    ["meta", { name: "theme-color", content: "#704ca5" }],
  ],

  themeConfig: {
    logo: "/favicon.svg",
    search: {
      provider: "local",
    },

    nav: [
      { text: "Home", link: "/" },
      { text: "Getting Started", link: "/Getting-Started" },
      {
        text: "Upstream",
        link: "https://github.com/voidauth/voidauth",
      },
    ],

    sidebar,

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/mitchelljfranklin/mitch-voidauth",
      },
    ],

    editLink: {
      pattern:
        "https://github.com/mitchelljfranklin/mitch-voidauth/edit/mitch-voidauth/docs/:path",
      text: "Edit this page on GitHub",
    },

    outline: [2, 3],

    footer: {
      message:
        "A fork of VoidAuth by Derek Paschal — with LDAP Directory Sync.",
    },
  },

  vite: {
    server: {
      fs: {
        allow: [".."],
      },
    },
  },
});
