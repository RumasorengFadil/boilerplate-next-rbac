export const APP_CONFIG = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "Your App",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  description: "A reusable Next.js application foundation.",
} as const;
