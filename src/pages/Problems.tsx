import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Zap, Star } from "lucide-react";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useNavigate } from "react-router-dom";

const Problems = () => {
  const navigate = useNavigate();

  const problems = [
    {
      title: "Two Sum",
      difficulty: "Easy",
      points: 10,
      tags: ["Array", "Hash Table"],
      solved: 1234,
    },
    {
      title: "Binary Tree Traversal",
      difficulty: "Medium",
      points: 25,
      tags: ["Tree", "DFS"],
      solved: 856,
    },
    {
      title: "Dynamic Programming Challenge",
      difficulty: "Hard",
      points: 50,
      tags: ["DP", "Optimization"],
      solved: 342,
    },
  ];

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

        <div className="max-w-6xl mx-auto space-y-8 animate-slide-up">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary glow-primary mb-4">
              <Trophy className="w-10 h-10" />
            </div>
            <h1 className="text-5xl font-bold text-gradient">Problem Solving</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Sharpen your skills and climb the leaderboard by solving coding challenges
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="card-glass p-6 text-center space-y-2">
              <Target className="w-8 h-8 mx-auto text-primary" />
              <div className="text-3xl font-bold text-gradient">2,450</div>
              <p className="text-sm text-muted-foreground">Your Points</p>
            </Card>
            
            <Card className="card-glass p-6 text-center space-y-2">
              <Zap className="w-8 h-8 mx-auto text-secondary" />
              <div className="text-3xl font-bold text-gradient">42</div>
              <p className="text-sm text-muted-foreground">Problems Solved</p>
            </Card>
            
            <Card className="card-glass p-6 text-center space-y-2">
              <Star className="w-8 h-8 mx-auto text-primary" />
              <div className="text-3xl font-bold text-gradient">#127</div>
              <p className="text-sm text-muted-foreground">Global Rank</p>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">Available Challenges</h2>
              <div className="flex gap-2">
                <Badge variant="outline" className="cursor-pointer hover:bg-primary/20 hover:border-primary">
                  All
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-primary/20 hover:border-primary">
                  Easy
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-primary/20 hover:border-primary">
                  Medium
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-primary/20 hover:border-primary">
                  Hard
                </Badge>
              </div>
            </div>

            {problems.map((problem, index) => (
              <Card key={index} className="card-glass p-6 hover:scale-[1.02] transition-transform">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold text-foreground">{problem.title}</h3>
                      <Badge
                        variant="outline"
                        className={
                          problem.difficulty === "Easy"
                            ? "border-green-500/50 text-green-400"
                            : problem.difficulty === "Medium"
                            ? "border-yellow-500/50 text-yellow-400"
                            : "border-red-500/50 text-red-400"
                        }
                      >
                        {problem.difficulty}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Trophy className="w-4 h-4" />
                        {problem.points} points
                      </span>
                      <span>{problem.solved} solved</span>
                      <div className="flex gap-2">
                        {problem.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                    Solve
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Problems;
