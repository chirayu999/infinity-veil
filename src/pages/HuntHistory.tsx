import { Search } from "lucide-react";

export default function HuntHistory() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
      <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold text-foreground">Hunt History</h1>
      <p className="text-sm text-muted-foreground max-w-md">
        Browse past threat hunts, results, and coverage reports. This feature is coming soon.
      </p>
    </div>
  );
}
