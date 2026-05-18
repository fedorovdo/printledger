import { spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "next.cmd" : "next";
const result = spawnSync(command, ["build"], {
  env: {
    ...process.env,
    NEXT_PUBLIC_DEMO_MODE: "true",
    NEXT_PUBLIC_API_BASE_URL: "",
  },
  shell: true,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
