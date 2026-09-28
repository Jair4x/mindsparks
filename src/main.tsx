import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { QuickCaptureApp } from "./quick-capture/QuickCaptureApp";
import { initI18n } from "./i18n";

const isQuickCapture = new URLSearchParams(window.location.search).get("window") === "quick-capture";

initI18n().then(() => {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      {isQuickCapture ? <QuickCaptureApp /> : <App />}
    </React.StrictMode>,
  );
})
