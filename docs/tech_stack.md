# 技術スタックと開発コンテキスト

このプロジェクトで使用されている技術スタックと、開発ツール（Lovable / Antigravity）に関する情報をまとめました。

## 技術スタック (Tech Stack)

### フロントエンド (Frontend)
*   **Core Framework**: [React](https://react.dev/) (v18)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **Routing**: [React Router](https://reactrouter.com/) (v6)

### UI / Styling
*   **CSS Framework**: [Tailwind CSS](https://tailwindcss.com/)
*   **Component Library**: [shadcn/ui](https://ui.shadcn.com/) (based on [Radix UI](https://www.radix-ui.com/))
*   **Icons**: [Lucide React](https://lucide.dev/)
*   **Charts**: [Recharts](https://recharts.org/)

### 状態管理・データフェッチ (State & Data)
*   **Server State**: [TanStack Query](https://tanstack.com/query/latest) (React Query)
*   **Form Handling**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) (Validation)
*   **Global State**: React Context API (StoreContextなど)

### バックエンド (Backend / BaaS)
*   **Platform**: [Supabase](https://supabase.com/)
    *   **Database**: PostgreSQL
    *   **Authentication**: Supabase Auth (Email, LINE)
    *   **Storage**: Supabase Storage
    *   **Realtime**: Supabase Realtime

### その他 (Utilities)
*   **Date Handling**: [date-fns](https://date-fns.org/)
*   **Toast Notifications**: [Sonner](https://sonner.emilkowal.ski/)

---

## 開発コンテキスト: Lovable と Antigravity について

このプロジェクトは、No-Code/Low-Codeツールである **Lovable** で初期生成され、その後AIエージェント **Antigravity** によってカスタマイズ・機能拡張されています。

### 注意点と運用アドバイス

1.  **コードの所有権と編集**
    *   現在はAntigravity（エンジニアリングAI）によって、Lovableの標準テンプレートから大きく逸脱したカスタマイズ（LINE連携、独自デザインシステム、複雑な予約ロジックなど）が行われています。
    *   **注意**: Lovableの画面で「再生成」や「大幅な変更」を行うと、Antigravityが行った手動修正や複雑なロジックが上書きされたり、整合性が取れなくなる可能性があります。

2.  **推奨されるワークフロー**
    *   **基本はコード編集**: 今後はLovableのGUIエディタよりも、VS Codeなどのエディタ（またはAntigravity）を通じたコードベースの編集を主とすることを推奨します。
    *   **Git管理の徹底**: Lovableと同期する場合や、Antigravityに依頼する場合は、必ずGitでブランチを分けたり、コミットを残してから作業を行うことで、予期せぬ上書き事故を防げます。

3.  **Lovableの役割**
    *   Lovableは「初期構築」や「新しいページのプロトタイプ作成」には非常に強力ですが、今回のような「外部API連携（LINE）」や「厳密な業務ロジック」の実装フェーズに入った後は、通常のソフトウェア開発フロー（コード中心）に移行するのが一般的です。
