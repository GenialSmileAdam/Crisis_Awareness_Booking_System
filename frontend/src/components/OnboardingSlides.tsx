import { useState, useEffect } from "react";
import { Shield, ClipboardList, Calendar, MessageSquare, BookOpen, Lock, ChevronRight, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const slides = [
  {
    title: "Welcome to SafeSpace",
    description: "A safe, private space designed to support your mental wellbeing at Nile University. Let's show you around.",
    icon: Shield,
  },
  {
    title: "Daily Check-ins",
    description: "Take 2 minutes to tell us how you're feeling. Your responses help your counselor support you better.",
    icon: ClipboardList,
  },
  {
    title: "Book Appointments",
    description: "Need to talk to someone? Request a session with a psychologist directly from your dashboard.",
    icon: Calendar,
  },
  {
    title: "Anonymous Forum",
    description: "Connect with other students in our anonymous community forum. Share your thoughts, ask questions, and know you're not alone. Your identity is never revealed.",
    icon: MessageSquare,
  },
  {
    title: "Resources",
    description: "Access mental health articles, guides, and tips curated by your university's counseling team — available anytime, anywhere.",
    icon: BookOpen,
  },
  {
    title: "You're in control",
    description: "Your data is yours. Everything on SafeSpace is private and you can update your consent anytime.",
    icon: Lock,
  },
];

export function OnboardingSlides() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("safespace_onboarding_seen");
    if (!hasSeenOnboarding) {
      setIsVisible(true);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem("safespace_onboarding_seen", "true");
    setIsVisible(false);
  };

  const nextSlide = () => {
    if (isAnimating) return;
    if (currentSlide < slides.length - 1) {
      setIsAnimating(true);
      setCurrentSlide(prev => prev + 1);
      setTimeout(() => setIsAnimating(false), 500);
    } else {
      handleComplete();
    }
  };

  const prevSlide = () => {
    if (isAnimating) return;
    if (currentSlide > 0) {
      setIsAnimating(true);
      setCurrentSlide(prev => prev - 1);
      setTimeout(() => setIsAnimating(false), 500);
    }
  };

  if (!isVisible) return null;

  const SlideIcon = slides[currentSlide].icon;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col justify-between animate-in fade-in duration-500">
      <div className="flex justify-end p-6 md:p-8">
        <Button variant="ghost" onClick={handleComplete} className="text-muted-foreground hover:text-foreground">
          Skip
          <X className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center w-full overflow-hidden">
        <div key={currentSlide} className="animate-in slide-in-from-right-8 fade-in duration-500 flex flex-col items-center max-w-2xl mx-auto">
          <div className="h-24 w-24 md:h-32 md:w-32 rounded-full bg-primary/10 flex items-center justify-center mb-8">
            <SlideIcon className="h-12 w-12 md:h-16 md:w-16 text-primary" />
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-6 tracking-tight">
            {slides[currentSlide].title}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-lg leading-relaxed">
            {slides[currentSlide].description}
          </p>
        </div>
      </div>

      <div className="p-6 md:p-10 flex items-center justify-between w-full max-w-4xl mx-auto">
        <div className="w-32">
          {currentSlide > 0 ? (
            <Button variant="ghost" onClick={prevSlide} className="text-muted-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          ) : (
            <div />
          )}
        </div>

        <div className="flex gap-3">
          {slides.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-2.5 rounded-full transition-all duration-300",
                index === currentSlide ? "w-8 bg-primary" : "w-2.5 bg-primary/20"
              )}
            />
          ))}
        </div>

        <div className="w-32 flex justify-end">
          <Button onClick={nextSlide} size="lg" className={cn("gradient-primary text-primary-foreground border-0 font-medium", currentSlide === slides.length - 1 ? "px-6" : "")}>
            {currentSlide === slides.length - 1 ? (
              "Get Started"
            ) : (
              <>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
