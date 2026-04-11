import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Phone, Mail, MapPin, Globe, Facebook, Twitter, Instagram, Linkedin, Clock } from "lucide-react";

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
    { icon: <Phone className="h-4 w-4" />, text: "+380999999999" },
    { icon: <Mail className="h-4 w-4" />, text: "support@crisisaware.org" },
    { icon: <MapPin className="h-4 w-4" />, text: "4 Trokhsviatytelska Street, Kyiv, UA" },
    { icon: <Globe className="h-4 w-4" />, text: "www.crisisaware.org" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-black tracking-tight text-foreground">
              CrisisAware
            </span>
          </div>
          <Button
          onClick={() => navigate("/login?role=student")}
            className="rounded-full px-6 font-semibold"
          >
            Login
          </Button>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      {/* pt-16 offsets the 64 px (h-16) fixed navbar */}
      <section className="pt-16 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="max-w-4xl mx-auto px-6 py-24 text-center flex flex-col items-center gap-8">
          <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tight text-foreground">
            Crisis Awareness <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
              Booking System
            </span>
          </h1>

          <p className="text-lg md:text-2xl text-muted-foreground font-light max-w-2xl leading-relaxed">
            Empowering students and families with compassionate care, professional
            counseling, and immediate crisis support.
          </p>

          <Button
            size="lg"
            className="rounded-full px-12 h-14 text-base font-bold shadow-xl hover:-translate-y-0.5 transition-transform"
            onClick={() => navigate("/login?role=student")}
          >
            Book Your Appointment
          </Button>
        </div>
      </section>

      {/* ── Divider ─────────────────────────────────────────────── */}
      <div className="border-t border-border" />

      {/* ── Info Section ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto w-full px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-12 bg-card rounded-3xl p-8 md:p-12 shadow-xl border border-border">

          {/* Availability */}
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Psychologist Availability</h2>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {schedule.map((item) => (
                <div
                  key={item.day}
                  className={`p-3 rounded-2xl text-center transition-all ${
                    item.open !== "-"
                      ? "bg-primary/5 border border-primary/15"
                      : "bg-muted/40 border border-transparent opacity-50"
                  }`}
                >
                  <div className="text-[10px] font-black text-primary/60 uppercase tracking-widest mb-3">
                    {item.day}
                  </div>
                  <div className="text-xs font-bold">{item.open}</div>
                  {item.open !== "-" && (
                    <div className="w-0.5 h-3 bg-primary/20 rounded-full mx-auto my-1" />
                  )}
                  <div className="text-xs font-bold">{item.close}</div>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-dashed">
              <h3 className="text-base font-bold mb-2">Our Commitment</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We believe in recovery, resilience, and the power of professional
                support. Our team is dedicated to providing a safe, accessible, and
                compassionate environment for every individual in need.
              </p>

              <div className="flex gap-4 mt-6 items-center">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-10 w-10 rounded-full border-4 border-card bg-secondary overflow-hidden"
                    >
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`}
                        alt="Expert"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-sm font-bold">15+ Professional Counselors</div>
                  <div className="text-xs text-muted-foreground">Certified &amp; Experienced</div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-8 lg:pl-10 lg:border-l border-border">
            <h2 className="text-2xl font-bold tracking-tight">Get In Touch</h2>

            <div className="grid gap-5">
              {contactInfo.map((info, idx) => (
                <div key={idx} className="flex gap-4 items-center group cursor-pointer">
                  <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200 shadow-sm flex-shrink-0">
                    {info.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {info.text}
                    </div>
                    <div className="text-xs text-muted-foreground">Contact us anytime</div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">
                Connect With Us
              </h4>
              <div className="flex gap-3">
                {[<Facebook key="fb" />, <Twitter key="tw" />, <Instagram key="ig" />, <Linkedin key="li" />].map(
                  (icon, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 rounded-xl hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200"
                    >
                      {icon}
                    </Button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="mt-auto py-6 border-t text-center text-xs text-muted-foreground">
        © 2026 CrisisAware. All rights reserved. Providing compassionate care and support.
      </footer>
    </div>
  );
};

export default LandingPage;
