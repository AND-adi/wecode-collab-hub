import { Button } from "@/components/ui/button";
import { Users, Shuffle, Trophy, Globe } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";
import FeatureCard from "@/components/FeatureCard";

const Index = () => {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-32">
        <div className="max-w-5xl mx-auto text-center space-y-8 animate-slide-up">
          <div className="inline-block">
            <div className="text-sm font-medium text-primary mb-4 tracking-wider uppercase">
              Welcome to Wecode
            </div>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-bold leading-tight">
            <span className="text-gradient animate-glow-pulse">Code Together,</span>
            <br />
            <span className="text-foreground">Build Amazing Things</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Connect with developers worldwide. Collaborate in real-time, find coding partners, 
            and level up your skills on the ultimate platform for coders.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg"
              className="h-14 px-8 text-lg bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity glow-primary"
              onClick={() => window.location.href = '/auth'}
            >
              Get Started Free
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="h-14 px-8 text-lg border-primary/50 hover:bg-primary/10"
              onClick={() => window.location.href = '/random-match'}
            >
              Try Random Match
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="h-14 px-8 text-lg border-secondary/50 hover:bg-secondary/10 gap-2"
              onClick={() => window.location.href = '/world-chat'}
            >
              <Globe className="h-5 w-5" />
              World Chat
            </Button>
          </div>

          <div className="flex items-center justify-center gap-8 pt-8 text-muted-foreground">
            <div className="text-center">
              <div className="text-3xl font-bold text-gradient">10K+</div>
              <div className="text-sm">Active Coders</div>
            </div>
            <div className="w-px h-12 bg-border" />
            <div className="text-center">
              <div className="text-3xl font-bold text-gradient">50K+</div>
              <div className="text-sm">Sessions Daily</div>
            </div>
            <div className="w-px h-12 bg-border" />
            <div className="text-center">
              <div className="text-3xl font-bold text-gradient">100+</div>
              <div className="text-sm">Countries</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Choose Your <span className="text-gradient">Coding Adventure</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Whether you want to collaborate with friends, meet new developers, or challenge yourself
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <FeatureCard
            icon={<Users />}
            title="Live Collaboration"
            description="Code with your team in real-time. Share sessions instantly and watch changes appear as they type. Perfect for pair programming and team projects."
            gradient="bg-gradient-to-br from-primary/20 to-transparent"
            href="/live-collaboration"
          />
          
          <FeatureCard
            icon={<Shuffle />}
            title="Random Match"
            description="Get paired with developers worldwide based on your preferences. Video chat, share code, and learn from developers with different perspectives."
            gradient="bg-gradient-to-br from-secondary/20 to-transparent"
            href="/random-match"
          />
          
          <FeatureCard
            icon={<Trophy />}
            title="Solve & Compete"
            description="Challenge yourself with coding problems, earn points, and climb the global leaderboard. Track your progress and become a better developer."
            gradient="bg-gradient-to-br from-primary/20 to-transparent"
            href="/problems"
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8 card-glass p-12 rounded-3xl glow-primary">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            Ready to Start <span className="text-gradient">Coding Together?</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Join thousands of developers who are already collaborating, learning, and growing on Wecode
          </p>
          <Button 
            size="lg"
            className="h-14 px-12 text-lg bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
          >
            Create Your Free Account
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
