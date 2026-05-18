const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

/** @type {import('next').NextConfig} */
const nextConfig = isDemoMode
  ? {
      output: "export",
      images: {
        unoptimized: true,
      },
    }
  : {};

export default nextConfig;
