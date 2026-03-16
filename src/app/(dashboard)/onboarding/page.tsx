import { redirect } from "next/navigation";
import { getSession } from "@/actions/auth";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default async function OnboardingPage() {
    const session = await getSession();
    if (!session) redirect("/login");
    if (session.onboardingCompleted) redirect("/dashboard");

    return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
            <div className="w-full max-w-2xl">
                <div className="text-center mb-8">
                    <h1 className="font-display text-3xl font-bold text-text-primary">
                        Bem-vindo, {session.name.split(" ")[0]}!
                    </h1>
                    <p className="text-text-muted mt-2">
                        Vamos configurar seu escritório em poucos minutos.
                    </p>
                </div>
                <OnboardingWizard
                    userName={session.name}
                    userOab={session.advogado?.oab ?? undefined}
                    userUfOab={session.advogado?.seccional ?? undefined}
                />
            </div>
        </div>
    );
}
