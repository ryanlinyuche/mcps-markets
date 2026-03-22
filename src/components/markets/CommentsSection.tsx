'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Heart, Trash2, Reply, Lock } from 'lucide-react'
import { toast } from 'sonner'

interface Comment {
  id: number
  parent_id: number | null
  content: string
  created_at: string
  user_id: number
  user_name: string
  like_count: number
  user_liked: number
}

interface Props {
  marketId: number
  isAdmin: boolean
  isLoggedIn: boolean
  commentsRestricted: boolean
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0 select-none">
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

interface CommentItemProps {
  comment: Comment
  isAdmin: boolean
  currentUserId: number | null
  onDelete: (id: number) => void
  onLike: (id: number) => void
  onReply: (parentId: number, parentName: string) => void
  isReply?: boolean
}

function CommentItem({ comment, isAdmin, currentUserId, onDelete, onLike, onReply, isReply }: CommentItemProps) {
  const canDelete = isAdmin || currentUserId === comment.user_id
  const liked = !!comment.user_liked

  return (
    <div className={`flex gap-2.5 ${isReply ? 'ml-9' : ''}`}>
      <Avatar name={comment.user_name} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <Link
            href={`/profile/${comment.user_id}`}
            className="text-sm font-semibold hover:underline"
          >
            {comment.user_name}
          </Link>
          <span className="text-xs text-muted-foreground">{timeAgo(comment.created_at)}</span>
        </div>
        <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{comment.content}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <button
            onClick={() => onLike(comment.id)}
            className={`flex items-center gap-1 text-xs transition-colors ${
              liked
                ? 'text-red-500 dark:text-red-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Heart size={12} fill={liked ? 'currentColor' : 'none'} />
            {comment.like_count > 0 && <span>{comment.like_count}</span>}
          </button>
          {!isReply && (
            <button
              onClick={() => onReply(comment.id, comment.user_name)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Reply size={12} />
              Reply
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(comment.id)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              <Trash2 size={12} />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function CommentsSection({ marketId, isAdmin, isLoggedIn, commentsRestricted: initialRestricted }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newContent, setNewContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replySubmitting, setReplySubmitting] = useState(false)
  const [restricted, setRestricted] = useState(initialRestricted)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const replyRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setRestricted(initialRestricted)
  }, [initialRestricted])

  useEffect(() => {
    fetchComments()
    // Get current user id from session info embedded in API
  }, [marketId])

  async function fetchComments() {
    try {
      const res = await fetch(`/api/markets/${marketId}/comments`)
      if (res.ok) {
        const data = await res.json()
        setComments(data)
        // Try to detect user_id from liked comments (hacky but avoids extra API call)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newContent.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/markets/${marketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setNewContent('')
        fetchComments()
      } else {
        toast.error(data.error || 'Failed to post comment')
      }
    } catch {
      toast.error('Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReplySubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!replyContent.trim() || !replyTo) return
    setReplySubmitting(true)
    try {
      const res = await fetch(`/api/markets/${marketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent.trim(), parent_id: replyTo.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setReplyContent('')
        setReplyTo(null)
        fetchComments()
      } else {
        toast.error(data.error || 'Failed to post reply')
      }
    } catch {
      toast.error('Failed to post reply')
    } finally {
      setReplySubmitting(false)
    }
  }

  async function handleDelete(commentId: number) {
    const res = await fetch(`/api/markets/${marketId}/comments/${commentId}`, { method: 'DELETE' })
    if (res.ok) {
      fetchComments()
    } else {
      const data = await res.json()
      toast.error(data.error || 'Failed to delete comment')
    }
  }

  async function handleLike(commentId: number) {
    if (!isLoggedIn) { toast.error('Sign in to like comments'); return }
    // Optimistic update
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        const nowLiked = !c.user_liked
        return { ...c, user_liked: nowLiked ? 1 : 0, like_count: c.like_count + (nowLiked ? 1 : -1) }
      }
      return c
    }))
    try {
      await fetch(`/api/markets/${marketId}/comments/${commentId}/like`, { method: 'POST' })
    } catch {
      // revert on error
      fetchComments()
    }
  }

  async function handleToggleRestrict() {
    const res = await fetch(`/api/admin/markets/${marketId}/restrict-comments`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      setRestricted(!!data.comments_restricted)
      toast.success(data.comments_restricted ? 'Comments restricted' : 'Comments unrestricted')
    } else {
      toast.error('Failed to update restriction')
    }
  }

  function handleReply(parentId: number, parentName: string) {
    if (!isLoggedIn) { toast.error('Sign in to reply'); return }
    setReplyTo({ id: parentId, name: parentName })
    setTimeout(() => replyRef.current?.focus(), 50)
  }

  // Build threaded structure: top-level comments + their replies
  const topLevel = comments.filter(c => !c.parent_id)
  const repliesMap: Record<number, Comment[]> = {}
  comments.filter(c => c.parent_id).forEach(c => {
    const pid = c.parent_id!
    if (!repliesMap[pid]) repliesMap[pid] = []
    repliesMap[pid].push(c)
  })

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          Comments
          {comments.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">({comments.length})</span>
          )}
        </h3>
        {isAdmin && (
          <button
            onClick={handleToggleRestrict}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
              restricted
                ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20'
                : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            <Lock size={11} />
            {restricted ? 'Restricted' : 'Restrict Comments'}
          </button>
        )}
      </div>

      {/* Restricted banner */}
      {restricted && (
        <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl px-3 py-2">
          <Lock size={13} />
          Comments are restricted on this market.
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Loading comments...</p>
      ) : topLevel.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No comments yet. Be the first!</p>
      ) : (
        <div className="space-y-4 divide-y divide-border">
          {topLevel.map(comment => (
            <div key={comment.id} className="space-y-3 pt-4 first:pt-0">
              <CommentItem
                comment={comment}
                isAdmin={isAdmin}
                currentUserId={currentUserId}
                onDelete={handleDelete}
                onLike={handleLike}
                onReply={handleReply}
              />
              {/* Replies */}
              {repliesMap[comment.id]?.map(reply => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  isAdmin={isAdmin}
                  currentUserId={currentUserId}
                  onDelete={handleDelete}
                  onLike={handleLike}
                  onReply={handleReply}
                  isReply
                />
              ))}
              {/* Inline reply form */}
              {replyTo?.id === comment.id && (
                <form onSubmit={handleReplySubmit} className="ml-9 flex gap-2 items-start">
                  <div className="flex-1">
                    <textarea
                      ref={replyRef}
                      value={replyContent}
                      onChange={e => setReplyContent(e.target.value)}
                      placeholder={`Reply to ${replyTo.name}...`}
                      rows={2}
                      maxLength={500}
                      className="w-full text-sm rounded-xl border border-border bg-background px-3 py-2 resize-none outline-none focus:border-primary/60 transition-colors placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="submit"
                      disabled={replySubmitting || !replyContent.trim()}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {replySubmitting ? '...' : 'Reply'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReplyTo(null)}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New comment input */}
      {isLoggedIn && !restricted && (
        <form onSubmit={handleSubmit} className="flex gap-2 items-start pt-2 border-t border-border">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
              maxLength={500}
              className="w-full text-sm rounded-xl border border-border bg-background px-3 py-2 resize-none outline-none focus:border-primary/60 transition-colors placeholder:text-muted-foreground"
            />
            {newContent.length > 450 && (
              <p className="text-xs text-muted-foreground mt-0.5 text-right">{newContent.length}/500</p>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting || !newContent.trim()}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
          >
            {submitting ? '...' : 'Post'}
          </button>
        </form>
      )}
      {!isLoggedIn && !restricted && (
        <div className="pt-2 border-t border-border text-center">
          <a href="/login" className="text-sm text-primary hover:underline font-medium">Sign in to comment</a>
        </div>
      )}
      {restricted && isLoggedIn && !isAdmin && (
        <div className="pt-2 border-t border-border text-center text-sm text-muted-foreground">
          Comments are restricted on this market.
        </div>
      )}
    </div>
  )
}
