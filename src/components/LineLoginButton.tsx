import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function LineLoginButton() {
    const handleLineLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'line' as any,
                options: {
                    redirectTo: window.location.href, // Redirect back to the current booking page
                    scopes: 'profile openid email',
                },
            });

            if (error) throw error;
        } catch (error) {
            console.error("LINE Login error:", error);
            toast.error("LINEログインに失敗しました");
        }
    };

    return (
        <Button
            onClick={handleLineLogin}
            className="w-full bg-[#06C755] hover:bg-[#05b34c] text-white font-bold py-6 shadow-subtle"
        >
            <img
                src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg"
                alt="LINE"
                className="w-6 h-6 mr-2 invert brightness-0"
            />
            LINEで予約する（入力の手間が省けます）
        </Button>
    );
}
