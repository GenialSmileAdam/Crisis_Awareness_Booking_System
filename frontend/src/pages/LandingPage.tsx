import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Shield, Phone, Mail, MapPin, Globe, 
  Facebook, Twitter, Instagram, Linkedin, 
  Clock, ArrowRight, HeartPulse
} from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();

  const schedule = [
    { day: "Mon", open: "9:00 am", close: "5:30 pm" },
    { day: "Tue", open: "9:00 am", close: "5:30 pm" },
    { day: "Wed", open: "9:00 am", close: "5:30 pm" },
    { day: "Thu", open: "9:00 am", close: "5:30 pm" },
    { day: "Fri", open: "9:00 am", close: "5:30 pm" },
  ];

  const contactInfo = [
    { icon: <Phone className="h-5 w-5" />, text: "+380999999999", label: "Helpline" },
    { icon: <Mail className="h-5 w-5" />, text: "support@crisisaware.org", label: "Email Us" },
    { icon: <MapPin className="h-5 w-5" />, text: "4 Trokhsviatytelska Street, Kyiv", label: "Location" },
    { icon: <Globe className="h-5 w-5" />, text: "www.crisisaware.org", label: "Website" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans overflow-x-hidden relative selection:bg-primary/20">
      
      {/* ── Subtle Geometric Background Accents ─────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Soft, small, non-distracting elements */}
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute top-20 left-10 w-24 h-24 rounded-full bg-secondary opacity-50 blur-[40px]" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      {/* ── Minimal & Clean Navbar ─────────────────────────────── */}
      <nav className="relative z-50 bg-background/80 backdrop-blur-md border-b border-white/5 py-4 transition-all">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <HeartPulse className="h-5 w-5 text-primary-foreground" />
            </div>
            {/* Keeping it simple and clean */}
            <span className="text-xl font-bold tracking-tight text-foreground">
              CrisisAware
            </span>
          </div>
          
          <Button
            onClick={() => navigate("/login?role=student")}
            className="rounded-full bg-blue-600 text-white hover:bg-blue-700 px-6 h-10 font-medium transition-colors"
          >
            Access Portal
          </Button>
        </div>
      </nav>

      {/* ── Hero Section (Spacious, Two-Column, Serif) ──────────── */}
      <section className="relative z-10 pt-20 pb-24 md:pt-32 md:pb-40 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          
          {/* Left: Typography */}
          <div className="flex flex-col items-start text-left space-y-8">
            <h1 className="text-5xl sm:text-6xl lg:text-[4.5rem] font-serif font-medium leading-[1.1] text-foreground tracking-tight">
              Psychologist <br className="hidden md:block" />
              <span className="text-primary/90 italic pr-2">Booking System</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed max-w-lg">
              Empowering students and families with compassionate care, professional
              counseling, and immediate crisis support.
            </p>

            <div className="pt-4">
              <Button
                size="lg"
                className="rounded-full px-8 h-14 text-base font-medium shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all group"
                onClick={() => navigate("/login?role=student")}
              >
                Book Your Appointment
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>

          {/* Right: Visual Element balancing the text */}
          <div className="relative aspect-square md:aspect-[4/3] lg:aspect-square w-full opacity-90 lg:opacity-100">
            {/* The structural art piece using existing colors */}
            <div className="absolute inset-0 bg-secondary rounded-t-full rounded-b-[4rem] shadow-sm flex flex-col justify-end overflow-hidden border border-border/40">
              <div className="relative w-full h-[70%] bg-card rounded-t-[3rem] border-t border-white/5 flex items-center justify-center p-8 text-center px-12">
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-primary/20 rounded-full" />
                <p className="font-serif text-xl sm:text-2xl text-foreground font-medium italic opacity-90 leading-snug">
                  "Compassion and connection, exactly when you need it most."
                </p>
              </div>
            </div>
            
            {/* Geometric accents floating around the visual */}
            <div className="absolute top-[15%] -left-6 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg transform -rotate-12">
               <Shield className="h-5 w-5" />
            </div>
            <div className="absolute top-[40%] -right-8 w-16 h-16 bg-card border border-border rounded-2xl shadow-sm rotate-12 flex items-center justify-center">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=12" alt="Expert" className="w-10 h-10" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Content Area (Spacious & Clean Layout) ─────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto w-full px-6 lg:px-8 pb-32">
        
        {/* We use a stacked or staggered layout replacing the bento-box. 
            Warm, editorial style relies on large negative space and simple lines. */}
        <div className="flex flex-col lg:flex-row gap-20 lg:gap-32">
          
          {/* Availability Column */}
          <div className="flex-1 space-y-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Clock className="h-5 w-5 text-primary" />
                <h2 className="text-3xl font-serif font-medium tracking-tight">Psychologist Availability</h2>
              </div>
              <p className="text-muted-foreground font-light leading-relaxed max-w-md">
                When our experts are online and ready to support you.
              </p>
            </div>

            <div className="space-y-4">
              {schedule.map((item) => (
                <div key={item.day} className="flex items-center justify-between px-6 py-4 rounded-full bg-card border border-border/50 hover:bg-secondary/30 transition-colors">
                  <span className="font-medium text-foreground tracking-wide w-16 font-serif">{item.day}</span>
                  <div className="flex-1 border-t border-dashed border-border/60 mx-4" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {item.open} <span className="mx-2 opacity-50">—</span> {item.close}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-secondary/40 rounded-3xl p-8 border border-border/50">
              <h3 className="font-serif text-xl font-medium text-foreground mb-3">Confidential & Secure</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                Every session is strictly confidential. We employ enterprise-grade security to ensure your conversations and mental health data remain entirely private.
              </p>
            </div>
          </div>

          {/* Contact Column */}
          <div className="flex-1 space-y-12 lg:pt-10">
            <div>
              <h2 className="text-3xl font-serif font-medium tracking-tight mb-4">Get In Touch</h2>
              <p className="text-muted-foreground font-light leading-relaxed max-w-md">
                We believe in recovery, resilience, and the power of professional support. 
                Contact us to learn more.
              </p>
            </div>

            <div className="space-y-8">
               {contactInfo.map((info, idx) => (
                <div key={idx} className="flex items-start gap-5">
                  <div className="mt-1 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/10 shrink-0">
                    {info.icon}
                  </div>
                  <div className="flex-1 pb-4 border-b border-border/40">
                    <div className="text-[11px] uppercase tracking-[0.15em] font-medium text-muted-foreground mb-1">{info.label}</div>
                    <div className="text-base text-foreground font-medium">
                      {info.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <p className="text-sm font-serif font-medium text-foreground mb-4">Connect With Us</p>
              <div className="flex gap-3">
                {[<Facebook key="fb" />, <Twitter key="tw" />, <Instagram key="ig" />, <Linkedin key="li" />].map((icon, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-full hover:bg-primary hover:text-primary-foreground border-border/60 transition-colors"
                  >
                    <div className="scale-90">{icon}</div>
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Team Meta */}
            <div className="flex items-center gap-4 pt-6 mt-8 border-t border-border/40">
               <div className="flex -space-x-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 w-10 rounded-full border-2 border-background bg-secondary overflow-hidden">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 15}`} alt="Expert" />
                    </div>
                  ))}
               </div>
               <div>
                  <div className="text-sm font-medium">15+ Professional Counselors</div>
                  <div className="text-xs text-muted-foreground font-light">Certified & Experienced</div>
               </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Spacious Footer ─────────────────────────────────────── */}
      <footer className="mt-auto py-12 border-t border-border/50 bg-background z-10 relative">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-primary" />
            <span className="text-lg font-serif font-medium">CrisisAware</span>
          </div>
          <p className="text-sm text-muted-foreground font-light text-center">
            © 2026 CrisisAware System. Dedicated to mental health everywhere.
          </p>
          <div className="flex gap-6 text-sm font-light text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
