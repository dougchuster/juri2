import { redirect } from "next/navigation";
import { getPendingMfaLoginState } from "@/actions/auth";
import { MfaChallengeForm } from "./ui";

export default async function LoginMfaPage() {
    const state = await getPendingMfaLoginState();
    if (!state) {
        redirect("/login");
    }

    return <MfaChallengeForm state={{ ...state, expiresAt: state.expiresAt.toISOString() }} />;
}
