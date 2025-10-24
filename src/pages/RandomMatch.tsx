import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, Shuffle, Code, Globe } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useNavigate } from "react-router-dom";

const RandomMatch = () => {
  const navigate = useNavigate();

  const skills = ["JavaScript", "Python", "React", "Node.js", "TypeScript", "Go"];
  const levels = ["Beginner", "Intermediate", "Advanced"];

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
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-secondary to-primary glow-secondary mb-4">
              <Shuffle className="w-10 h-10" />
            </div>
            <h1 className="text-5xl font-bold text-gradient">Random Match</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get paired with developers worldwide. Code together and learn from each other.
            </p>
          </div>

          <Card className="card-glass p-8 space-y-6">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-foreground">Set Your Preferences</h3>
              
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Skill Level</label>
                <div className="flex flex-wrap gap-2">
                  {levels.map((level) => (
                    <Badge
                      key={level}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/20 hover:border-primary transition-all px-4 py-2"
                    >
                      {level}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Programming Languages</label>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge
                      key={skill}
                      variant="outline"
                      className="cursor-pointer hover:bg-secondary/20 hover:border-secondary transition-all px-4 py-2"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <Button 
              className="w-full h-14 text-lg bg-gradient-to-r from-secondary to-primary hover:opacity-90 transition-opacity"
              size="lg"
            >
              <Shuffle className="mr-2 w-6 h-6" />
              Find a Match
            </Button>
          </Card>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="card-glass p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-primary">
                <Video className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-semibold text-foreground">Video Chat</h4>
              <p className="text-sm text-muted-foreground">
                Built-in video calling to discuss code and collaborate face-to-face
              </p>
            </Card>

            <Card className="card-glass p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center glow-secondary">
                <Code className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-semibold text-foreground">Shared Editor</h4>
              <p className="text-sm text-muted-foreground">
                Code together in real-time with syntax highlighting and auto-complete
              </p>
            </Card>

            <Card className="card-glass p-6 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-primary">
                <Globe className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-semibold text-foreground">Global Network</h4>
              <p className="text-sm text-muted-foreground">
                Connect with developers from around the world and expand your network
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RandomMatch;
