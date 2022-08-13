import { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

export const handleSignIn = async (redirectTo: string) => {
    console.log(redirectTo)
    const { error } = await supabase.auth.signIn(
        {
            provider: "github",
        },
        { redirectTo: `http://localhost:3000${redirectTo}` }
    );
    if (error) {
        alert(error.message);
        return;
    }
    // router.replace("/");
}

export const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        alert(error.message);
        console.log(error);
        return;
    }
};
export const notifyServer = (event: AuthChangeEvent, session: Session | null) => {
    fetch("/api/auth", {
        method: "POST",
        headers: new Headers({
            "Content-Type": "application/json",
        }),
        credentials: "same-origin",
        body: JSON.stringify({ event, session }),
    }).catch((err) => console.log(err.message));
}