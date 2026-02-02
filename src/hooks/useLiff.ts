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
        console.log("initLiff called with liffId:", liffId);

        if (!liffId) {
            console.error("No LIFF ID provided");
            setError("LIFF IDが設定されていません");
            return false;
        }

        setIsLoading(true);
        setError(null);

        // Development mock mode
        if (liffId === "MOCK") {
            console.log("LIFF Mock mode enabled");
            setTimeout(() => {
                setIsInitialized(true);
                setIsLoggedIn(true);
                setProfile({
                    userId: "U1234567890abcdef",
                    displayName: "田中 太郎 (Mock)",
                    pictureUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Taro",
                });
                setIdToken("dummy-mock-token");
                setIsLoading(false);
                console.log("LIFF Mock initialization complete");
            }, 500);
            return true;
        }

        try {
            // Initialize LIFF
            console.log("Calling liff.init with liffId:", liffId);
            await liff.init({ liffId });
            console.log("liff.init successful");
            setIsInitialized(true);

            // Check login status
            const loggedIn = liff.isLoggedIn();
            console.log("LIFF login status:", loggedIn);
            setIsLoggedIn(loggedIn);

            if (loggedIn) {
                // Get ID Token for server-side verification
                const token = liff.getIDToken();
                console.log("Got ID token:", token ? "exists" : "null");
                setIdToken(token);

                // Get user profile
                const userProfile = await liff.getProfile();
                console.log("Got user profile:", userProfile);
                setProfile({
                    userId: userProfile.userId,
                    displayName: userProfile.displayName,
                    pictureUrl: userProfile.pictureUrl,
                });
            }

            setIsLoading(false);
            console.log("LIFF initialization complete");
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
