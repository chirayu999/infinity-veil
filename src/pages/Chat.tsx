import { MessageCircle } from "lucide-react";

export default function Chat() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
      <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center">
        <MessageCircle className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold text-foreground">Chat</h1>
      <p className="text-sm text-muted-foreground max-w-md">
        Communicate with your SOC team in real-time. This feature is coming soon.
      </p>
    </div>
  );
}
