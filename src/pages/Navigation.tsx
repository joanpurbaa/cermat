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
} from "lucide-react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer } from "react-leaflet";

import LocationAutocomplete, {
	formatCoord,
	parseDualCoordPair,
	type LatLon,
} from "../components/LocationAutocomplete";
import {
	getFloodAwareRoutes,
	type RouteData,
	type RouteInfo,
} from "../lib/floodRoute";

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
			Math.sin(dLng / 2) *
			Math.sin(dLng / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

export default function Navigation() {
	const [screenState, setScreenState] = useState<"search" | "route">("search");
	const [expanded, setExpanded] = useState(false);

	const [originCoords, setOriginCoords] = useState<LatLon | null>(null);
	const [destCoords, setDestCoords] = useState<LatLon | null>(null);

	const [originLabel, setOriginLabel] = useState<string>("");
	const [destLabel, setDestLabel] = useState<string>("");

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
		const handlePresetSelect = (e: CustomEvent) => {
			const { origin, destination } = e.detail;
			setOriginCoords(origin.coords);
			setDestCoords(destination.coords);
			setOriginLabel(origin.name);
			setDestLabel(destination.name);
			// eslint-disable-next-line react-hooks/immutability
			setOriginExternal({ label: origin.name, coords: origin.coords });
			// eslint-disable-next-line react-hooks/immutability
			setDestExternal({ label: destination.name, coords: destination.coords });
		};

		window.addEventListener("SELECT_PRESET_ROUTE" as any, handlePresetSelect);
		return () => {
			window.removeEventListener("SELECT_PRESET_ROUTE" as any, handlePresetSelect);
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

	const [routeData, setRouteData] = useState<RouteData | null>(null);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

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
				setScreenState("route");
			})
			.catch((err) => {
				if (cancelled) return;
				setError(err instanceof Error ? err.message : "Terjadi kesalahan rute");
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

	const activeRoute: RouteInfo | null =
		routeData?.routes.find((r) => r.index === selectedIndex) ??
		routeData?.routes[0] ??
		null;

	const { passedPoints, remainingPoints } = useMemo(() => {
		if (!activeRoute || !activeRoute.points || activeRoute.points.length === 0) {
			return { passedPoints: [], remainingPoints: [] };
		}

		const userPos = currentLocation || originCoords;
		if (!userPos) {
			return { passedPoints: [], remainingPoints: activeRoute.points };
		}

		let closestIndex = 0;
		let minDistance = Infinity;

		activeRoute.points.forEach((pt, idx) => {
			const dist = getDistanceMeters([userPos[0], userPos[1]], pt);
			if (dist < minDistance) {
				minDistance = dist;
				closestIndex = idx;
			}
		});

		return {
			passedPoints: activeRoute.points.slice(0, closestIndex + 1),
			remainingPoints: activeRoute.points.slice(closestIndex),
		};
	}, [activeRoute, currentLocation, originCoords]);

	const sheetHeight = expanded ? 480 : activeRoute ? 280 : 180;
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
					<div className="flex items-center gap-3 px-6 pt-4 pb-2">
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

					<div className="mx-6 mt-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 px-4 py-2.5 shadow-sm transition-all focus-within:border-blue-500 focus-within:bg-white">
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

					<div className="mx-6 mt-4 flex items-center gap-2">
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
						<p className="mt-3 px-6 text-center text-xs font-semibold text-red-500">
							{error}
						</p>
					)}

					{loading && (
						<div className="mt-6 flex items-center justify-center gap-2 text-slate-500">
							<LoaderCircle size={20} className="animate-spin text-blue-600" />
							<span className="text-sm font-semibold">Menghitung rute teraman...</span>
						</div>
					)}

					<hr className="my-5 border-slate-100" />

					<div className="flex-1 px-6 pb-6">
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
					<div className="absolute top-3 left-4 right-4 z-[1000] flex flex-col gap-2">
						<div className="rounded-2xl border border-white/80 bg-white/90 p-3 shadow-lg backdrop-blur-md">
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
										<div className="my-0.5 border-b border-slate-200/60" />
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

						<button
							onClick={() => setScreenState("search")}
							className="flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white/90 text-slate-800 shadow-md backdrop-blur-md transition-transform active:scale-95">
							<ArrowLeft size={18} />
						</button>
					</div>

					<div className="relative z-0 h-full w-full">
						<MapContainer
							center={currentLocation || center}
							zoom={16}
							zoomControl={false}
							scrollWheelZoom={true}
							className="h-full w-full">
							<TileLayer
								attribution="&copy; CARTO"
								url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
							/>

							{(currentLocation || originCoords) && (
								<Marker position={currentLocation || originCoords!} icon={liveIcon} />
							)}

							{destCoords && <Marker position={destCoords} icon={destinationIcon} />}

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
						<button
							onClick={() => setExpanded(!expanded)}
							className="flex w-full cursor-pointer items-center justify-center py-2.5 hover:bg-slate-50/50 rounded-t-[28px]">
							<div className="h-1.5 w-12 rounded-full bg-slate-300" />
						</button>

						<div className="flex flex-1 flex-col justify-between overflow-hidden px-5 pb-5">
							{activeRoute && (
								<div className="mb-2.5">
									<div className="flex items-center justify-between">
										<div className="flex items-baseline gap-2">
											<span className="text-2xl font-extrabold tracking-tight text-slate-900">
												{Math.round(activeRoute.travel_time_in_seconds / 60)} mnt
											</span>
											<span className="text-xs font-semibold text-slate-400">
												({(activeRoute.length_in_meters / 1000).toFixed(1)} km)
											</span>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
