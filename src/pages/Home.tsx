import { useEffect, useMemo, useState } from "react";
import {
	MapPin,
	Megaphone,
	LoaderCircle,
	ArrowDown,
	Video,
} from "lucide-react";
import L from "leaflet";
import {
	MapContainer,
	Marker,
	Polyline,
	TileLayer,
	useMap,
} from "react-leaflet";

import BackButton from "../components/BackButton";
import LocationAutocomplete, {
	formatCoord,
	parseDualCoordPair,
	type LatLon,
} from "../components/LocationAutocomplete";
import CctvModal from "../components/CctvModal";
import {
	getFloodAwareRoutes,
	type RouteData,
	type RouteInfo,
} from "../lib/floodRoute";

function FitRouteBounds({ coordinates }: { coordinates: LatLon[] }) {
	const map = useMap();
	useEffect(() => {
		if (!coordinates.length) return;
		map.fitBounds(L.latLngBounds(coordinates), { padding: [48, 48] });
	}, [coordinates, map]);
	return null;
}

const liveIcon = L.divIcon({
	className: "",
	html: `
    <div class="relative flex h-8 w-8 items-center justify-center">
      <span class="cermat-ping absolute h-8 w-8 rounded-full bg-brand-400/50"></span>
      <span class="relative h-3.5 w-3.5 rounded-full bg-brand-500 ring-4 ring-white shadow-lg"></span>
    </div>
  `,
	iconSize: [32, 32],
	iconAnchor: [16, 16],
});

const destinationIcon = L.divIcon({
	className: "",
	html: `
    <svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22c0-7.732-6.268-14-14-14z" fill="#2F8AF0"/>
      <circle cx="14" cy="14" r="5" fill="white"/>
    </svg>
  `,
	iconSize: [28, 36],
	iconAnchor: [14, 36],
});

