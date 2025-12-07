# アニメーション設計ポリシー

Haukuri ProにおけるFramer Motion導入とアニメーション実装のガイドラインです。
「プロフェッショナルで信頼感のあるSaaS」というブランドイメージを損なわない、控えめで機能的なモーションを目指します。

## 1. デザイン原則 (Design Principles)

1.  **Subtle & Natural (控えめで自然)**
    *   過度なバウンスや回転は避け、不透明度（Opacity）と位置（Y軸移動）の組み合わせを基本とします。
    *   継続時間は **0.1s 〜 0.3s** を基準とし、ユーザーの操作を待たせない速度にします。
2.  **Functional (機能的)**
    *   「状態の変化」や「階層関係」を伝えるためにアニメーションを使用します。
    *   装飾目的だけのアニメーションは排除します。
3.  **Performant (高パフォーマンス)**
    *   レイアウトシフト（Reflow）を引き起こすプロパティ（width, height, top, leftなど）のアニメーションは避け、`transform` と `opacity` を主に使用します。

## 2. 共通モーションパターン (Motion Patterns)

### A. Fade In Up (要素の出現)
ページ遷移時やリストの読み込み時に使用します。
*   **Initial**: `opacity: 0`, `y: 10`
*   **Animate**: `opacity: 1`, `y: 0`
*   **Transition**: `duration: 0.3`, `ease: "easeOut"`

### B. Scale In (モーダル・ダイアログ)
モーダルウィンドウの表示時に使用します。
*   **Initial**: `opacity: 0`, `scale: 0.95`
*   **Animate**: `opacity: 1`, `scale: 1`
*   **Transition**: `duration: 0.2`, `ease: "easeOut"`

### C. Slide In Right (ドロワー・サイドパネル)
モバイルメニューや設定パネルの表示時に使用します。
*   **Initial**: `x: "100%"`
*   **Animate**: `x: 0`
*   **Transition**: `duration: 0.3`, `ease: "easeInOut"`

### D. Micro Interactions (ボタン・カード)
ホバー時やタップ時のフィードバックです。
*   **Hover**: `scale: 1.02` (Card), `backgroundColor` change (Button)
*   **Tap**: `scale: 0.98`

## 3. 適用コンポーネント一覧 (Target Components)

### 1. 共通UIコンポーネント (`src/components/ui/`)
*   **Button**: タップ時の縮小エフェクト（Tap scale）。
*   **Card**: ホバー時のわずかな浮き上がり（Hover lift）。
*   **Dialog / Modal**: 出現時のScale Inアニメーション。

### 2. ページコンポーネント (`src/pages/`)
*   **Dashboard (KPI Cards)**: 読み込み時に `Fade In Up` をStagger（ずらし）で適用。
*   **Booking Page (Service List)**: サービスカードのリスト表示にStaggerアニメーション。
*   **Customer Management (Table)**: テーブル行の表示アニメーション（※パフォーマンスに注意し、最初の20件のみなど制限）。

### 3. レイアウト (`src/components/`)
*   **MobileNav**: メニューの開閉アニメーション。

## 4. 実装戦略 (Implementation Strategy)

1.  `framer-motion` のインストール。
2.  再利用可能なアニメーションコンポーネント（`MotionWrapper`など）の作成はせず、各コンポーネントで `motion.div` 等を直接使用する（shadcn/uiとの親和性のため）。
3.  `AnimatePresence` を使用して、Reactの条件付きレンダリング（Unmount時）のアニメーションも制御する。
