import { App as CapApp } from "@capacitor/app";
import { isDevice, onMoneyNotification, onOpen } from "../lib/device";
import { AppLifecycle } from "./lifecycle";

export const createAppLifecycle = () => new AppLifecycle({
  visibility(listener) { document.addEventListener("visibilitychange", listener); return () => document.removeEventListener("visibilitychange", listener); },
  keys(listener) { document.addEventListener("keydown", listener); return () => document.removeEventListener("keydown", listener); },
  back: listener => isDevice ? CapApp.addListener("backButton", listener) : Promise.resolve({ remove() { } }),
  open: onOpen,
  money: onMoneyNotification,
});
