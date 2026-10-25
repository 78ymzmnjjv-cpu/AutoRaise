import type { ReactNode } from "react";

/** コンパクト表示：ノッチ（カメラ）の左右に置く2つの要素 */
export interface Compact {
  left: ReactNode;
  right: ReactNode;
  /** 片側の幅（px）。既定 64 */
  side?: number;
  /** 背景を薄く色づける（完了・録画中など） */
  tint?: string;
}

export interface Expanded {
  width: number;
  height: number;
  node: ReactNode;
}

export interface View {
  key: string;
  compact?: Compact;
  expanded?: Expanded;
}
