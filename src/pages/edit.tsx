import { useRouter } from "next/router";
import { useContext, useEffect, useState } from "react";
import { AiFillEdit } from "react-icons/ai";
import { BiImageAdd } from "react-icons/bi";
import { FaFileUpload } from "react-icons/fa";
import { FiCopy } from "react-icons/fi";
import { GiHamburgerMenu } from "react-icons/gi";
import { VscPreview } from "react-icons/vsc";
import {
	ALLOWED_LANGUAGES,
	PHOTO_LIMIT,
	SUPABASE_FILES_BUCKET,
	SUPABASE_IMAGE_BUCKET,
	SUPABASE_POST_TABLE,
} from "../../utils/constants";
import { getHtmlFromMarkdown } from "../../utils/getResources";
import makeFolderName from "../../utils/makeFolderName";
import { supabase } from "../../utils/supabaseClient";
import { Blog } from "../components/Blog";
import BlogLayout from "../components/BlogLayout";
import DeleteImagesModal from "../components/DeleteImagesModal";
import Layout from "../components/Layout";
import { Toc } from "../components/TableOfContents";
import useEditor from "../hooks/useEditor";
import usePrivatePostQuery from "../hooks/usePrivatePost";
import Post from "../interfaces/Post";
import { UserContext } from "./_app";

