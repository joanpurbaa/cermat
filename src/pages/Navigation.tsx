import { useEffect, useMemo, useState } from "react";
import {
	MapPin,
	LoaderCircle,
	Target,
	X,
	Plus,
	Clock,
	Compass,
	ArrowLeft,
	Video,
	ListOrdered,
	RouteIcon,
	AlertTriangle,
	ShieldCheck,
} from "lucide-react";
import L from "leaflet";
import {
	CircleMarker,
	MapContainer,
	Marker,
	Polyline,
	Popup,
	TileLayer,
} from "react-leaflet";

import LocationAutocomplete, {
	formatCoord,
	parseDualCoordPair,
} from "../components/LocationAutocomplete";
import {
	getSafeRoutes,
	getVisionApiHealth,
	VisionApiError,
	type LatLon,
	type RouteView,
	type SafeRoutes,
	type VisionHealth,
} from "../lib/visionApi";
import ManeuverIcon from "../components/ManeuverIcon";
import CctvModal from "../components/CctvModal";

const liveIcon = L.divIcon({
	className: "",
	html: `
    <div class="relative flex h-8 w-8 items-center justify-center">
      <span class="cermat-ping absolute h-8 w-8 rounded-full bg-blue-500/30"></span>
      <span class="relative h-4 w-4 rounded-full bg-blue-600 ring-4 ring-white shadow-md"></span>
    </div>
  `,
	iconSize: [32, 32],
	iconAnchor: [16, 16],
});

const destinationIcon = L.divIcon({
	className: "",
	html: `
    <svg width="30" height="38" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22c0-7.732-6.268-14-14-14z" fill="#EF4444"/>
      <circle cx="14" cy="14" r="5" fill="white"/>
    </svg>
  `,
	iconSize: [30, 38],
	iconAnchor: [15, 38],
});

