import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, Copy, Code2 } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useNavigate } from "react-router-dom";

const LiveCollaboration = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      
      <div className="container mx-auto px-4 py-12">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-8 text-muted-foreground hover:text-foreground"
        >
          ← Back to Home
        </Button>

        <div className="max-w-4xl mx-auto space-y-8 animate-slide-up">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary glow-primary mb-4">
              <Users className="w-10 h-10" />
            </div>
            <h1 className="text-5xl font-bold text-gradient">Live Collaboration</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Code together in real-time with your team. Share a session and watch changes appear instantly.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="card-glass p-8 space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground">Create Session</h3>
                <p className="text-muted-foreground">Start a new collaboration session</p>
              </div>
              
              <div className="space-y-4">
                <Input
                  placeholder="Session name"
                  className="bg-background/50 border-border"
                />
                <Button className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity">
                  <Code2 className="mr-2 w-5 h-5" />
                  Create Session
                </Button>
              </div>

              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground text-center">
                  A unique session code will be generated
                </p>
              </div>
            </Card>

            <Card className="card-glass p-8 space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground">Join Session</h3>
                <p className="text-muted-foreground">Enter a session code to join</p>
              </div>
              
              <div className="space-y-4">
                <Input
                  placeholder="Enter session code"
                  className="bg-background/50 border-border font-mono"
                />
                <Button 
                  variant="outline" 
                  className="w-full border-primary/50 hover:bg-primary/10"
                >
                  <Users className="mr-2 w-5 h-5" />
                  Join Session
                </Button>
              </div>

              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground text-center">
                  Get the code from your teammate
                </p>
              </div>
            </Card>
          </div>

          <Card className="card-glass p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Features</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-medium text-foreground">Real-time Sync</h4>
                <p className="text-sm text-muted-foreground">See changes instantly as others type</p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-secondary" />
                </div>
                <h4 className="font-medium text-foreground">Multi-cursor</h4>
                <p className="text-sm text-muted-foreground">See where everyone is coding</p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Copy className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-medium text-foreground">Easy Sharing</h4>
                <p className="text-sm text-muted-foreground">Share with a simple code</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LiveCollaboration;
