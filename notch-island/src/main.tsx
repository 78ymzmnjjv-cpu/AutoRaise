import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initStore, isPreview } from "@/lib/store";
import { App } from "./App";
import "./styles.css";

initStore().then(async () => {
  let Demo: React.ComponentType | null = null;
  if (isPreview) {
    document.body.classList.add("preview");
    Demo = (await import("./dev/DemoPanel")).DemoPanel;
  }
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
      {Demo && <Demo />}
    </StrictMode>,
  );
});