export default function Home() {
	const [expanded, setExpanded] = useState(false);
	const [originCoords, setOriginCoords] = useState<LatLon | null>(null);
	const [destCoords, setDestCoords] = useState<LatLon | null>(null);
	const [originExternal, setOriginExternal] = useState<{
		label: string;
		coords: LatLon;
	} | null>(null);
	const [destExternal, setDestExternal] = useState<{
		label: string;
		coords: LatLon;
	} | null>(null);
	const [routeData, setRouteData] = useState<RouteData | null>(null);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [activeCctv, setActiveCctv] = useState<{
		name: string;
		url: string;
	} | null>(null);

	// eslint-disable-next-line react-hooks/set-state-in-effect -- synchronize route lookup state with coordinates
	useEffect(() => {
		if (!originCoords || !destCoords) return;
		let cancelled = false;
		setLoading(true);
		setError(null);

		getFloodAwareRoutes(originCoords, destCoords)
			.then((data) => {
				if (cancelled) return;
				setRouteData(data);
				setSelectedIndex(
					data.recommended_route_index ?? data.routes[0]?.index ?? 0,
				);
				setExpanded(true);
			})
			.catch((err) => {
				if (cancelled) return;
				setError(err instanceof Error ? err.message : "Terjadi kesalahan");
				setRouteData(null);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [originCoords, destCoords]);

	function handleHeaderPaste(e: React.ClipboardEvent<HTMLDivElement>) {
		const text = e.clipboardData.getData("text");
		const dual = parseDualCoordPair(text);
		if (!dual) return;
		e.preventDefault();
		setOriginCoords(dual.origin);
		setDestCoords(dual.destination);
		setOriginExternal({ label: formatCoord(dual.origin), coords: dual.origin });
		setDestExternal({
			label: formatCoord(dual.destination),
			coords: dual.destination,
		});
	}

	// FIX: cari route berdasarkan field `index`, bukan posisi array —
	// posisi array bisa gak selaras kalau backend nge-skip/filter rute invalid.
	const activeRoute: RouteInfo | null =
		routeData?.routes.find((r) => r.index === selectedIndex) ??
		routeData?.routes[0] ??
		null;

	const sheetHeight = expanded ? 500 : activeRoute ? 286 : 206;
	const center = useMemo<LatLon>(
		() => originCoords || [-6.9667, 110.4167],
		[originCoords],
	);

	return (
		<main className="mx-auto flex h-[100dvh] w-full max-w-[560px] flex-col overflow-hidden bg-white shadow-xl sm:border-x sm:border-ink-100">
			<div
				className="relative z-[1000] bg-gradient-to-b from-brand-50 to-white px-5 pb-5 pt-5 sm:px-7 sm:pt-7"
				onPaste={handleHeaderPaste}>
				<BackButton title="Rute" />

				<div className="mt-5 flex flex-col gap-2.5">
					<LocationAutocomplete
						className="relative z-[20]"
						placeholder="Lokasi berangkat kamu"
						Icon={ArrowDown}
						onSelect={(coords) => setOriginCoords(coords)}
						externalValue={originExternal}
					/>

					<LocationAutocomplete
						className="relative z-[10]"
						placeholder="Titik tujuan kamu"
						Icon={MapPin}
						onSelect={(coords) => setDestCoords(coords)}
						externalValue={destExternal}
					/>
				</div>

				{error && (
					<div role="alert" className="mt-3 rounded-xl bg-danger-50 px-3 py-2 text-sm font-medium text-danger-500">
						{error}
					</div>
				)}
			</div>

			<div className="relative z-0 flex-1 overflow-hidden">
				<MapContainer
					center={center}
					zoom={14}
					scrollWheelZoom={false}
					className="h-full w-full">
					<TileLayer
						attribution="&copy; OpenStreetMap contributors"
						url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
					/>

					{originCoords && <Marker position={originCoords} icon={liveIcon} />}
					{destCoords && <Marker position={destCoords} icon={destinationIcon} />}

					{activeRoute && activeRoute.points?.length > 0 && (
						<>
							<Polyline
								positions={activeRoute.points}
								pathOptions={{ color: "#2f8af0", weight: 5, opacity: 0.9 }}
							/>
							<FitRouteBounds coordinates={activeRoute.points} />
						</>
					)}
				</MapContainer>
			</div>

			<div
				className="relative z-10 shrink-0 overflow-hidden rounded-t-[30px] bg-white shadow-[0_-10px_32px_rgba(11,18,32,0.12)] transition-all duration-300"
				style={{ height: sheetHeight }}>
				<button
					type="button"
					aria-label={expanded ? "Ciutkan detail rute" : "Lihat detail rute"}
					onClick={() => setExpanded(!expanded)}
					className="flex w-full items-center justify-center py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500">
					<div className="h-1.5 w-12 rounded-full bg-ink-300" />
				</button>

				<div
					className="overflow-y-auto px-5 pb-8 sm:px-7"
					style={{ height: sheetHeight - 48 }}>
					{loading && (
						<div className="flex items-center gap-3 rounded-2xl bg-brand-50 px-4 py-4 text-ink-700" role="status">
							<LoaderCircle size={20} className="animate-spin text-brand-500" />
							<p className="text-sm font-medium">Mencari rute teraman dari banjir...</p>
						</div>
					)}

					{!loading && !activeRoute && (
						<div className="rounded-2xl bg-ink-100/70 px-4 py-4">
							<p className="text-sm font-medium leading-6 text-ink-700">
								Masukkan lokasi berangkat dan tujuan untuk melihat rute tercepat.
							</p>
						</div>
					)}

					{!loading && activeRoute && (
						<>
							<div className="mb-4 flex items-end justify-between gap-4">
								<div>
									<p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">Rute terpilih</p>
									<p className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink-900">
										{Math.round(activeRoute.travel_time_in_seconds / 60)} menit
									</p>
								</div>
								<p className="pb-0.5 text-sm font-semibold text-ink-500">
									{(activeRoute.length_in_meters / 1000).toFixed(1)} km
								</p>
							</div>

							{activeRoute.floods.length === 0 ? (
								<div className="mt-4 rounded-2xl bg-brand-50 px-4 py-3">
									<p className="text-sm text-ink-900">
										Tidak ada titik banjir terdeteksi di rute ini.
									</p>
								</div>
							) : (
								activeRoute.floods.map((flood, i) => (
									<div
										key={`${flood.name}-${i}`}
										className="mt-3 flex items-start gap-3 rounded-2xl bg-alert-50 px-4 py-4">
										<div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/80">
											<Megaphone aria-hidden="true" size={18} className="text-alert-500" />
										</div>
										<div className="min-w-0 flex-1">
											<p className="text-[15px] leading-6 text-ink-900">
												<span className="font-display font-bold">Banjir</span> di {flood.name}
											</p>
											<p className="mt-0.5 text-sm font-medium text-ink-500">
												{Math.round(flood.flood_confidence * 100)}% tingkat keyakinan
											</p>
											{flood.stream_url && (
												<button
													type="button"
													onClick={() =>
														setActiveCctv({ name: flood.name, url: flood.stream_url! })
													}
													className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-alert-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-transform hover:bg-alert-500/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-alert-500 focus-visible:ring-offset-2">
													<Video aria-hidden="true" size={16} />
													Lihat CCTV langsung
												</button>
											)}
										</div>
									</div>
								))
							)}

							{routeData && routeData.routes.length > 1 && (
								<div className="mt-8">
									<div className="flex items-end justify-between gap-4">
										<div>
											<p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">
												Pilihan rute lain
											</p>
											<p className="mt-1 text-sm text-ink-500">Bandingkan keamanan dan waktu tempuh</p>
										</div>
									</div>
									<div className="mt-3 flex flex-col gap-2">
										{routeData.routes.map((r) => (
														<button
															type="button"
															key={r.index}
															aria-pressed={r.index === selectedIndex}
															onClick={() => setSelectedIndex(r.index)}
															className={`flex min-h-16 items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
																r.index === selectedIndex
																	? "border-brand-500 bg-brand-50 shadow-sm"
																	: "border-ink-200 bg-white hover:border-brand-300"
																}`}>
																<span className="font-display text-sm font-bold text-ink-900">
																	{Math.round(r.travel_time_in_seconds / 60)} menit{" "}
																	<span className="font-medium text-ink-500">
																		&middot; {(r.length_in_meters / 1000).toFixed(1)} km
																	</span>
																</span>
																<span
																	className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
																		r.floods.length === 0
																		? "bg-brand-100 text-brand-700"
																		: "bg-alert-50 text-alert-500"
																	}`}>
																	{r.floods.length === 0
																		? "Aman"
																		: `${r.floods.length} titik banjir`}
																</span>
															</button>
										))}
									</div>
								</div>
							)}
						</>
					)}
				</div>
			</div>

			{activeCctv && (
				<CctvModal
					name={activeCctv.name}
					streamUrl={activeCctv.url}
					onClose={() => setActiveCctv(null)}
				/>
			)}
		</main>
	);
}
