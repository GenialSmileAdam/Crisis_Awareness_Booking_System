import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/Logo";
import { useSubmitConsent } from "@/hooks/mutations";
import { toast } from "sonner";

export default function StudentConsent() {
  const [agreed, setAgreed] = useState(false);
  const navigate = useNavigate();
  const submitConsentMutation = useSubmitConsent();

  const handleConsent = (monitoringEnabled: boolean) => {
    if (monitoringEnabled && !agreed) return;

    submitConsentMutation.mutate(monitoringEnabled, {
      onSuccess: () => {
        navigate("/student");
      },
      onError: () => {
        toast.error("Failed to save consent. Please try again.");
      },
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-background relative">
      <div className="absolute top-6 left-6">
        <Logo />
      </div>
      
      <div className="max-w-xl w-full surface-card p-8 md:p-12 animate-fade-in-up">
        <h1 className="font-display text-3xl font-bold mb-4">Data Privacy & Consent</h1>
        <p className="text-muted-foreground mb-6">
          Before you proceed to your portal, please review our data handling practices. SafeSpace takes your privacy seriously.
        </p>

        <div className="space-y-4 mb-8 bg-muted/30 p-6 rounded-xl border border-border/50 text-sm">
          <div>
            <h3 className="font-semibold text-foreground mb-1">1. Anonymous Telemetry</h3>
            <p className="text-muted-foreground">
              Your check-in responses and wellness scores are aggregated anonymously to monitor campus-wide trends. No personally identifiable information (PII) is included in telemetry data.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">2. Clinical Access</h3>
            <p className="text-muted-foreground">
              Your assigned psychologist has access to your full profile, check-in history, and session transcripts to provide the best possible care.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">3. Crisis Escalation</h3>
            <p className="text-muted-foreground">
              If your responses indicate a high risk of immediate harm, our system automatically escalates your profile to the Critical tier, and emergency protocols may be engaged to ensure your safety.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3 mb-8">
          <Checkbox 
            id="terms" 
            checked={agreed} 
            onCheckedChange={(c) => setAgreed(c === true)} 
            className="mt-1"
          />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="terms"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I understand and agree to the terms
            </label>
            <p className="text-sm text-muted-foreground">
              By checking this box, you consent to the data practices described above.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => handleConsent(true)}
            disabled={!agreed || submitConsentMutation.isPending}
            className="w-full h-12 text-base font-semibold transition-all"
          >
            {submitConsentMutation.isPending ? "Saving..." : "Continue to SafeSpace"}
          </Button>

          <Button
            variant="ghost"
            onClick={() => handleConsent(false)}
            disabled={submitConsentMutation.isPending}
            className="w-full h-12 text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
          >
            Continue without monitoring
          </Button>
        </div>
      </div>
    </div>
  );
}
