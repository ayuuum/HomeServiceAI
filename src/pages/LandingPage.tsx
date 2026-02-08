import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState, useRef } from "react";
import {
  MessageSquare,
  Phone,
  Bot,
  Clock,
  TrendingUp,
  Star,
  ChevronRight,
  Mail,
  Sparkles,
  Send,
  User,
  Quote,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Smartphone
} from "lucide-react";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";

// ============================================
// Animated Counter Component
// ============================================
interface AnimatedCounterProps {
  target: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}

const AnimatedCounter = ({ target, suffix = "", prefix = "", duration = 2000 }: AnimatedCounterProps) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const startTime = Date.now();
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(target * easeOut));
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [target, duration, hasAnimated]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{count}{suffix}
    </span>
  );
};

// ============================================
// Interactive AI Chat Demo Component
// ============================================
interface Message {
  id: string;
  type: "user" | "ai";
  text: React.ReactNode;
}

const InteractiveChatDemo = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", type: "ai", text: "こんにちは！ハウクリPro AIです。何かお手伝いしましょうか？" }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [showOptions, setShowOptions] = useState(true);

  const handleOptionClick = async (option: string) => {
    setShowOptions(false);

    // User message
    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: userMsgId, type: "user", text: option }]);

    // AI typing simulation
    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsTyping(false);

    // AI response logic
    let aiResponse = "";
    if (option.includes("予約")) {
      aiResponse = "かしこまりました。エアコンクリーニングのご予約ですね。来週の空き状況を確認します... 🔍\n\n・2/15(土) 10:00\n・2/15(土) 14:00\n\nがいかがでしょうか？";
    } else if (option.includes("料金")) {
      aiResponse = "料金についてですね。\n\n・壁掛けエアコン: 11,000円〜\n・お掃除機能付き: 18,000円〜\n\nとなっております。台数割引もございます✨";
    } else {
      aiResponse = "お問い合わせありがとうございます。担当者より折り返しご連絡いたします。";
    }

    setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), type: "ai", text: aiResponse }]);

    // Reset after delay to loop the demo feeling or just change options
    setTimeout(() => setShowOptions(true), 1000);
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 w-full max-w-sm border border-white/20 shadow-2xl flex flex-col h-[400px]">
      {/* Chat Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10 flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
          <MessageSquare className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-white font-medium text-sm">ハウクリPro AI</p>
          <p className="text-white/60 text-xs flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            オンライン
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2" ref={scrollRef}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.type === "user"
                  ? "bg-primary-light text-white rounded-br-md shadow-md"
                  : "bg-white/95 text-gray-800 rounded-bl-md shadow-sm"
                  }`}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex justify-start"
            >
              <div className="bg-white/90 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Options */}
      <div className="mt-4 pt-2 border-t border-white/10 flex-shrink-0">
        <AnimatePresence>
          {showOptions ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex flex-col gap-2"
            >
              <button
                onClick={() => handleOptionClick("エアコン掃除の予約をしたい")}
                className="w-full text-left bg-white/10 hover:bg-white/20 text-white text-sm py-2 px-3 rounded-lg transition-colors flex items-center justify-between group"
              >
                <span>📅 予約したい</span>
                <ChevronRight className="h-4 w-4 opacity-50 group-hover:opacity-100" />
              </button>
              <button
                onClick={() => handleOptionClick("料金体系を教えて")}
                className="w-full text-left bg-white/10 hover:bg-white/20 text-white text-sm py-2 px-3 rounded-lg transition-colors flex items-center justify-between group"
              >
                <span>💰 料金を知りたい</span>
                <ChevronRight className="h-4 w-4 opacity-50 group-hover:opacity-100" />
              </button>
            </motion.div>
          ) : (
            <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 opacity-50">
              <input
                type="text"
                placeholder="返信を待っています..."
                className="flex-1 bg-transparent text-white/70 text-sm placeholder:text-white/40 outline-none cursor-not-allowed"
                disabled
              />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ============================================
// Logo Carousel Component
// ============================================
const LogoCarousel = () => {
  const [emblaRef] = useEmblaCarousel({ loop: true }, [
    AutoScroll({ speed: 1, stopOnInteraction: false, stopOnMouseEnter: false }) // Smooth continuous scroll
  ]);

  const logos = [
    { name: "CleanMaster", color: "bg-blue-500" },
    { name: "EcoWash", color: "bg-green-500" },
    { name: "ShinyHomes", color: "bg-yellow-500" },
    { name: "ProService", color: "bg-red-500" },
    { name: "QuickFix", color: "bg-purple-500" },
    { name: "TrustClean", color: "bg-indigo-500" },
    { name: "Sparkle", color: "bg-pink-500" },
  ];

  return (
    <div className="w-full py-10 bg-muted/20 overflow-hidden relative">
      <div className="container mx-auto px-4 mb-6 text-center">
        <p className="text-sm font-semibold text-muted-foreground tracking-widest uppercase">
          TRUSTED BY INNOVATIVE CLEANING COMPANIES
        </p>
      </div>
      <div className="relative mask-linear-fade" ref={emblaRef}>
        <div className="flex">
          {[...logos, ...logos, ...logos].map((logo, index) => (
            <div key={index} className="flex-[0_0_150px] md:flex-[0_0_200px] min-w-0 flex justify-center items-center px-4">
              <div className="flex items-center gap-2 text-xl font-bold text-muted-foreground/60 filter grayscale hover:grayscale-0 transition-all duration-300 cursor-default">
                <div className={`w-8 h-8 rounded-md ${logo.color} opacity-50`} />
                <span>{logo.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// Bento Grid Feature Component
// ============================================
const BentoGrid = () => {
  return (
    <div className="container mx-auto px-4 py-24">
      <div className="text-center mb-16">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-foreground mb-4"
        >
          全てを自動化する、<br className="md:hidden" />オールインワン機能
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground max-w-2xl mx-auto"
        >
          もう、集客も予約管理もリピート施策も、個別のツールを契約する必要はありません。
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {/* Large Item - LINE AI */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="md:col-span-2 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 dark:from-green-950/30 dark:to-emerald-950/10 dark:border-green-800/50 rounded-3xl p-8 relative overflow-hidden group hover:shadow-xl transition-shadow"
        >
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mb-6 shadow-lg">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-green-950 dark:text-green-50">LINE AI チャットボット</h3>
            <p className="text-green-800/80 dark:text-green-200/80 leading-relaxed max-w-md">
              お客様のLINEメッセージに対して、AIが24時間365日即座に返信。
              面倒な日程調整から見積もり提示まで、全自動で完結します。
            </p>
          </div>
          <div className="absolute right-0 bottom-0 w-64 h-64 bg-green-200/50 rounded-full blur-3xl group-hover:bg-green-300/50 transition-colors" />
          <img
            src="/images/line-mock.png"
            alt="LINE Mock"
            className="absolute -right-10 -bottom-10 w-64 opacity-20 group-hover:opacity-30 group-hover:scale-105 transition-all duration-500"
            onError={(e) => e.currentTarget.style.display = 'none'} // Fallback if image missing
          />
        </motion.div>

        {/* Tall Item - Voice AI */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="md:row-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 dark:from-blue-950/30 dark:to-indigo-950/10 dark:border-blue-800/50 rounded-3xl p-8 relative overflow-hidden group hover:shadow-xl transition-shadow"
        >
          <div className="absolute top-0 right-0 p-4">
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Coming Soon</span>
          </div>
          <div className="relative z-10 h-full flex flex-col">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-6 shadow-lg">
              <Phone className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-blue-950 dark:text-blue-50">AI 電話受付</h3>
            <p className="text-blue-800/80 dark:text-blue-200/80 leading-relaxed mb-8">
              電話対応もAIにおまかせ。
              作業中で手が離せない時も、AIがあなたの代わりに電話を受け、
              要件を聞き取り、予約まで完了させます。
            </p>
            <div className="mt-auto flex justify-center">
              <div className="relative w-full aspect-square max-w-[200px]">
                <div className="absolute inset-0 bg-blue-400/20 rounded-full animate-ping" style={{ animationDuration: "3s" }} />
                <div className="absolute inset-4 bg-blue-400/30 rounded-full animate-ping" style={{ animationDuration: "3s", animationDelay: "1s" }} />
                <div className="absolute inset-8 bg-white/90 dark:bg-slate-800 rounded-full shadow-xl flex items-center justify-center z-10">
                  <Bot className="w-16 h-16 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Medium Item - Follow up */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-3xl p-8 hover:shadow-lg transition-shadow"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
            <Zap className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-bold mb-2">自動追客・フォロー</h3>
          <p className="text-sm text-muted-foreground">
            施工完了後のお礼メール、Google口コミ依頼、
            半年後の定期クリーニング提案まで自動化。
          </p>
        </motion.div>

        {/* Medium Item - Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-3xl p-8 hover:shadow-lg transition-shadow"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-bold mb-2">リアルタイム空き状況</h3>
          <p className="text-sm text-muted-foreground">
            Googleカレンダー等の外部カレンダーと自動同期。
            ダブルブッキングを確実に防ぎます。
          </p>
        </motion.div>
      </div>
    </div>
  );
};

// ============================================
// Sticky Mobile CTA Component
// ============================================
const StickyMobileCTA = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling down 300px
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          className="fixed bottom-4 left-4 right-4 z-50 md:hidden"
        >
          <div className="bg-card/80 backdrop-blur-lg border border-border rounded-2xl p-2 shadow-2xl flex items-center gap-3 pr-4">
            <Link to="/#contact" className="flex-1">
              <Button size="lg" className="w-full bg-gradient-to-r from-primary to-blue-600 text-white font-bold shadow-lg">
                無料デモを試す
              </Button>
            </Link>
            <button
              onClick={() => setIsVisible(false)}
              className="p-2 text-muted-foreground hover:text-foreground"
            >
              <span className="sr-only">Close</span>
              ×
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================
// Testimonial Card Component
// ============================================
interface TestimonialProps {
  name: string;
  role: string;
  content: string;
  improvement: string;
}

const TestimonialCard = ({ name, role, content, improvement }: TestimonialProps) => (
  <Card className="relative overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card">
    <CardContent className="p-6">
      <Quote className="h-8 w-8 text-primary/20 mb-4" />
      <p className="text-muted-foreground mb-4 leading-relaxed">{content}</p>
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center">
          <User className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-foreground">{name}</p>
          <p className="text-sm text-muted-foreground">{role}</p>
        </div>
      </div>
      <div className="mt-4 inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-3 py-1 rounded-full">
        <TrendingUp className="h-4 w-4" />
        {improvement}
      </div>
    </CardContent>
  </Card>
);

// ============================================
// Problem Card Component
// ============================================
interface ProblemCardProps {
  title: string;
  description: string;
}

const ProblemCard = ({ title, description }: ProblemCardProps) => (
  <div className="flex gap-4 p-6 bg-card rounded-xl border border-border hover:border-destructive/30 transition-colors">
    <div className="flex-shrink-0 mt-1">
      <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center">
        <span className="text-destructive text-sm font-bold">×</span>
      </div>
    </div>
    <div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

// ============================================
// Step Card Component
// ============================================
interface StepCardProps {
  number: string;
  title: string;
  description: string;
}

const StepCard = ({ number, title, description }: StepCardProps) => (
  <div className="text-center group">
    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-light text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
      {number}
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-3">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

// ============================================
// Benefit Card Component
// ============================================
interface BenefitCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const BenefitCard = ({ icon, title, description }: BenefitCardProps) => (
  <div className="text-center p-6 group">
    <div className="flex justify-center mb-4 group-hover:scale-110 transition-transform duration-300">{icon}</div>
    <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

// ============================================
// Main Landing Page Component
// ============================================
const LandingPage = () => {
  const scrollToContact = () => {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans selection:bg-primary/20">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-border sticky top-0 z-50 transition-all duration-300">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            {/* Logo text for current stage */}
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">ハウクリPro</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={scrollToContact} className="hidden md:flex">
              お問い合わせ
            </Button>
            <Link to="/login">
              <Button size="sm">
                ログイン
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#0F2A4A] via-primary to-[#2563EB] py-16 md:py-24 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute top-20 left-10 w-72 h-72 bg-cyan-400/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 10, repeat: Infinity, delay: 2 }}
            className="absolute bottom-10 right-10 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"
          />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0YzAtMiAyLTIgMi00IDAtMi0yLTItMi00IDAtMiAyLTIgMi00IDAtMi0yLTItMi00IDAtMiAyLTIgMi00IDAtMi0yLTItMi00IDAtMiAyLTIgMi00IDAtMi0yLTItMi00IDAtMiAyLTIgMi00IDAtMi0yLTItMi00IDAtMiAyLTIgMi00IDAiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center lg:text-left"
            >
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-white/20 shadow-lg">
                <Sparkles className="h-4 w-4 text-yellow-300" />
                <span className="text-sm text-primary-foreground/90 font-medium">AI受付エージェント搭載</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6 leading-tight tracking-tight">
                電話もLINEも、<br />
                <span className="bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent drop-shadow-sm">
                  AIが24時間受付
                </span>
              </h1>

              <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 leading-relaxed">
                ハウスクリーニング事業者専用<br className="md:hidden" />AI受付自動化プラットフォーム。<br />
                予約受付・日程調整・リマインドまで、<br className="md:hidden" />全てを自動化します。
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 font-bold px-8 py-6 text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 rounded-full"
                  onClick={scrollToContact}
                >
                  無料デモを申し込む
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  className="bg-primary-foreground/10 text-white border border-white/30 hover:bg-white/20 font-semibold px-8 py-6 text-lg backdrop-blur-sm rounded-full"
                  onClick={scrollToContact}
                >
                  資料ダウンロード
                </Button>
              </div>
            </motion.div>

            {/* Right Side - Interactive Chat Demo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden lg:flex justify-center"
            >
              <InteractiveChatDemo />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Logo Carousel */}
      <LogoCarousel />

      {/* Stats Section */}
      <section className="py-12 bg-card border-b border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 gap-8 max-w-4xl mx-auto text-center divide-x divide-border/50">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group p-4"
            >
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2 tabular-nums">
                <AnimatedCounter target={24} suffix="h" />
              </div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">自動受付対応</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="group p-4"
            >
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2 tabular-nums text-green-600">
                <AnimatedCounter target={30} suffix="%" prefix="+" />
              </div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">予約獲得率</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="group p-4"
            >
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2 tabular-nums text-blue-600">
                <AnimatedCounter target={80} suffix="%" prefix="-" />
              </div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">電話対応削減</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4">
              こんなお悩みありませんか？
            </h2>
            <p className="text-center text-muted-foreground mb-12">
              ハウスクリーニング事業者が抱える課題
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <ProblemCard
                title="作業中の電話に出られない"
                description="清掃作業中に電話が鳴っても対応できず、新規のお客様を逃してしまう"
              />
              <ProblemCard
                title="営業時間外の問い合わせ"
                description="夜間や休日のお問い合わせに対応できず、競合に流れてしまう"
              />
              <ProblemCard
                title="日程調整に時間がかかる"
                description="電話やメールで何度もやり取りして、やっと予約が確定する"
              />
              <ProblemCard
                title="予約のドタキャン・忘れ"
                description="リマインドを送り忘れて当日キャンセルが発生してしまう"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Bento Grid Features - REPLACED old Solution Section */}
      <BentoGrid />

      {/* How it Works */}
      <section className="py-20 bg-secondary/50">
        <div className="container mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-bold text-center text-foreground mb-16"
          >
            導入は3ステップで完了
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <StepCard
                number="1"
                title="LINE公式アカウント連携"
                description="既存のLINE公式アカウントを連携するだけ。新規作成もサポートします。"
              />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
              <StepCard
                number="2"
                title="サービス情報を登録"
                description="料金表やサービス内容を登録。AIがお客様に正確に案内します。"
              />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
              <StepCard
                number="3"
                title="運用開始"
                description="設定完了後すぐにAI受付が稼働。管理画面で対応状況を確認できます。"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-blue-400/5 rounded-full blur-3xl -z-10" />

        <div className="container mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4"
          >
            導入事業者の声
          </motion.h2>
          <p className="text-center text-muted-foreground mb-16">
            実際に導入いただいた事業者様からの声をご紹介します
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
              <TestimonialCard
                name="田中様"
                role="個人事業主・東京"
                content="作業中に電話に出られなくて取りこぼしていた案件が、ほぼなくなりました。AIが自動で予約まで取ってくれるので本当に助かっています。"
                improvement="電話対応8割減"
              />
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
              <TestimonialCard
                name="山田様"
                role="3人チーム・大阪"
                content="LINEからの予約が倍増しました。お客様も気軽に問い合わせできるようになったみたいです。夜中の予約も入るようになって驚いています。"
                improvement="予約数2倍"
              />
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
              <TestimonialCard
                name="佐藤様"
                role="中規模事業者・名古屋"
                content="スタッフの事務作業が大幅に減りました。その分、現場に集中できるようになって、サービス品質も上がった気がします。"
                improvement="売上20%増"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-bold text-center text-foreground mb-16"
          >
            導入効果
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Benefit Items with subtle stagger */}
            {[
              { icon: <TrendingUp className="h-10 w-10 text-primary" />, title: "売上アップ", desc: "24時間受付で取りこぼしをゼロに。新規顧客獲得率が最大30%向上。" },
              { icon: <Clock className="h-10 w-10 text-primary" />, title: "時間削減", desc: "電話対応・日程調整を自動化。月20時間以上の業務時間を削減。" },
              { icon: <Star className="h-10 w-10 text-primary" />, title: "口コミ獲得", desc: "サービス後の自動フォローでGoogle口コミ獲得。SEO効果でさらに集客。" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <BenefitCard icon={item.icon} title={item.title} description={item.desc} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="py-24 bg-gradient-to-br from-[#0F2A4A] via-primary to-[#2563EB] relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0YzAtMiAyLTIgMi00IDAtMi0yLTItMi00IDAtMiAyLTIgMi00IDAtMi0yLTItMi00IDAtMiAyLTIgMi00IDAtMi0yLTItMi00IDAtMiAyLTIgMi00IDAtMi0yLTItMi00IDAtMiAyLTIgMi00IDAtMi0yLTItMi00IDAtMiAyLTIgMi00IDAiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20" />

        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              まずは無料デモで体験
            </h2>
            <p className="text-white/80 mb-10 max-w-xl mx-auto text-lg">
              実際のAI受付を体験いただけます。<br />
              導入に関するご質問もお気軽にどうぞ。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a href="mailto:contact@haukuripro.com" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full bg-white text-blue-700 hover:bg-gray-50 font-bold px-12 py-8 text-xl rounded-full shadow-2xl hover:scale-105 transition-transform duration-300"
                >
                  <Mail className="mr-2 h-6 w-6" />
                  無料デモを申し込む
                </Button>
              </a>
            </div>
            <p className="text-sm text-white/50 mt-8">
              ※ 30分程度のオンラインデモをご案内します
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Sticky Mobile CTA */}
      <StickyMobileCTA />
    </div>
  );
};

export default LandingPage;
