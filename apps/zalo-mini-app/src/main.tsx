import "zmp-ui/zaui.css";
import "./styles.css";

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import appConfig from "../app-config.json";

type ZaloWindow = Window & typeof globalThis & { APP_CONFIG?: unknown };

const zWindow = window as ZaloWindow;
if (!zWindow.APP_CONFIG) {
  zWindow.APP_CONFIG = appConfig;
}

const rootElement = document.getElementById("app");
if (!rootElement) {
  throw new Error("Lingoza requires a root element with id=\"app\".");
}

createRoot(rootElement).render(
  React.createElement(React.StrictMode, null, React.createElement(App))
);
