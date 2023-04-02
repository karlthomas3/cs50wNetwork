from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    following = models.ManyToManyField('self', blank=True, symmetrical=False, related_name='followers')

    def __str__(self):
        return self.username
    

class Post(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    text = models.CharField(max_length=280)
    timestamp = models.DateTimeField(auto_now_add=True)
    likes = models.ManyToManyField(User, blank=True, related_name='likes')

    def __str__(self):
        return self.text
    
    def serialize(self):
        liked = []
        for i in self.likes.all():
            liked.append(i.username)
        
        return {
            'id': self.id,
            'user': self.user.username,
            'text': self.text,
            'timestamp': self.timestamp.strftime('%b %d %Y, %I:%M %P'),
            'likes': self.likes.count(),
            'liked': liked,
            
        }