"use client"

import { useState } from "react"

import { memberInitials, type Member } from "@/lib/members"
import { cn } from "@/lib/utils"

const colors = [
  "bg-indigo-500/20 text-indigo-200 ring-indigo-400/30",
  "bg-violet-500/20 text-violet-200 ring-violet-400/30",
  "bg-cyan-500/20 text-cyan-200 ring-cyan-400/30",
  "bg-emerald-500/20 text-emerald-200 ring-emerald-400/30",
  "bg-amber-500/20 text-amber-100 ring-amber-400/30",
  "bg-pink-500/20 text-pink-200 ring-pink-400/30",
] as const

function memberColor(name: string) {
  const score = Array.from(name).reduce((total, character) => total + character.codePointAt(0)!, 0)
  return colors[score % colors.length]
}

export function MemberAvatar({ member, size = "md", className }: { member: Pick<Member, "name" | "avatar_url">; size?: "xs" | "sm" | "md"; className?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const showImage = Boolean(member.avatar_url && failedUrl !== member.avatar_url)

  return (
    <span className={cn(
      "relative grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold ring-1",
      memberColor(member.name),
      size === "xs" && "size-6 text-[8px]",
      size === "sm" && "size-8 text-[10px]",
      size === "md" && "size-10 text-xs",
      className
    )}>
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={member.avatar_url!} alt="" className="absolute inset-0 size-full object-cover" onError={() => setFailedUrl(member.avatar_url)} />
      )}
      <span aria-hidden={showImage}>{memberInitials(member.name)}</span>
    </span>
  )
}
