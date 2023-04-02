
from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),

    # API Routes
    path("compose", views.compose, name="compose"),
    path("posts/<str:feed>/<int:page>", views.posts, name="posts"),
    path("profile/<str:profile_name>", views.profile, name="profile"),
    path("follow", views.follow_changer, name="follow"),
    path("edit/<int:post_id>", views.edit_post, name="edit_post"),
    path("like/<int:post_id>", views.like_post, name="like_post"),
]
