import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Sparkles, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Service, ServiceOption } from "@/types/booking";

interface Recommendation {
  recommendedServices: Array<{ id: string; reason: string }>;
  recommendedOptions: Array<{ id: string; reason: string }>;
  message: string;
  tips: string;
}

interface BookingAssistantProps {
  services: Service[];
  options: ServiceOption[];
  onApplyRecommendation: (serviceIds: string[], optionIds: string[]) => void;
}

export const BookingAssistant = ({
  services,
  options,
  onApplyRecommendation,
}: BookingAssistantProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [applied, setApplied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [streamedText, recommendation]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setStreamedText("");
    setRecommendation(null);
    setApplied(false);

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/booking-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            userInput: input,
            services: services.map(s => ({
              id: s.id,
              title: s.title,
              basePrice: s.basePrice,
              description: s.description,
            })),
            options: options.map(o => ({
              id: o.id,
              title: o.title,
              price: o.price,
              serviceId: o.serviceId,
            })),
          }),
        }
      );

      if (!resp.ok || !resp.body) {
        throw new Error("Failed to get response");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullText += content;
              setStreamedText(fullText);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Parse the final JSON response
      try {
        // Extract JSON from the response (it might be wrapped in markdown code blocks)
        const jsonMatch = fullText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as Recommendation;
          setRecommendation(parsed);
          setStreamedText(""); // Clear streamed text once we have the structured data
        }
      } catch (e) {
        console.error("Failed to parse recommendation:", e);
      }
    } catch (error) {
      console.error("Assistant error:", error);
      setStreamedText("申し訳ありません。エラーが発生しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!recommendation) return;
    
    const serviceIds = recommendation.recommendedServices.map(s => s.id);
    const optionIds = recommendation.recommendedOptions.map(o => o.id);
    
    onApplyRecommendation(serviceIds, optionIds);
    setApplied(true);
  };

  const getServiceName = (id: string) => services.find(s => s.id === id)?.title || id;
  const getOptionName = (id: string) => options.find(o => o.id === id)?.title || id;

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: -180 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
            className="fixed bottom-28 right-4 z-50 md:bottom-10 md:right-10"
          >
            {/* Pulse ring effect */}
            <motion.div
              className="absolute inset-0 rounded-full bg-primary/30"
              animate={{ 
                scale: [1, 1.6, 2],
                opacity: [0.5, 0.2, 0]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeOut"
              }}
              style={{ width: '100%', height: '100%' }}
            />
            <motion.button
              onClick={() => setIsOpen(true)}
              className="relative rounded-full h-18 w-18 md:h-20 md:w-20 shadow-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center hover:shadow-primary/40 transition-all duration-300"
              style={{ width: '4.5rem', height: '4.5rem' }}
              whileHover={{ scale: 1.15, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  repeatDelay: 2 
                }}
              >
                <Sparkles className="h-8 w-8 md:h-10 md:w-10" />
              </motion.div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-4 right-4 left-4 md:left-auto md:w-96 z-50 md:bottom-8 md:right-8"
          >
            <Card className="flex flex-col h-[500px] max-h-[80vh] shadow-2xl border-2 border-primary/20 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  <span className="font-semibold">AIアシスタント</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
                {/* Welcome Message */}
                <div className="bg-card rounded-lg p-3 shadow-sm">
                  <p className="text-sm text-muted-foreground">
                    こんにちは！お住まいの状況やお悩みを教えてください。最適なクリーニングプランをご提案します。
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    例：「マンション3LDKでエアコン2台あり。カビ臭いが気になる」
                  </p>
                </div>

                {/* User Input Echo */}
                {(isLoading || streamedText || recommendation) && input && (
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground rounded-lg p-3 max-w-[85%]">
                      <p className="text-sm">{input}</p>
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {isLoading && !streamedText && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">考え中...</span>
                  </div>
                )}

                {/* Streaming Text */}
                {streamedText && !recommendation && (
                  <div className="bg-card rounded-lg p-3 shadow-sm">
                    <p className="text-sm whitespace-pre-wrap">{streamedText}</p>
                  </div>
                )}

                {/* Recommendation Card */}
                {recommendation && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    {/* Message */}
                    <div className="bg-card rounded-lg p-3 shadow-sm">
                      <p className="text-sm">{recommendation.message}</p>
                    </div>

                    {/* Recommended Services */}
                    {recommendation.recommendedServices.length > 0 && (
                      <div className="bg-card rounded-lg p-3 shadow-sm">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                          <Check className="h-4 w-4 text-primary" />
                          おすすめサービス
                        </h4>
                        <div className="space-y-2">
                          {recommendation.recommendedServices.map((s, i) => (
                            <div key={i} className="text-sm">
                              <Badge variant="secondary" className="mb-1">
                                {getServiceName(s.id)}
                              </Badge>
                              <p className="text-xs text-muted-foreground">{s.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommended Options */}
                    {recommendation.recommendedOptions.length > 0 && (
                      <div className="bg-card rounded-lg p-3 shadow-sm">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                          <Check className="h-4 w-4 text-primary" />
                          おすすめオプション
                        </h4>
                        <div className="space-y-2">
                          {recommendation.recommendedOptions.map((o, i) => (
                            <div key={i} className="text-sm">
                              <Badge variant="outline" className="mb-1">
                                {getOptionName(o.id)}
                              </Badge>
                              <p className="text-xs text-muted-foreground">{o.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tips */}
                    {recommendation.tips && (
                      <div className="bg-primary/10 rounded-lg p-3">
                        <h4 className="text-sm font-semibold mb-1 text-primary">💡 ヒント</h4>
                        <p className="text-xs text-muted-foreground">{recommendation.tips}</p>
                      </div>
                    )}

                    {/* Apply Button */}
                    <Button
                      onClick={handleApply}
                      disabled={applied}
                      className="w-full"
                      size="lg"
                    >
                      {applied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          適用しました
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          この組み合わせを選択
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t bg-card">
                <div className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="お住まいの状況やお悩みを入力..."
                    className="resize-none min-h-[60px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSubmit}
                    disabled={!input.trim() || isLoading}
                    size="icon"
                    className="shrink-0 h-[60px] w-[60px]"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