function Edit() {
	const { user } = useContext(UserContext);
	const router = useRouter();
	const { postId } = router.query;
	const [currPostId, setCurrPostId] = useState<number>();
	const { data, error, loading } = usePrivatePostQuery({
		postId: currPostId,
		loggedInUser: user || null,
	});

	const [showContent, setShowContents] = useState(false);
	const [editingMarkdown, setEditingMarkdown] = useState(true);
	const [hasMarkdownChanged, setHasMarkdownChanged] = useState(false);
	const [uploadingChanges, setUploadingChanges] = useState(false);
	const [images, setImages] = useState<File[]>([]);
	const [prevImages, setPrevImages] = useState<string[]>([]);
	const [imageToUrl, setImageToUrl] = useState<Record<string, string>>({});
	const [toBeDeletedFromStorage, setToBeDeletedFromStorage] = useState<
		string[]
	>([]);

	const [blogData, setBlogData] = useState<{
		title?: string;
		description?: string;
		language?: typeof ALLOWED_LANGUAGES[number];
		content?: string;
	}>({});

	const { editorView } = useEditor({
		language: "markdown",
		code: data?.markdown || "",
	});

	useEffect(() => {
		if (user && currPostId === undefined && typeof postId === "string") {
			setCurrPostId(parseInt(postId));
			let imageFolder =
				data?.image_folder || makeFolderName(user.id, postId);
			supabase.storage
				.from(SUPABASE_IMAGE_BUCKET)
				.list(imageFolder)
				.then((val) => {
					if (val.data) {
						setPrevImages(val.data.map((i) => i.name));
					}
				});
		}
	}, [postId]);

	useEffect(() => {
		setBlogData({
			title: data?.title,
			description: data?.description,
			language: data?.language,
			content: data?.content,
		});
	}, [data]);

	useEffect(() => {
		let obj: Record<string, string> = {};
		images.forEach((image) => {
			const imageName = image.name;
			if (Object.hasOwn(obj, imageName)) return;
			obj[imageName] = (window.URL || window.webkitURL).createObjectURL(
				image
			);
		});

		setImageToUrl(obj);
	}, [images]);

	useEffect(() => {
		if (!editorView) return;

		setHasMarkdownChanged(
			!(data?.markdown === editorView.state.doc.toJSON().join("\n"))
		);
	}, [editingMarkdown]);

	useEffect(() => {
		if (editingMarkdown) return;

		const markdown = editorView?.state.doc.toJSON().join("\n");
		if (!markdown) return;
		getHtmlFromMarkdown(markdown)
			.then(({ data, content }) => {
				setBlogData({
					title: data.title,
					description: data.description,
					language: data.language,
					content,
				});
			})
			.catch((e) => alert(e.message));
	}, [editingMarkdown]);

	const onNewPostUpload = async () => {
		if (!hasMarkdownChanged || !user || !editorView) return;

		setUploadingChanges(true);

		const markdown = editorView.state.doc.toJSON().join("\n");
		const newFile = new File([markdown], "");

		if (currPostId && data) {
			console.log(data.filename);
			const imageFolder = makeFolderName(user.id, currPostId);
			if (toBeDeletedFromStorage.length > 0) {
				await supabase.storage
					.from(SUPABASE_IMAGE_BUCKET)
					.remove(
						toBeDeletedFromStorage.map(
							(name) => `${imageFolder}/${name}`
						)
					);
			}

			//in case user didn't upload any images the first time
			if (images) {
				const imageResults = await Promise.all(
					images.map(async (image) => {
						const imagePath = imageFolder + `/${image.name}`;
						const result = await supabase.storage
							.from(SUPABASE_IMAGE_BUCKET)
							.upload(imagePath, image);
						return result;
					})
				);
				if (imageResults.some((res) => res.error !== null)) {
					alert("Error in uploading images, please retry");
					setUploadingChanges(false);
					return;
				}
			}
			await supabase.storage
				.from(SUPABASE_FILES_BUCKET)
				.update(data!.filename!, newFile)
				.then((val) => {
					if (val.error) return;
					return supabase
						.from<Post>(SUPABASE_POST_TABLE)
						.update({
							title: blogData.title,
							description: blogData.description,
							language: blogData.language,
						})
						.eq("id", currPostId);
				})
				.then((val) => {
					setUploadingChanges(false);
					if (val?.error) alert(val.error.message);
					if (val && val.data) {
						setHasMarkdownChanged(false);
						setEditingMarkdown(false);
						alert("Changes Uploaded Successfully");
					}
				});
			return;
		}
		const { data: insertPostData, error: insertPostError } = await supabase
			.from<Post>(SUPABASE_POST_TABLE)
			.insert({
				title: blogData?.title,
				description: blogData?.description,
				created_by: user.id,
				language: blogData?.language,
			});

		if (!insertPostData || insertPostError || insertPostData.length === 0) {
			alert(insertPostError?.message || "Could not create post");
			setUploadingChanges(false);
			return;
		}
		const blogFolder = makeFolderName(user.id, insertPostData.at(0)!.id!);
		const filePath = blogFolder + "/file.md";
		const { error: fileUploadError } = await supabase.storage
			.from(SUPABASE_FILES_BUCKET)
			.upload(filePath, newFile);
		if (fileUploadError) {
			alert(fileUploadError.message);
			setUploadingChanges(false);
			return;
		}

		await supabase
			.from<Post>(SUPABASE_POST_TABLE)
			.update({ image_folder: blogFolder, filename: filePath })
			.match({ id: insertPostData.at(0)?.id })
			.then((val) => {
				if (val.error) {
					setUploadingChanges(false);
					alert(val.error.message);
				}

				if (val.data) {
					alert("Post Uploaded sucessfully");
					setCurrPostId(val.data.at(0)?.id);
					setUploadingChanges(false);
					setHasMarkdownChanged(false);
				}
			});
	};

	if (error) {
		return (
			<Layout user={user || null} route={"/"} logoutCallback={() => null}>
				<p>Error in fetching post {error.message}</p>
			</Layout>
		);
	}

	if (loading) {
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
		<Layout user={user || null} route={router.asPath}>
			<DeleteImagesModal
				imageNames={[...prevImages, ...images.map((i) => i.name)]}
				{...{
					images,
					setImages,
					prevImages,
					setPrevImages,
					setToBeDeletedFromStorage,
				}}
			/>
			<BlogLayout>
				<div
					className={` md:basis-1/5 md:min-h-0 overflow-auto md:flex md:flex-col md:justify-center ${
						showContent ? "w-screen" : "hidden"
					}`}
				>
					<Toc
						html={blogData?.content || ""}
						setShowContents={setShowContents}
					/>
				</div>
				<div
					className={`md:basis-3/5 relative ${
						showContent ? "hidden" : "w-screen"
					}`}
				>
					<div
						className={`h-full ${
							editingMarkdown ? "invisible" : ""
						}`}
					>
						<Blog
							content={blogData?.content}
							title={blogData?.title}
							language={blogData?.language}
							description={blogData?.description}
							created_by={user?.id}
							imageToUrl={imageToUrl}
							image_folder={data?.image_folder}
						/>
					</div>
					<div
						className={`h-full pb-20 md:pb-0 overflow-y-auto absolute top-0 left-0 z-10 w-full ${
							editingMarkdown ? "" : "invisible"
						}`}
						id="markdown-textarea"
					></div>
				</div>
				<div className="hidden md:flex md:flex-col basis-1/5 max-w-full min-w-0 mt-44 pl-5 gap-6 z-20">
					<div
						className="btn btn-circle btn-ghost tooltip"
						data-tip={editingMarkdown ? "Preview" : "Edit Markdown"}
						onClick={() => setEditingMarkdown((prev) => !prev)}
					>
						{editingMarkdown ? (
							<VscPreview
								size={28}
								className="text-white mt-2 ml-2"
							/>
						) : (
							<AiFillEdit
								size={28}
								className="text-white mt-2 ml-2"
							/>
						)}
					</div>
					{user && (
						<div
							className="relative w-fit"
							onClick={onNewPostUpload}
						>
							<span
								className={`absolute rounded-full bg-yellow-400 w-2 h-2 right-0 ${
									hasMarkdownChanged ? "" : "hidden"
								} ${uploadingChanges ? "animate-ping" : ""}`}
							></span>
							<div
								className="btn btn-circle btn-ghost tooltip"
								data-tip={
									hasMarkdownChanged
										? `${
												currPostId
													? "Upload Changes"
													: "Upload Post"
										  }`
										: "No changes"
								}
							>
								<FaFileUpload
									size={28}
									className={` ${
										hasMarkdownChanged ? "text-white" : ""
									} mt-2 ml-2`}
								/>
							</div>
						</div>
					)}
					<div className="">
						<label
							className="btn btn-circle btn-ghost tooltip"
							data-tip={`Add Image`}
							htmlFor={
								images.length + prevImages.length < PHOTO_LIMIT
									? "extra-images"
									: "delete-images"
							}
						>
							<BiImageAdd size={32} className="mt-2 ml-2" />
						</label>
						<div
							className={`flex  bg-black p-1 rounded-lg text-white tooltip normal-case break-words w-2/3 cursor-pointer 
							${images.length > 0 ? "" : "hidden"}`}
							data-tip="Double click to copy"
							onDoubleClick={(e) =>
								navigator.clipboard.writeText(
									images.at(images.length - 1)?.name || ""
								)
							}
						>
							<span className="w-full select-all">
								{images.at(images.length - 1)?.name}
							</span>
						</div>
						<input
							type="file"
							name=""
							id="extra-images"
							className="hidden"
							accept="image/*"
							max={1}
							onChange={(e) => {
								setImages((prev) => [
									...prev,
									...Array.from(e.target.files || []),
								]);
							}}
						/>
					</div>
				</div>
			</BlogLayout>
			<footer className="w-full flex items-end md:hidden justify-between p-3 sticky bottom-0 left-0 bg-slate-800 border-t-2 border-white/25 z-50">
				<div
					className="flex flex-col items-center text-white gap-1"
					onClick={() => setEditingMarkdown((prev) => !prev)}
				>
					{editingMarkdown ? (
						<VscPreview size={20} className="text-white" />
					) : (
						<AiFillEdit size={20} className="text-white" />
					)}
					<span className="text-xs">
						{editingMarkdown ? "Preview" : "Edit"}
					</span>
				</div>

				<label
					className="flex flex-col items-center gap-1 text-white"
					htmlFor={false ? "extra-images" : "delete-images"}
				>
					<BiImageAdd size={22} className="mt-2 ml-2" />
					<span className="text-xs">Add Image</span>
				</label>
				<input
					type="file"
					name=""
					id="extra-images"
					className="hidden"
					accept="image/*"
					max={1}
					onChange={(e) =>
						setImages((prev) => [
							...prev,
							...Array.from(e.target.files || []),
						])
					}
				/>

				{images.length > 0 && (
					<div
						className="flex flex-col items-center gap-1 text-white w-1/5"
						onClick={() =>
							navigator.clipboard.writeText(
								images.at(images.length - 1)?.name || ""
							)
						}
					>
						<FiCopy size={20} />
						<span className="text-xs w-full truncate">
							Copy {images.at(images.length - 1)?.name}
						</span>
					</div>
				)}
				{user && (
					<div
						className="flex flex-col items-center w-fit gap-1"
						onClick={onNewPostUpload}
					>
						<div className="relative">
							<FaFileUpload
								size={18}
								className={` ${
									hasMarkdownChanged ? "text-white" : ""
								} mt-2 ml-2`}
							/>
							<span
								className={`absolute rounded-full bg-yellow-400 w-2 h-2 top-0 left-6 ${
									hasMarkdownChanged ? "" : "hidden"
								} ${uploadingChanges ? "animate-ping" : ""}`}
							></span>
						</div>

						<span className="text-xs text-white">
							{hasMarkdownChanged
								? `${currPostId ? "Save" : "Upload"}`
								: "No changes"}
						</span>
					</div>
				)}
				<div
					className="flex flex-col items-center gap-1 text-white"
					onClick={() => setShowContents((prev) => !prev)}
				>
					<GiHamburgerMenu size={18} />
					<span className="text-xs">Contents</span>
				</div>
			</footer>
		</Layout>
	);
}

export default Edit;