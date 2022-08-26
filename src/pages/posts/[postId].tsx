import { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useContext } from "react";
import {
	SUPABASE_BUCKET_NAME,
	SUPABASE_POST_TABLE,
} from "../../../utils/constants";
import { getHtmlFromMarkdown } from "../../../utils/getResources";
import { supabase } from "../../../utils/supabaseClient";
import { Blog } from "../../components/Blog";
import Layout from "../../components/Layout";
import PostWithBlogger from "../../interfaces/PostWithBlogger";
import { BlogProps } from "../../interfaces/PublicBlogProps";
import { UserContext } from "../_app";

function checkProps(props: BlogProps | {}): props is BlogProps {
	return (props as BlogProps).title !== undefined;
}

export default function PublicBlog(props: BlogProps | {}) {
	const { user } = useContext(UserContext);
	const router = useRouter();

	if (router.isFallback || !checkProps(props)) {
		console.log("rendering this");
		return (
			<Layout user={null} route={"/"} logoutCallback={() => null}>
				<div
					className={`mx-auto prose  max-w-none lg:w-5/6 xl:w-4/6 prose-headings:text-cyan-500 text-white prose-a:text-amber-400 prose-strong:text-amber-500
				prose-pre:m-0 prose-pre:p-0 animate-pulse
				`}
				>
					<h1 className="h-5 text-center bg-slate-600 rounded w-1/2 mx-auto"></h1>
					<p className="h-3 text-center italic bg-slate-600 rounded"></p>
					<div className="h-32 bg-slate-600 rounded"></div>
					<p className="h-3 text-center italic bg-slate-600 rounded"></p>
					<div className="h-32 bg-slate-600 rounded"></div>
					<p className="h-3 text-center italic bg-slate-600 rounded"></p>
					<div className="h-32 bg-slate-600 rounded"></div>
				</div>
			</Layout>
		);
	}

	return (
		<>
			<Head>
				<title>{props.title || ""}</title>
				<meta name="author" content={props.bloggers.name} />
				<meta name="description" content={props.description} />
				<meta name="keywords" content={props.language} />
			</Head>
			<Layout
				user={user || null}
				route={router.asPath}
				logoutCallback={() => null}
			>
				<Blog {...props} />
			</Layout>
		</>
	);
}

export const getStaticPaths: GetStaticPaths = async () => {
	return { paths: [], fallback: true };
};

export const getStaticProps: GetStaticProps<
	Partial<BlogProps>,
	{ postId: string }
> = async (context) => {
	const sleep = (seconds: number) =>
		new Promise((resolve) => setTimeout(resolve, seconds * 1000));

	await sleep(5);
	const { data, error } = await supabase
		.from<PostWithBlogger>(SUPABASE_POST_TABLE)
		.select("*, bloggers(name)")
		.match({ id: context.params?.postId });

	if (error || !data || data.length == 0) return { props: {} };

	const post = data[0];
	const filename = post.filename;
	const { data: fileData, error: fileError } = await supabase.storage
		.from(SUPABASE_BUCKET_NAME)
		.download(filename);

	if (fileError || !fileData) return { props: {} };
	const content = await getHtmlFromMarkdown(fileData);

	return {
		props: {
			...post,
			content,
		},
	};
};
