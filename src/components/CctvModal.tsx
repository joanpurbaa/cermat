import { useEffect, useRef, useState } from "react";
import { X, Loader2, TriangleAlert } from "lucide-react";

interface CctvModalProps {
	streamUrl: string;
	name: string;
	onClose: () => void;
}

export default function CctvModal({
	streamUrl,
	name,
	onClose,
}: CctvModalProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

	useEffect(() => {
		let hls: import("hls.js").default | null = null;
		const video = videoRef.current;
		if (!video) return;

		async function setup() {
			// Safari & beberapa browser mobile support HLS native
			if (video!.canPlayType("application/vnd.apple.mpegurl")) {
				video!.src = streamUrl;
				video!.addEventListener("loadedmetadata", () => setStatus("ready"));
				video!.addEventListener("error", () => setStatus("error"));
				return;
			}

			try {
				const { default: Hls } = await import("hls.js");
				if (!Hls.isSupported()) {
					setStatus("error");
					return;
				}
				hls = new Hls();
				hls.loadSource(streamUrl);
				hls.attachMedia(video!);
				hls.on(Hls.Events.MANIFEST_PARSED, () => {
					setStatus("ready");
					video!.play().catch(() => {});
				});
				hls.on(Hls.Events.ERROR, (_evt, data) => {
					if (data.fatal) setStatus("error");
				});
			} catch {
				setStatus("error");
			}
		}

		setup();

		return () => {
			hls?.destroy();
		};
	}, [streamUrl]);

	return (
		<div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 px-6">
			<div className="w-full max-w-md overflow-hidden rounded-2xl bg-ink-950">
				<div className="flex items-center justify-between px-4 py-3">
					<p className="text-sm font-semibold text-white">CCTV &middot; {name}</p>
					<button onClick={onClose} className="rounded-full p-1 hover:bg-white/10">
						<X size={18} className="text-white" />
					</button>
				</div>

				<div className="relative aspect-video bg-black">
					{status === "loading" && (
						<div className="absolute inset-0 flex items-center justify-center">
							<Loader2 size={28} className="animate-spin text-white/70" />
						</div>
					)}
					{status === "error" && (
						<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
							<TriangleAlert size={24} className="text-alert-400" />
							<p className="text-sm text-white/70">
								Stream gagal dimuat. CCTV mungkin sedang offline.
							</p>
						</div>
					)}
					<video
						ref={videoRef}
						controls
						muted
						playsInline
						className={`h-full w-full ${status === "ready" ? "block" : "hidden"}`}
					/>
				</div>
			</div>
		</div>
	);
}
