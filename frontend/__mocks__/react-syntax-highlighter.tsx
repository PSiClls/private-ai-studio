import React from "react"

export const Prism = ({ children, language }: { children: string; language?: string }) => (
  <pre data-lang={language}>{children}</pre>
)

export const styles = {
  oneDark: {},
}
