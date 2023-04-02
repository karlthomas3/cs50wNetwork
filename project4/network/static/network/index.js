document.addEventListener("DOMContentLoaded", function () {
	document.querySelector("#all-posts").addEventListener("click", () => {
		all_posts();
	});

	let post_form = document.querySelector("#post-form");
	if (post_form) {
		post_form.addEventListener("submit", function (event) {
			add_post(event);
		});
	}

	let follow_view_link = document.querySelector("#follow-view");
	if (follow_view_link) {
		follow_view_link.addEventListener("click", () => {
			follow_feed();
		});
	}

	let user_profile = document.querySelectorAll(".user-profile");
	user_profile.forEach((entry) => {
		entry.addEventListener("click", function (event) {
			profile(this.textContent);
		});
	});

	// default is to load all posts
	all_posts();
});

function add_post(event) {
	// stop the submit button from loading a page
	event.preventDefault();
	// we need the csrf token for post
	const csrfToken = document.getElementsByName("csrfmiddlewaretoken")[0]
		.value;

	// send the post
	fetch("/compose", {
		method: "POST",
		body: JSON.stringify({
			text: document.querySelector("#post-text").value,
		}),
		headers: {
			"Content-Type": "application/json",
			"X-CSRFToken": csrfToken,
		},
	})
		.then((response) => response.json())
		.then((result) => {
			// Print result
			console.log(result);
			// and refresh feed
			posts("all");
		})
		.catch((error) => {
			console.error(error);
		});
}

function posts(feed, page = 1) {
	// clear feed and post entry field
	document.querySelector("#feed").innerHTML = "";
	let post_text = document.querySelector("#post-text");
	if (post_text) {
		post_text.value = "";
	}

	// get the whole feed
	fetch(`/posts/${feed}/${page}`)
		.then((response) => response.json())
		.then((data) => {
			const posts = data.posts;
			// Print result
			console.log(data);
			posts.forEach((post) => {
				// make a box for each post
				const element = document.createElement("div");
				element.className = "box";
				element.id = `post${post.id}`;
				document.querySelector("#feed").append(element);

				// sub-divs for each detail
				const user = document.createElement("div");
				const edit = document.createElement("div");
				const text = document.createElement("div");
				const timestamp = document.createElement("div");
				const likes = document.createElement("div");
				const like_count = document.createElement("div");

				// assign values to divs
				user.innerHTML = `<strong>${post.user}</strong>`;
				text.innerHTML = post.text;
				timestamp.innerHTML = post.timestamp;
				like_count.innerHTML = `Likes: ${post.likes}`;
				likes.append(like_count);

				// add edit button if user owns post
				if (post.user == data.current_user) {
					const edit_btn = document.createElement("button");
					edit_btn.id = `edit${post.id}`;
					edit_btn.className = "btn btn-link btn-sm";
					edit_btn.textContent = "Edit";
					edit.style.marginLeft = "-1%";
					edit.append(edit_btn);
					edit.addEventListener("click", () => {
						compose_edit(post, text.id);
					});
				}

				// style
				user.className = "user-profile";
				user.addEventListener("click", () => {
					profile(post.user);
				});
				text.id = `${element.id}-text`;
				timestamp.id = `${element.id}-timestamp`;
				likes.id = `${element.id}-likes`;
				like_count.id = `like-count${post.id}`;

				// append sub-divs
				element.append(user, edit, text, timestamp, likes);

				//like button
				if (data.logged_in) {
					let like_btn = document.createElement("button");
					like_btn.className = "btn btn-link btn-sm";
					like_btn.style.marginLeft = "-1%";
					like_btn.id = `like-btn${post.id}`;

					if (post.liked.includes(`${data.current_user}`)) {
						like_btn.textContent = "Unlike";
					} else {
						like_btn.textContent = "Like";
					}
					like_btn.addEventListener("click", () => {
						like_post(post);
					});
					document.querySelector(`#${likes.id}`).append(like_btn);
				}
			});

			// manage pagination
			const previous_btn = document.querySelector("#previous-btn");
			const next_btn = document.querySelector("#next-btn");

			if (data.previous) {
				previous_btn.style.display = "inline";
				previous_btn.onclick = () => {
					page_btn(feed, page - 1);
				};
			} else {
				previous_btn.style.display = "none";
			}
			if (data.next) {
				next_btn.style.display = "inline";
				next_btn.onclick = () => {
					page_btn(feed, page + 1);
				};
			} else {
				next_btn.style.display = "none";
			}
		})
		.catch((error) => {
			console.error(error);
		});
}

