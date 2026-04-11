import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Shield, Phone, Mail, MapPin, Globe, 
  Facebook, Twitter, Instagram, Linkedin, 
  Clock, ArrowRight, HeartPulse, Sparkles, UserPlus 
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
      
      {/* ── Background Ambient Blobs ──────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[100px]" />
      </div>

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-background/70 backdrop-blur-xl border-b border-white/10 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
              <HeartPulse className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-foreground">
              CrisisAware
            </span>
          </div>
          <Button
            onClick={() => navigate("/login?role=student")}
            className="rounded-full px-8 h-11 font-bold shadow-md hover:shadow-lg transition-all"
          >
            Access Portal
          </Button>
        </div>
      </nav>

      {/* ── Hero section ────────────────────────────────────────── */}
      <section className="relative z-10 pt-32 pb-20 md:pt-48 md:pb-32 px-6">
        <div className="max-w-5xl mx-auto text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold text-sm mb-8 animate-fade-in">
            <Sparkles className="h-4 w-4" />
            Empathetic Support & Professional Care
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-[5rem] font-extrabold leading-[1.1] tracking-tighter text-foreground mb-8">
            Your Mental Wellbeing, <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-primary">
              Our Highest Priority
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-2xl leading-relaxed mb-10">
            A secure, compassionate platform connecting students and families 
            with expert psychological care and immediate crisis intervention.
          </p>

          <Button
            size="lg"
            className="rounded-full px-10 h-16 text-lg font-bold shadow-xl shadow-primary/25 hover:-translate-y-1 transition-all group"
            onClick={() => navigate("/login?role=student")}
          >
            Book Your Appointment
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>

          {/* Trust Metrics */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 border-t border-border/50 pt-10">
            {[
              { label: "Active Students", value: "2.4k+" },
              { label: "Certified Counselors", value: "15+" },
              { label: "Sessions Hosted", value: "10k+" },
              { label: "Average Rating", value: "4.9/5" },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-3xl font-black text-foreground mb-1">{stat.value}</span>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Content Grid ────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto w-full px-6 pb-32">
        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* Availability Card */}
          <div className="lg:col-span-7 bg-card/40 backdrop-blur-md rounded-[2.5rem] p-8 md:p-12 border border-white/10 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px]" />
            
            <div className="relative">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
                <div>
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-3xl font-extrabold tracking-tight mb-2">Availability</h2>
                  <p className="text-muted-foreground font-medium">When our experts are online</p>
                </div>
                
                <div className="flex -space-x-3 items-center">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-12 w-12 rounded-full border-4 border-card bg-secondary overflow-hidden shadow-sm">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 15}`} alt="Expert" />
                    </div>
                  ))}
                  <div className="h-12 w-12 rounded-full border-4 border-card bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-sm z-10">
                    +11
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 md:gap-4 mb-10">
                {schedule.map((item) => (
                  <div key={item.day} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-background/50 border border-white/5 shadow-sm hover:scale-[1.02] hover:bg-white hover:shadow-md transition-all">
                     <span className="text-[11px] font-black text-primary/80 uppercase tracking-widest mb-3">
                      {item.day}
                    </span>
                    <span className="text-sm font-bold text-foreground">{item.open}</span>
                    <div className="w-1 h-3 bg-primary/20 rounded-full my-1.5" />
                    <span className="text-sm font-bold text-foreground">{item.close}</span>
                  </div>
                ))}
              </div>

              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <Shield className="h-6 w-6 text-primary shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-foreground mb-1">Confidential & Secure</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                      Every session is strictly confidential. We employ enterprise-grade security to ensure your conversations and mental health data remain entirely private.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Card */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            <div className="bg-card/40 backdrop-blur-md rounded-[2.5rem] p-8 md:p-10 border border-white/10 shadow-xl flex-1">
              <h2 className="text-2xl font-extrabold tracking-tight mb-8">Get In Touch</h2>
              <div className="flex flex-col gap-6">
                {contactInfo.map((info, idx) => (
                  <div key={idx} className="flex items-center gap-5 group cursor-pointer p-2 -m-2 rounded-2xl hover:bg-white/40 transition-colors">
                    <div className="h-12 w-12 rounded-[1rem] bg-background border border-border/50 flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary shadow-sm transition-all duration-300">
                      {info.icon}
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">{info.label}</div>
                      <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {info.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Socials Box */}
            <div className="bg-gradient-to-br from-secondary/50 to-secondary rounded-[2.5rem] p-8 border border-white/20 shadow-md flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground mb-1">Follow Us</p>
                <p className="text-xs text-muted-foreground font-medium">Stay updated with our events</p>
              </div>
              <div className="flex gap-2">
                {[<Facebook key="fb" />, <Twitter key="tw" />, <Instagram key="ig" />, <Linkedin key="li" />].map((icon, idx) => (
                  <Button
                    key={idx}
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full bg-background/50 hover:bg-primary hover:text-primary-foreground shadow-sm transition-all"
                  >
                    <div className="scale-75">{icon}</div>
                  </Button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="mt-auto py-8 border-t border-white/10 bg-background/50 backdrop-blur-sm z-10 relative">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold">CrisisAware</span>
          </div>
          <p className="text-xs text-muted-foreground font-medium font-semibold text-center">
            © 2026 CrisisAware System. Dedicated to mental health everywhere.
          </p>
          <div className="flex gap-4 text-xs font-bold text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
