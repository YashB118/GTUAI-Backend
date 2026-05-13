"use client";

import { useRouter } from "next/navigation";
import { CommunityChat } from "@/components/community/CommunityChat";

interface Props {
  params: { roomId: string };
}

export default function RoomPage({ params }: Props) {
  const { roomId } = params;
  const router = useRouter();

  return (
    <div className="h-full flex flex-col">
      <CommunityChat
        roomId={roomId}
        onLeave={() => router.push("/community")}
      />
    </div>
  );
}
