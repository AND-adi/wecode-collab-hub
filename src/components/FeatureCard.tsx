import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  gradient: string;
  href: string;
}
const FeatureCard = ({
  icon,
  title,
  description,
  gradient,
  href
}: FeatureCardProps) => {
  return <Card className="card-glass group relative overflow-hidden transition-all duration-300 hover:scale-105 hover:glow-primary">
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 ${gradient}`} />
      <div className="relative p-8 space-y-4 bg-slate-900">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl glow-primary">
          {icon}
        </div>
        <h3 className="text-2xl font-bold text-foreground">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
        <Button variant="ghost" className="group/btn p-0 h-auto text-primary hover:text-secondary transition-colors" onClick={() => window.location.href = href}>
          Get Started
          <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
        </Button>
      </div>
    </Card>;
};
export default FeatureCard;