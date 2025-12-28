import { AndroidControl } from "@/components/android-control"

export default function ControlPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  return <AndroidControl paramsPromise={params} />
}