function all_posts() {
	// change view
	document.querySelector("#all-title").style.display = "block";
	document.querySelector("#profile-view").style.display = "none";
	let compose_view = document.querySelector("#compose-view");
	if (compose_view) {
		compose_view.style.display = "block";
	}
	//load posts
	posts("all");
}

function profile(userP) {
	// change view
	document.querySelector("#all-title").style.display = "none";
	document.querySelector("#profile-view").style.display = "block";
	document.querySelector("#profile-name").textContent = userP;
	let compose_view = document.querySelector("#compose-view");
	if (compose_view) {
		compose_view.style.display = "none";
	}

	//fetch data on followers
	fetch(`/profile/${userP}`)
		.then((response) => response.json())
		.then((data) => {
			// make divs for the info
			const following_count = document.createElement("div");
			const followers_count = document.createElement("div");

			// add info to divs
			following_count.innerHTML = `Following ${data.following_count} users`;
			followers_count.innerHTML = `${data.followers_count} users following ${userP}`;

			// style
			following_count.className = "page-title";
			followers_count.className = "page-title";
			// clear profile view and append divs
			document.querySelector("#follow-counts").innerHTML = "";
			document
				.querySelector("#follow-counts")
				.append(following_count, followers_count);

			// check if viewing own profile before displaying follow button
			// and make sure the button exists before playing with it
			const fbtn = document.querySelector("#follow-button");
			if (fbtn) {
				if (data.same) {
					fbtn.style.display = "none";
				} else {
					fbtn.style.display = "block";
				}
				// change button based on whether following
				if (data.following) {
					fbtn.textContent = "Unfollow";
				} else {
					fbtn.textContent = "Follow";
				}
				// send the request to change follow status
				// we need the csrf token for post
				const csrfToken = document.getElementsByName(
					"csrfmiddlewaretoken"
				)[0].value;
				fbtn.addEventListener("click", () => {
					fetch("follow", {
						method: "POST",
						body: JSON.stringify({
							target: userP,
						}),
						headers: {
							"Content-Type": "application/json",
							"X-CSRFToken": csrfToken,
						},
					}).then(() => profile(userP));
				});
			}
		});
	// load profiles posts
	posts(userP);
}

function follow_feed() {
	//change views
	document.querySelector("#all-title").style.display = "none";
	document.querySelector("#compose-view").style.display = "none";
	document.querySelector("#profile-view").style.display = "none";
	// load feed
	posts("follow");
}

// abstracted button out of 'posts' to resolve error
function page_btn(feed, page) {
	document.querySelector("#feed").innerHTML = "";
	posts(feed, page);
}

function compose_edit(post, text_id) {
	console.log(post);
	// grab feed
	const old_post = document.querySelector(`#${text_id}`);
	const old_text = old_post.textContent;
	let post_likes = document.querySelector(`#post${post.id}-likes`);
	let post_time = document.querySelector(`#post${post.id}-timestamp`);
	let edit_btn = document.querySelector(`#edit${post.id}`);

	// clear space and text then replace with form
	post_time.style.display = "none";
	post_likes.style.display = "none";
	edit_btn.style.display = "none";
	old_post.innerHTML = "";
	const edit_form = document.createElement("div");
	old_post.append(edit_form);

	const new_text = document.createElement("textarea");
	const edit_submit = document.createElement("button");

	new_text.value = old_text;
	edit_submit.textContent = "Edit";
	edit_submit.className = "btn btn-outline-primary btn-sm";

	//edit the post and put everything back
	edit_submit.addEventListener("click", () => {
		edit_post(post, new_text.value);
		old_post.innerHTML = new_text.value;
		post_likes.style.display = "inline";
		post_time.style.display = "inline";
		edit_btn.style.display = "inline";
	});

	edit_form.append(new_text, edit_submit);
}

function edit_post(post, text) {
	const csrfToken = document.getElementsByName("csrfmiddlewaretoken")[0]
		.value;
	// update post
	fetch(`edit/${post.id}`, {
		method: "PUT",
		body: JSON.stringify({
			text: text,
		}),
		headers: {
			"Content-Type": "application/json",
			"X-CSRFToken": csrfToken,
		},
	});
}

function like_post(post) {
	const like_count = document.querySelector(`#like-count${post.id}`);
	const like_button = document.querySelector(`#like-btn${post.id}`);

	const csrfToken = document.getElementsByName("csrfmiddlewaretoken")[0]
		.value;
	fetch(`/like/${post.id}`, {
		method: "PUT",
		body: JSON.stringify({
			like: "like",
		}),
		headers: {
			"Content-Type": "application/json",
			"X-CSRFToken": csrfToken,
		},
	})
		.then((response) => response.json())
		.then((data) => {
			like_count.textContent = `Likes: ${data.post.likes}`;
			like_button.textContent = `${data.status};`;
		});
}
