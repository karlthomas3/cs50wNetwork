from django.contrib import admin

# Register your models here.
from .models import User, Post

class UserAdmin(admin.ModelAdmin):
    filter_horizontal = ('following',)

class PostAdmin(admin.ModelAdmin):
    filter_horizontal = ('likes',)

admin.site.register(User, UserAdmin)
admin.site.register(Post, PostAdmin)