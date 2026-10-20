// Rasterize an SVG or HTML file to PNG using the chromium already on the box.
// No extra dependencies, no image model, deterministic output.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [input, output, w = "1280", h = "900"] = process.argv.slice(2);
if (!input || !output) {
  console.error("usage: node render.mjs <in.svg|in.html> <out.png> [width] [height]");
  process.exit(2);
}
if (!fs.existsSync(input)) {
  console.error("missing input: " + input);
  process.exit(2);
}

const abs = path.resolve(input);
const url = "file://" + abs;
const args = [
  "--headless=new",
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--hide-scrollbars",
  "--force-device-scale-factor=1",
  "--default-background-color=00000000",
  `--window-size=${w},${h}`,
  `--screenshot=${path.resolve(output)}`,
  url,
];

const child = spawn(process.env.CHROMIUM_BIN || "/usr/bin/chromium", args, {
  stdio: ["ignore", "pipe", "pipe"],
});
let err = "";
child.stderr.on("data", (d) => {
  err += d;
});
child.on("close", (code) => {
  try {
    const st = fs.statSync(output);
    if (st.size > 0) {
      console.log("rendered " + output + " " + st.size + " bytes");
      process.exit(0);
    }
  } catch {
    /* fall through */
  }
  console.error("render failed (exit " + code + "): " + err.slice(-300));
  process.exit(1);
});
