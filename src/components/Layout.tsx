import { User } from "@supabase/supabase-js";
import { useRouter } from "next/router";
import React from "react";
import Navbar from "./Navbar";

const Layout: React.FC<{
	children: JSX.Element[] | JSX.Element;
	user: User | null;
	route: string;
	logoutCallback: () => void;
}> = ({ children, user, route, logoutCallback }) => {
	const router = useRouter();
	return (
		<div className="relative min-h-screen h-max w-full sm:w-3/4 md:w-3/5 lg:w-35 mx-auto p-2">
			<Navbar {...{ user, route, logoutCallback }} />
			{children}
		</div>
	);
};

export default Layout;
