import json
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import render
from django.urls import reverse
from django.core.paginator import Paginator


from .models import User, Post


def index(request):
    return render(request, "network/index.html")


def posts(request, feed, page):
    if feed == "all":
        posts = Post.objects.all().order_by("-timestamp")
    elif feed == "follow":
        user = request.user
        follows = user.following.all()
        posts = Post.objects.filter(user__in=follows).order_by("-timestamp")
    else:
        user = User.objects.get(username=feed)
        posts = Post.objects.filter(user=user).order_by("-timestamp")

    # paginate the posts
    p = Paginator(posts, 10)
    current = p.page(page)
    posts = current.object_list
    # keep track of previous and next
    previous = current.has_previous()
    next = current.has_next()

    serialized_posts = [post.serialize() for post in posts]
    return JsonResponse(
        {
            "posts": serialized_posts,
            "previous": previous,
            "next": next,
            "page_num": page,
            "current_user": request.user.username,
            "logged_in": request.user.is_authenticated,
        },
        safe=False,
    )


def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(
                request,
                "network/login.html",
                {"message": "Invalid username and/or password."},
            )
    else:
        return render(request, "network/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(
                request, "network/register.html", {"message": "Passwords must match."}
            )

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(
                request, "network/register.html", {"message": "Username already taken."}
            )
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "network/register.html")


@login_required
def compose(request):
    # require login to post
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)
    # read json and create new post
    data = json.loads(request.body)
    user = request.user
    text = data.get("text", "")
    if text == "":
        return JsonResponse({"error": "Post cannot be empty."})
    post = Post(user=user, text=text)
    post.save()
    return JsonResponse({"message": "Posted successfully."}, status=201)


def profile(request, profile_name):
    # get users for profile and viewer of profile
    user = request.user
    profile = User.objects.get(username=profile_name)
    # check if viewing self
    if user == profile:
        same = True
    else:
        same = False
    # check if following only if logged in
    following = False
    if user.is_authenticated:
        follow_check = user.following.filter(id=profile.id) or None
        if follow_check:
            following = True

    following_count = profile.following.all().count()
    followers_count = profile.followers.all().count()
    return JsonResponse(
        {
            "following_count": following_count,
            "followers_count": followers_count,
            "same": same,
            "following": following,
        }
    )


@login_required
def follow_changer(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)
    # read json and create new post
    data = json.loads(request.body)
    user = request.user
    target = data.get("target", "")
    if user == target:
        return JsonResponse({"message": "User cannot follow self"})
    try:
        followed = user.following.get(username=target) or None
        user.following.remove(followed)
    except User.DoesNotExist:
        new = User.objects.get(username=target)
        user.following.add(new)
    return JsonResponse({"message": "some kind of helpful message"})


@login_required
def edit_post(request, post_id):
    if request.method != "PUT":
        return JsonResponse({"error": "PUT request required."}, status=400)
    # get the data
    data = json.loads(request.body)
    new_text = data.get("text", "")
    post = Post.objects.get(id=post_id)

    if post.user != request.user:
        return JsonResponse({"error": "User can only edit their own posts"}, status=400)

    # update post
    post.text = new_text
    post.save()

    return HttpResponse(status=204)


@login_required
def like_post(request, post_id):
    user = request.user
    post = Post.objects.get(id=post_id)
    like_list = post.likes.all()

    if user in like_list:
        post.likes.remove(user)
        status = "Like"
    else:
        post.likes.add(user)
        status = "Unlike"
    post.save()

    serialized_post = post.serialize()
    return JsonResponse(
        {
            "post": serialized_post,
            "status": status,
        }
    )
