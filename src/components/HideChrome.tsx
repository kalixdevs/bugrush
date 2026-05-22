"use client";

import { useEffect } from "react";

/**
 * Mount on error / 404 screens to hide all site chrome (navbar, chat,
 * banners) via the `chrome-off` body class — only the background animation
 * and the error card remain. Removes the class on unmount.
 */
export default function HideChrome() {
  useEffect(() => {
    document.body.classList.add("chrome-off");
    return () => document.body.classList.remove("chrome-off");
  }, []);
  return null;
}