function getDistanceMeters(
	coord1: [number, number],
	coord2: [number, number],
): number {
	const R = 6371e3;
	const dLat = ((coord2[0] - coord1[0]) * Math.PI) / 180;
	const dLng = ((coord2[1] - coord1[1]) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((coord1[0] * Math.PI) / 180) *
			Math.cos((coord2[0] * Math.PI) / 180) *
			Math.sin(dLng / 2) * Math.sin(dLng / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

const ANOMALY_COLORS: Record<string, string> = {
	kemacetan: "#F59E0B",
	pohon_tumbang: "#16A34A",
	konstruksi: "#7C3AED",
	kecelakaan: "#DC2626",
};

const GUIDANCE_TOLERANCE_METERS = 30;


export default function Navigation() {
	const [screenState, setScreenState] = useState<"search" | "route">("search");
	const [expanded, setExpanded] = useState(false);

	const [originCoords, setOriginCoords] = useState<LatLon | null>(null);
	const [destCoords, setDestCoords] = useState<LatLon | null>(null);

	const [originLabel, setOriginLabel] = useState<string>("");
	const [destLabel, setDestLabel] = useState<string>("");

	const [activeTab, setActiveTab] = useState<"routes" | "instructions">(
		"routes",
	);

	const [currentLocation, setCurrentLocation] = useState<
		[number, number] | null
	>(null);

	useEffect(() => {
		if (!navigator.geolocation) return;

		const watchId = navigator.geolocation.watchPosition(
			(position) => {
				const { latitude, longitude } = position.coords;
				setCurrentLocation([latitude, longitude]);
			},
			(err) => console.warn("GPS error:", err.message),
			{ enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 },
		);

		return () => navigator.geolocation.clearWatch(watchId);
	}, []);

	// Event listener untuk preset rute dari panel kanan MainLayout
	useEffect(() => {
		const handlePresetSelect = (e: Event) => {
			const { origin, destination } = (
				e as CustomEvent<{
					origin: { name: string; coords: LatLon };
					destination: { name: string; coords: LatLon };
				}>
			).detail;
			setOriginCoords(origin.coords);
			setDestCoords(destination.coords);
			setOriginLabel(origin.name);
			setDestLabel(destination.name);
			// eslint-disable-next-line react-hooks/immutability
			setOriginExternal({ label: origin.name, coords: origin.coords });
			// eslint-disable-next-line react-hooks/immutability
			setDestExternal({ label: destination.name, coords: destination.coords });
		};

		window.addEventListener("SELECT_PRESET_ROUTE", handlePresetSelect);
		return () => {
			window.removeEventListener("SELECT_PRESET_ROUTE", handlePresetSelect);
		};
	}, []);

	const [originExternal, setOriginExternal] = useState<{
		label: string;
		coords: LatLon;
	} | null>(null);
	const [destExternal, setDestExternal] = useState<{
		label: string;
		coords: LatLon;
	} | null>(null);

	const [routeData, setRouteData] = useState<SafeRoutes | null>(null);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [errorDetail, setErrorDetail] = useState<string | null>(null);
	const [reloadKey, setReloadKey] = useState(0);
	const [health, setHealth] = useState<VisionHealth | null>(null);

	const [activeCctv, setActiveCctv] = useState<{
		name: string;
		url: string;
		label?: string;
	} | null>(null);

	useEffect(() => {
		let cancelled = false;
		getVisionApiHealth().then((result) => {
			if (!cancelled) setHealth(result);
		});

		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!originCoords || !destCoords) return;
		let cancelled = false;
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setLoading(true);
		setError(null);
		setErrorDetail(null);

		getSafeRoutes(originCoords, destCoords)
			.then((data) => {
				if (cancelled) return;
				if (data.routes.length === 0) {
					setRouteData(null);
					setError("Tidak ada rute yang bisa dihitung untuk tujuan tersebut.");
					return;
				}
				const recommended =
					data.routes.find((r) => r.index === data.recommended_route_index) ??
					data.routes[0];
				setRouteData(data);
				setSelectedIndex(recommended.index);
				setScreenState("route");
			})
			.catch((err) => {
				if (cancelled) return;
				if (err instanceof VisionApiError) {
					setError(err.message);
					setErrorDetail(err.serverMessage);
				} else {
					setError("Terjadi kesalahan saat menghitung rute.");
					setErrorDetail(err instanceof Error ? err.message : null);
				}
				setRouteData(null);
				getVisionApiHealth().then((result) => {
					if (!cancelled) setHealth(result);
				});
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [originCoords, destCoords, reloadKey]);

	function handleHeaderPaste(e: React.ClipboardEvent<HTMLDivElement>) {
		const text = e.clipboardData.getData("text");
		const dual = parseDualCoordPair(text);
		if (!dual) return;
		e.preventDefault();
		setOriginCoords(dual.origin);
		setDestCoords(dual.destination);
		setOriginLabel(formatCoord(dual.origin));
		setDestLabel(formatCoord(dual.destination));
		setOriginExternal({ label: formatCoord(dual.origin), coords: dual.origin });
		setDestExternal({
			label: formatCoord(dual.destination),
			coords: dual.destination,
		});
	}

	const handleQuickSelectDestination = (label: string, coords: LatLon) => {
		if (!originCoords) {
			const defaultOrigin: LatLon = [-6.9826, 110.4091];
			setOriginCoords(defaultOrigin);
			setOriginLabel("Tugu Muda Semarang");
			setOriginExternal({ label: "Tugu Muda Semarang", coords: defaultOrigin });
		}
		setDestLabel(label);
		setDestCoords(coords);
		setDestExternal({ label, coords });
	};

	const handleSelectOnMap = () => {
		const defaultOrigin: LatLon = [-6.9826, 110.4091];
		const defaultDest: LatLon = [-6.9801, 110.4078];
		setOriginCoords(defaultOrigin);
		setDestCoords(defaultDest);
		setOriginLabel("Tugu Muda Semarang");
		setDestLabel("Indraprasta");
		setOriginExternal({ label: "Tugu Muda Semarang", coords: defaultOrigin });
		setDestExternal({ label: "Indraprasta", coords: defaultDest });
	};

	const activeRoute: RouteView | null =
		routeData?.routes.find((r) => r.index === selectedIndex) ??
		routeData?.routes[0] ??
		null;

	const { passedPoints, remainingPoints, currentGuidanceIndex } = useMemo(() => {
		if (!activeRoute || !activeRoute.points || activeRoute.points.length === 0) {
			return {
				passedPoints: [],
				remainingPoints: [],
				currentGuidanceIndex: 0,
			};
		}

		const userPos = currentLocation || originCoords;
		if (!userPos) {
			return {
				passedPoints: [],
				remainingPoints: activeRoute.points,
				currentGuidanceIndex: 0,
			};
		}

		// 1. Cari titik rute terdekat dari lokasi user
		let closestIndex = 0;
		let minDistance = Infinity;

		activeRoute.points.forEach((pt, idx) => {
			const dist = getDistanceMeters([userPos[0], userPos[1]], pt);
			if (dist < minDistance) {
				minDistance = dist;
				closestIndex = idx;
			}
		});

		const passed = activeRoute.points.slice(0, closestIndex + 1);
		const remaining = activeRoute.points.slice(closestIndex);

		// 2. Jarak yang sudah ditempuh mengikuti polyline rute
		let traveledMeters = 0;
		for (let i = 1; i <= closestIndex; i++) {
			traveledMeters += getDistanceMeters(
				activeRoute.points[i - 1],
				activeRoute.points[i],
			);
		}

		// 3. Petunjuk aktif = instruksi terakhir yang sudah terlewati
		//    (route_offset_in_meters berasal dari TomTom via backend)
		let guidanceIdx = 0;
		const hasOffsets = activeRoute.guidance.some(
			(g) => (g.route_offset_in_meters ?? 0) > 0,
		);

		if (hasOffsets) {
			activeRoute.guidance.forEach((g, gIdx) => {
				if (
					(g.route_offset_in_meters ?? 0) <=
					traveledMeters + GUIDANCE_TOLERANCE_METERS
				) {
					guidanceIdx = gIdx;
				}
			});
		} else if (activeRoute.guidance.length > 0) {
			let minGuidanceDist = Infinity;

			activeRoute.guidance.forEach((g, gIdx) => {
				if (
					g.point &&
					typeof g.point.lat === "number" &&
					typeof g.point.lng === "number"
				) {
					const dist = getDistanceMeters(
						[userPos[0], userPos[1]],
						[g.point.lat, g.point.lng],
					);

					if (dist < minGuidanceDist) {
						minGuidanceDist = dist;
						guidanceIdx = gIdx;
					}
				}
			});
		}

		return {
			passedPoints: passed,
			remainingPoints: remaining,
			currentGuidanceIndex: guidanceIdx,
		};
	}, [activeRoute, currentLocation, originCoords]);

	// const { passedPoints, remainingPoints } = useMemo(() => {
	// 	if (!activeRoute || !activeRoute.points || activeRoute.points.length === 0) {
	// 		return { passedPoints: [], remainingPoints: [] };
	// 	}

	// 	const userPos = currentLocation || originCoords;
	// 	if (!userPos) {
	// 		return { passedPoints: [], remainingPoints: activeRoute.points };
	// 	}

	// 	let closestIndex = 0;
	// 	let minDistance = Infinity;

	// 	activeRoute.points.forEach((pt, idx) => {
	// 		const dist = getDistanceMeters([userPos[0], userPos[1]], pt);
	// 		if (dist < minDistance) {
	// 			minDistance = dist;
	// 			closestIndex = idx;
	// 		}
	// 	});

	// 	return {
	// 		passedPoints: activeRoute.points.slice(0, closestIndex + 1),
	// 		remainingPoints: activeRoute.points.slice(closestIndex),
	// 	};
	// }, [activeRoute, currentLocation, originCoords]);

	const sheetHeight = expanded ? 520 : activeRoute ? 330 : 180;
	const center = useMemo<LatLon>(
		() => originCoords || [-6.9667, 110.4167],
		[originCoords],
	);

	return (
		<div className="relative w-full h-full flex flex-col bg-slate-50">
			{screenState === "search" && (
				<div
					className="flex h-full w-full flex-col overflow-y-auto bg-white no-scrollbar"
					onPaste={handleHeaderPaste}>
					<div className="flex items-center gap-3 px-5 pt-4 pb-2">
						<button
							onClick={() => {
								setOriginCoords(null);
								setDestCoords(null);
								setOriginLabel("");
								setDestLabel("");
							}}
							className="rounded-full p-1.5 text-slate-800 hover:bg-slate-100 active:scale-95">
							<a href="/">
								<X size={20} />
							</a>
						</button>
						<h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
							Mau ke mana hari ini?
						</h1>
					</div>

					{health && (
						<div className="mx-5 mt-2 flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-500">
							<span
								className={`h-2 w-2 shrink-0 rounded-full ${
									health.online ? "bg-emerald-500" : "bg-red-500"
								}`}
							/>
							<span className="truncate">
								{health.online
									? "Semarang Vision AI online"
									: `Semarang Vision AI offline · ${health.message}`}
							</span>
						</div>
					)}

					<div className="mx-5 mt-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 px-4 py-2.5 shadow-sm transition-all focus-within:border-blue-500 focus-within:bg-white">
						<div className="flex items-center gap-3.5">
							<div className="flex w-4 shrink-0 flex-col items-center justify-center gap-0.5">
								<Target size={16} className="text-blue-600" />
								<div className="h-7 w-[1.5px] border-l border-dashed border-slate-300" />
								<MapPin size={16} className="text-red-500" />
							</div>

							<div className="flex flex-1 flex-col justify-center gap-0.5">
								<LocationAutocomplete
									className="relative z-[20]"
									placeholder="Lokasi kamu sekarang"
									onSelect={(coords, item) => {
										setOriginCoords(coords);
										if (item) setOriginLabel(item.name);
									}}
									externalValue={originExternal}
								/>
								<div className="border-b border-slate-100 my-1" />
								<LocationAutocomplete
									className="relative z-[10]"
									placeholder="Cari lokasi tujuan"
									onSelect={(coords, item) => {
										setDestCoords(coords);
										if (item) setDestLabel(item.name);
									}}
									externalValue={destExternal}
								/>
							</div>
						</div>
					</div>

					<div className="mx-5 mt-4 flex items-center gap-2">
						<button
							onClick={handleSelectOnMap}
							className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95">
							<Compass size={15} className="text-blue-600" />
							Pilih lewat peta
						</button>
						<button
							onClick={() => {
								const el = document.querySelector("input");
								if (el) el.focus();
							}}
							className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95">
							<Plus size={15} className="text-blue-600" />
							Tambah tujuan
						</button>
					</div>

					{error && (
						<div className="mt-3 px-5">
							<p className="text-center text-xs font-semibold text-red-500">
								{error}
							</p>
							{errorDetail && (
								<p className="mt-1 text-center text-[10px] leading-snug text-slate-400">
									{errorDetail}
								</p>
							)}
							<div className="mt-2 flex justify-center">
								<button
									onClick={() => setReloadKey((key) => key + 1)}
									className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95">
									Coba lagi
								</button>
							</div>
						</div>
					)}

					{loading && (
						<div className="mt-6 flex items-center justify-center gap-2 text-slate-500">
							<LoaderCircle size={20} className="animate-spin text-blue-600" />
							<span className="text-sm font-semibold">
								Menganalisis CCTV & menghitung rute teraman...
							</span>
						</div>
					)}

					<hr className="mx-5 my-5 border-slate-100" />

					<div className="flex-1 px-5 pb-6">
						<p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
							Riwayat & Rekomendasi
						</p>
						<div className="flex flex-col divide-y divide-slate-100">
							<div
								onClick={() =>
									handleQuickSelectDestination("Indraprasta", [-6.9801, 110.4078])
								}
								className="flex cursor-pointer items-start gap-3.5 py-3 transition-colors hover:bg-slate-50 active:scale-[0.98]">
								<Clock size={18} className="mt-0.5 shrink-0 text-slate-400" />
								<div className="flex-1">
									<h4 className="text-sm font-bold text-slate-800">Indraprasta</h4>
									<p className="text-xs text-slate-400 leading-snug">
										Jl. Indraprasta No.107, Pindrikan Lor, Semarang
									</p>
								</div>
							</div>

							<div
								onClick={() =>
									handleQuickSelectDestination("DeliPark Mall", [3.5922, 98.6726])
								}
								className="flex cursor-pointer items-start gap-3.5 py-3 transition-colors hover:bg-slate-50 active:scale-[0.98]">
								<Clock size={18} className="mt-0.5 shrink-0 text-slate-400" />
								<div className="flex-1">
									<h4 className="text-sm font-bold text-slate-800">DeliPark Mall</h4>
									<p className="text-xs text-slate-400 leading-snug">
										Jl. Putri Hijau Dalam No.1, Kesawan, Medan
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{screenState === "route" && (
				<div className="relative flex h-full w-full flex-col">
					<div className="absolute top-3 left-5 right-5 z-[1000] flex items-start gap-2">
						<button
							onClick={() => setScreenState("search")}
							aria-label="Kembali ke pencarian"
							className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/90 text-slate-800 shadow-md backdrop-blur-md transition-transform active:scale-95">
							<ArrowLeft size={18} />
						</button>

						<div className="min-w-0 flex-1 rounded-2xl border border-white/80 bg-white/90 p-3 shadow-lg backdrop-blur-md">
							<div className="flex items-center justify-between gap-3">
								<div className="flex flex-1 items-center gap-3 min-w-0">
									<div className="flex w-4 shrink-0 flex-col items-center justify-center gap-0.5">
										<Target size={15} className="text-blue-600" />
										<div className="h-3.5 w-[1px] bg-slate-300" />
										<MapPin size={15} className="text-red-500" />
									</div>

									<div className="flex flex-1 flex-col min-w-0 justify-center">
										<p className="truncate text-xs font-semibold text-slate-700">
											{originLabel || "Tugu Muda Semarang"}
										</p>
										<div className="my-1.5 border-b border-slate-200/60" />
										<p className="truncate text-xs font-bold text-slate-900">
											{destLabel || "Indraprasta"}
										</p>
									</div>
								</div>

								<button
									onClick={() => setScreenState("search")}
									className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-100 active:scale-95">
									<Plus size={14} className="text-blue-600" />
									Ubah
								</button>
							</div>
						</div>
					</div>

					<div className="relative z-0 h-full w-full">
						<MapContainer
							center={currentLocation || center}
							zoom={16}
							zoomControl={false}
							scrollWheelZoom={true}
							className="h-full w-full">
							<TileLayer
								attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
								url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
								maxZoom={19}
							/>

							{(currentLocation || originCoords) && (
								<Marker position={currentLocation || originCoords!} icon={liveIcon} />
							)}

							{destCoords && <Marker position={destCoords} icon={destinationIcon} />}

							{activeRoute?.anomalies.map((anomaly, i) => {
								const streamUrl = anomaly.stream_url;
								return (
									<CircleMarker
										key={`${anomaly.name}-${anomaly.anomaly_type}-${i}`}
										center={[anomaly.latitude, anomaly.longitude]}
										radius={9}
										pathOptions={{
											color: "#ffffff",
											weight: 2,
											fillColor: ANOMALY_COLORS[anomaly.anomaly_type] ?? "#F59E0B",
											fillOpacity: 0.95,
										}}>
										<Popup>
											<div className="min-w-[160px] text-slate-800">
												<p className="text-[13px] font-extrabold">{anomaly.label}</p>
												<p className="text-[11px] text-slate-500">
													CCTV {anomaly.name}
												</p>
												<p className="mt-0.5 text-[11px] text-slate-500">
													Keyakinan {(anomaly.confidence * 100).toFixed(0)}% ·{" "}
													{anomaly.count} deteksi
												</p>
												{streamUrl && (
													<button
														onClick={() =>
															setActiveCctv({
																name: anomaly.name,
																url: streamUrl,
																label: anomaly.label,
															})
														}
														className="mt-2 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm active:scale-95">
														<Video size={12} /> Lihat CCTV
													</button>
												)}
											</div>
										</Popup>
									</CircleMarker>
								);
							})}

							{passedPoints.length > 1 && (
								<Polyline
									positions={passedPoints}
									pathOptions={{
										color: "#94A3B8",
										weight: 5,
										opacity: 0.5,
										dashArray: "5, 10",
									}}
								/>
							)}

							{remainingPoints.length > 0 && (
								<>
									<Polyline
										positions={remainingPoints}
										pathOptions={{ color: "#1D4ED8", weight: 8, opacity: 0.3 }}
									/>
									<Polyline
										positions={remainingPoints}
										pathOptions={{ color: "#2563EB", weight: 6, opacity: 1 }}
									/>
								</>
							)}
						</MapContainer>
					</div>

					{/* BOTTOM SHEET */}
					<div
						className="absolute bottom-0 left-0 right-0 z-[1000] flex flex-col rounded-t-[28px] bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-all duration-300"
						style={{ height: sheetHeight }}>
						{/* Drag Handle */}
						<button
							onClick={() => setExpanded(!expanded)}
							className="flex w-full cursor-pointer items-center justify-center py-2.5 hover:bg-slate-50/50 rounded-t-[28px]">
							<div className="h-1.5 w-12 rounded-full bg-slate-300" />
						</button>

						<div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pb-4">
							<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
							{/* 1. HEADER RINGKASAN RUTE */}
							{activeRoute && (
								<div className="mb-2.5">
									<div className="flex items-center justify-between gap-2">
										<div className="flex items-baseline gap-2">
											<span className="text-2xl font-extrabold tracking-tight text-slate-900">
												{Math.round(activeRoute.travel_time_in_seconds / 60)} mnt
											</span>
											<span className="text-xs font-semibold text-slate-400">
												({(activeRoute.length_in_meters / 1000).toFixed(1)} km)
											</span>
										</div>

										{activeRoute.risk === "safe" ? (
											<span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-700">
												<ShieldCheck size={14} /> Bebas Anomali
											</span>
										) : activeRoute.risk === "caution" ? (
											<span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-800">
												<AlertTriangle size={14} /> {activeRoute.anomaly_count} Anomali
											</span>
										) : (
											<span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-extrabold text-red-700">
												<AlertTriangle size={14} /> Waspada
											</span>
										)}
									</div>

									<div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-500">
										<span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-600">
											Skor {activeRoute.score.toFixed(0)}/100
										</span>
										{activeRoute.traffic_delay_in_seconds >= 60 && (
											<span className="rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-700">
												+{Math.round(activeRoute.traffic_delay_in_seconds / 60)} mnt macet
											</span>
										)}
										<span
											className={`rounded-full px-2 py-0.5 font-bold ${
												activeRoute.anomaly_count === 0
													? "bg-emerald-50 text-emerald-700"
													: "bg-amber-50 text-amber-700"
											}`}>
											{activeRoute.anomaly_summary}
										</span>
									</div>
								</div>
							)}

								{/* 2. KARTU BIRU PETUNJUK SELANJUTNYA (Diletakkan di atas Tab) */}
								{activeRoute && activeRoute.guidance?.[currentGuidanceIndex] && (
									<div className="mb-3 rounded-2xl bg-blue-600 p-3.5 text-white shadow-md flex items-center gap-3.5 transition-all">
										<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
											<ManeuverIcon
												maneuver={activeRoute.guidance[currentGuidanceIndex].maneuver}
												size={24}
												className="text-white"
											/>
										</div>

										<div className="flex-1 min-w-0">
											<p className="text-[10px] font-extrabold uppercase tracking-wider text-blue-100">
												Petunjuk Selanjutnya
											</p>
											<h3 className="text-xs font-black truncate leading-tight">
												{activeRoute.guidance[currentGuidanceIndex].message}
											</h3>
											{activeRoute.guidance[currentGuidanceIndex].street && (
												<p className="text-[11px] text-blue-100/90 truncate mt-0.5">
													Ke {activeRoute.guidance[currentGuidanceIndex].street}
												</p>
											)}
										</div>
									</div>
								)}

								{/* 3. TAB SELECTOR */}
								<div className="mb-2 flex rounded-xl bg-slate-100 p-1">
									<button
										onClick={() => setActiveTab("routes")}
										className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
											activeTab === "routes"
												? "bg-white text-blue-600 shadow-sm"
												: "text-slate-500 hover:text-slate-800"
										}`}>
										<RouteIcon size={14} />
										Pilihan Rute
									</button>
									<button
										onClick={() => {
											setActiveTab("instructions");
											if (!expanded) setExpanded(true);
										}}
										className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
											activeTab === "instructions"
												? "bg-white text-blue-600 shadow-sm"
												: "text-slate-500 hover:text-slate-800"
										}`}>
										<ListOrdered size={14} />
										Petunjuk Arah
									</button>
								</div>

								{/* 4. DAFTAR KONTEN TAB */}
								<div className="mt-1 min-h-0 flex-1 overflow-y-auto pr-1 no-scrollbar">
									{/* TAB 1: PILIHAN RUTE */}
									{activeTab === "routes" &&
										routeData &&
										routeData.routes.length > 0 && (
										<div className="space-y-2">
											<div className="flex items-center justify-between gap-2">
												<p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
													Rekomendasi Jalur
												</p>
												{routeData.threshold_m > 0 && (
													<p className="text-[10px] font-semibold text-slate-400">
														Radius deteksi {routeData.threshold_m} m
													</p>
												)}
											</div>
											<div className="flex flex-col gap-2">
												{routeData.routes.map((r) => {
													const isSelected = r.index === selectedIndex;
													const cctv = r.cctv;

													return (
														<div
															key={r.index}
															onClick={() => setSelectedIndex(r.index)}
															className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition-all active:scale-[0.99] ${
																isSelected
																	? "border-blue-600 bg-blue-50/40 shadow-sm"
																	: "border-slate-200 bg-white hover:border-slate-300"
															}`}>
															<div className="min-w-0">
																<div className="flex flex-wrap items-center gap-1.5">
																	<span className="text-sm font-bold text-slate-900">
																		{Math.round(r.travel_time_in_seconds / 60)} mnt
																	</span>
																	{r.tags.map((tag) => (
																		<span
																			key={tag}
																			className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-blue-600">
																			{tag}
																		</span>
																	))}
																</div>
																<p className="mt-0.5 truncate text-xs font-medium text-slate-400">
																	{r.summary} · {(r.length_in_meters / 1000).toFixed(1)} km
																</p>
																<p
																	className={`mt-0.5 truncate text-[11px] font-bold ${
																		r.risk === "safe" ? "text-emerald-600" : "text-amber-700"
																	}`}>
																	Skor {r.score.toFixed(0)} · {r.anomaly_summary}
																</p>
															</div>

															<div className="flex shrink-0 items-center gap-2">
																{cctv ? (
																	<button
																		onClick={(e) => {
																			e.stopPropagation();
																			setActiveCctv({
																				name: cctv.name,
																				url: cctv.url,
																				label: cctv.label,
																			});
																		}}
																		className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold shadow-sm transition-colors active:scale-95 ${
																			r.risk === "safe"
																				? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
																				: "border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100"
																		}`}>
																		<Video size={12} /> CCTV
																	</button>
																) : null}

																<span
																	className={`rounded-lg px-2 py-1 text-[11px] font-bold ${
																		r.risk === "safe"
																			? "bg-emerald-100 text-emerald-700"
																			: r.risk === "caution"
																				? "bg-amber-100 text-amber-800"
																				: "bg-red-100 text-red-700"
																	}`}>
																	{r.risk === "safe"
																		? "Aman"
																		: r.risk === "caution"
																			? `${r.anomaly_count} Anomali`
																			: "Waspada"}
																</span>
															</div>
														</div>
													);
												})}
											</div>
										</div>
									)}

									{/* TAB 2: TIMELINE PETUNJUK ARAH */}
									{activeTab === "instructions" && (
										<div className="py-1">
											{activeRoute?.guidance && activeRoute.guidance.length > 0 ? (
												<div className="relative border-l-2 border-slate-200 ml-4 space-y-3 my-2 pr-1">
													{activeRoute.guidance.map((step, idx) => {
														const isCurrentStep = idx === currentGuidanceIndex;
														const isPassedStep = idx < currentGuidanceIndex;

														return (
															<div
																key={idx}
																className={`relative pl-6 transition-all ${
																	isPassedStep ? "opacity-40" : "opacity-100"
																}`}>
																<div
																	className={`absolute -left-[17px] top-0 flex h-8 w-8 items-center justify-center rounded-full border transition-all ${
																		isCurrentStep
																			? "bg-blue-600 border-blue-600 text-white shadow-md ring-4 ring-blue-100"
																			: "bg-white border-slate-200 text-slate-700"
																	}`}>
																	<ManeuverIcon
																		maneuver={step.maneuver}
																		size={16}
																		className={isCurrentStep ? "text-white" : "text-slate-700"}
																	/>
																</div>

																<div
																	className={`rounded-xl p-2.5 transition-all ${
																		isCurrentStep
																			? "bg-blue-50/80 border border-blue-200 shadow-sm"
																			: "bg-transparent"
																	}`}>
																	<div className="flex items-center justify-between gap-2">
																		<h4
																			className={`text-xs leading-tight ${
																				isCurrentStep
																					? "font-black text-blue-700"
																					: "font-extrabold text-slate-900"
																			}`}>
																			{step.message}
																		</h4>
																		{isCurrentStep && (
																			<span className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-extrabold uppercase text-white">
																				Aktif
																			</span>
																		)}
																	</div>

																	{step.street && (
																		<p className="text-[11px] font-medium text-slate-500 mt-0.5">
																			Ke {step.street}
																		</p>
																	)}
																</div>
															</div>
														);
													})}
												</div>
											) : null}
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{activeCctv && (
				<CctvModal
					name={activeCctv.name}
					subtitle={activeCctv.label}
					streamUrl={activeCctv.url}
					onClose={() => setActiveCctv(null)}
				/>
			)}
		</div>
	);
}
