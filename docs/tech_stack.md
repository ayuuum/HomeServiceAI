# 技術スタックと開発コンテキスト

このプロジェクトで使用されている技術スタックをまとめました。

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

### AI
*   **Chat / Function Calling**: [OpenAI API](https://platform.openai.com/)（Edge Functions から利用）

### その他 (Utilities)
*   **Date Handling**: [date-fns](https://date-fns.org/)
*   **Toast Notifications**: [Sonner](https://sonner.emilkowal.ski/)

---

## 開発コンテキスト

このプロジェクトはコードベースで管理されています。編集は IDE（VS Code 等）または GitHub 上で行い、Git でバージョン管理してください。
