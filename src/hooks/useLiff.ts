import { useState, useCallback } from "react";
import liff from "@line/liff";

export interface LiffProfile {
    userId: string;
    displayName: string;
    pictureUrl?: string;
}

interface UseLiffResult {
    isInitialized: boolean;
    isLoggedIn: boolean;
    isLoading: boolean;
    error: string | null;
    profile: LiffProfile | null;
    idToken: string | null;
    initLiff: (liffId: string) => Promise<boolean>;
    login: () => void;
    closeWindow: () => void;
}

export const useLiff = (): UseLiffResult => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [profile, setProfile] = useState<LiffProfile | null>(null);
    const [idToken, setIdToken] = useState<string | null>(null);

    const initLiff = useCallback(async (liffId: string): Promise<boolean> => {
        if (!liffId) {
            setError("LIFF IDが設定されていません");
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Initialize LIFF
            await liff.init({ liffId });
            setIsInitialized(true);

            // Check login status
            const loggedIn = liff.isLoggedIn();
            setIsLoggedIn(loggedIn);

            if (loggedIn) {
                // Get ID Token for server-side verification
                const token = liff.getIDToken();
                setIdToken(token);

                // Get user profile
                const userProfile = await liff.getProfile();
                setProfile({
                    userId: userProfile.userId,
                    displayName: userProfile.displayName,
                    pictureUrl: userProfile.pictureUrl,
                });
            }

            setIsLoading(false);
            return loggedIn;
        } catch (err) {
            console.error("LIFF initialization failed:", err);
            const errorMessage = err instanceof Error ? err.message : "LIFF初期化に失敗しました";
            setError(errorMessage);
            setIsLoading(false);
            return false;
        }
    }, []);

    const login = useCallback((redirectUri?: string) => {
        if (isInitialized && !isLoggedIn) {
            console.log("[LIFF] Logging in with redirectUri:", redirectUri || window.location.href);
            liff.login({ redirectUri: redirectUri || window.location.href });
        }
    }, [isInitialized, isLoggedIn]);

    const closeWindow = useCallback(() => {
        if (isInitialized && liff.isInClient()) {
            liff.closeWindow();
        } else {
            // If not in LINE app, just close or navigate back
            window.close();
        }
    }, [isInitialized]);

    return {
        isInitialized,
        isLoggedIn,
        isLoading,
        error,
        profile,
        idToken,
        initLiff,
        login,
        closeWindow,
    };
};
