import type { CommentResponseDto } from '../dto/comment-response.dto.js';

export interface CommentWithAuthor {
  id: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    username: string;
    bio: string | null;
    image: string | null;
  };
}

export function mapComment(
  comment: CommentWithAuthor,
  following: boolean,
): CommentResponseDto {
  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    author: {
      username: comment.author.username,
      bio: comment.author.bio,
      image: comment.author.image,
      following,
    },
  };
}
