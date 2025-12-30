import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function UnauthorizedPage() {
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <h1 className="text-4xl font-bold">Unauthorized 401</h1>
            <p className="text-lg">Please login to access this page.</p>
            <Button asChild >
                <Link href="/auth">Go to login</Link>
            </Button>
        </div>
    );
}