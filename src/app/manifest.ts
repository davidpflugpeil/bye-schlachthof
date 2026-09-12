import type { MetadataRoute } from "next";

import { PROJECT_NAME } from "@/lib/navigation";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PROJECT_NAME,
    short_name: "Bye Schlachthof",
    description:
      "Geruch in der Nachbarschaft festhalten, damit die Stadt gezielt prüfen kann – anonym und in wenigen Sekunden.",
    lang: "de",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f4ef",
    theme_color: "#0f5a52",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Geruch melden",
        short_name: "Melden",
        description: "Direkt eine neue Geruchsmeldung erfassen",
        url: "/melden",
      },
    ],
  };
}
