import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function ForbiddenPage() {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="flex justify-center">
                    <div className="rounded-full bg-destructive/10 p-4">
                        <ShieldX className="h-12 w-12 text-destructive" />
                    </div>
                </div>
                
                <div className="space-y-2">
                    <h1 className="text-4xl sm:text-5xl font-bold text-card-foreground">
                        403
                    </h1>
                    <h2 className="text-2xl sm:text-3xl font-semibold text-card-foreground">
                        Forbidden
                    </h2>
                </div>
                
                <p className="text-lg text-muted-foreground">
                    You don't have permission to access this page.
                </p>
                
                <div className="pt-4">
                    <Button asChild size="lg" className="w-full sm:w-auto">
                        <Link href="/dashboard">Go to Dashboard</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}

