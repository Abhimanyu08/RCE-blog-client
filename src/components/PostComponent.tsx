import Link from "next/link";
import { useRouter } from "next/router";
import { MouseEventHandler, useRef } from "react";
import { AiFillDelete, AiFillEdit } from "react-icons/ai";
import { BiUpvote } from "react-icons/bi";
import { TbNews, TbNewsOff } from "react-icons/tb";
import { ALLOWED_LANGUAGES } from "../../utils/constants";
import { PostComponentProps } from "../interfaces/PostComponentProps";

const langToBadgeColor: Record<typeof ALLOWED_LANGUAGES[number], string> = {
	javascript: "text-yellow-500",
	python: "text-green-500",
	rust: "text-red-500",
};

const PostComponent: React.FC<PostComponentProps> = ({
	post,
	author,
	owner = false,
	setPostInAction,
}) => {
	const {
		id,
		title,
		description,
		created_by,
		published_on,
		published,
		upvote_count: upvotes,
		language,
		created_at,
	} = post;
	const router = useRouter();
	const formatter = useRef(Intl.NumberFormat("en", { notation: "compact" }));

	const onAction: MouseEventHandler = () => {
		if (setPostInAction) setPostInAction(post);
	};
	return (
		<div className="relative container">
			<Link href={published ? `/posts/${id}` : `/posts/preview/${id}`}>
				<div className="text-lg text-amber-500 md:text-xl font-semibold link link-hover truncate w-3/4">
					{title}{" "}
				</div>
			</Link>
			{owner && (
				<div className="flex absolute top-0 right-0 gap-2">
					{!published && (
						<label
							className="btn btn-xs btn-circle btn-ghost  tooltip tooltip-left capitalize"
							data-tip="edit"
							onClick={() =>
								router.push(`/posts/preview/${id}?edit=1`)
							}
						>
							<AiFillEdit
								className="ml-1 mt-1 text-white"
								size={15}
							/>
						</label>
					)}
					{published ? (
						<label
							htmlFor={`unpublish`}
							className="btn btn-xs btn-circle btn-ghost  tooltip tooltip-left capitalize"
							data-tip="unpublish"
							onClick={onAction}
						>
							<TbNewsOff
								className="ml-1 mt-1 text-white"
								size={15}
							/>
						</label>
					) : (
						<label
							htmlFor={`publish`}
							className="btn btn-xs btn-circle btn-ghost tooltip-left tooltip capitalize"
							data-tip="publish"
							onClick={onAction}
						>
							<TbNews
								className="ml-1 mt-1 text-white"
								size={15}
							/>
						</label>
					)}
					<label
						htmlFor={`delete`}
						className="btn btn-xs btn-circle btn-ghost  tooltip tooltip-left capitalize"
						data-tip="delete"
						onClick={onAction}
					>
						<AiFillDelete
							className="ml-1 mt-1 text-white"
							size={15}
						/>
					</label>
				</div>
			)}

			<div className="flex text-xs text-white/50 mt-1 mb-1 max-w-full">
				<Link href={`/profile/${created_by}`}>
					<p className="link link-hover border-r-2 border-white/30 pr-3 mr-3 w-1/3 md:w-1/5 truncate">
						{author}
					</p>
				</Link>
				<span className="border-r-2 border-white/30 pr-3 mr-3">
					{published && published_on
						? new Date(published_on).toDateString().slice(4)
						: new Date(created_at!).toDateString().slice(4)}
				</span>
				{published && (
					<span className="flex items-center gap-1 border-r-2 border-white/30 pr-3 mr-3">
						{upvotes &&
							upvotes > 0 &&
							formatter.current.format(upvotes)}{" "}
						<BiUpvote />
					</span>
				)}
				<div className={`${language && langToBadgeColor[language]}`}>
					{language}
				</div>
			</div>
			<p className="italic text-sm md:text-base text-white">
				{description}
			</p>
		</div>
	);
};

export default PostComponent;
