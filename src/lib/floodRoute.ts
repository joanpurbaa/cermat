export type LatLon = [number, number];

export interface CctvInfo {
	name: string;
	url: string;
}

export interface AnomalyEvent {
	name: string;
	latitude: number;
	longitude: number;
	anomaly_type: string;
	label: string;
	confidence: number;
	count: number;
	stream_url?: string | null;
}

export interface FloodLocation {
	name: string;
	latitude: number;
	longitude: number;
	flood_confidence: number;
	stream_url?: string;
}

export interface GuidanceInstruction {
	type?: string;
	maneuver?: string;
	message: string;
	street?: string | null;
	road_numbers?: string[] | null;
	point?: { lat: number; lng: number } | null;
	route_offset_in_meters?: number;
	travel_time_in_seconds?: number;
	roundabout_exit_number?: number | null;
	turn_angle_in_decimal_degrees?: number | null;
	instruction?: string; // Untuk UI compatibility
}

export interface Instruction {
	type?: string;
	maneuver?: string; // Tipe Maneuver TomTom (misal: "TURN_LEFT", "KEEP_LEFT", "ARRIVE", dll)
	message: string;
	street?: string | null;
	point?: {
		lat: number;
		lng: number;
	} | null;
	route_offset_in_meters?: number;
	travel_time_in_seconds?: number;
	turn_angle_in_decimal_degrees?: number | null;
	instruction?: string;
}

/**
 * Kamera CCTV statis di sepanjang kota, lepas dari deteksi anomaly/flood.
 * Dipakai sebagai fallback agar user tetap bisa cek kondisi jalan secara
 * visual walau model belum mendeteksi (atau salah mendeteksi) anomali.
 */
export interface CctvCamera {
	name: string;
	lat: number;
	lng: number;
	stream_url: string;
}

export interface RouteInfo {
	index: number;
	length_in_meters: number;
	travel_time_in_seconds: number;
	traffic_delay_in_seconds: number;
	points: LatLon[];
	guidance: GuidanceInstruction[];
	score: number;
	recommended: boolean;

	// Sesuai OpenAPI Server Terbaru
	anomalies?: AnomalyEvent[];

	// Sesuai Kebutuhan UI Component (Navigation.tsx)
	floods: Array<{ name: string; stream_url?: string }>;
	instructions?: Instruction[];
	summary_name?: string;
	flood_risk?: "safe" | "warning" | "danger" | string;
	is_safe?: boolean;
	cctv?: CctvInfo | null;

	// CCTV terdekat di sepanjang rute ini, ADA/TIDAKNYA anomaly.
	// null kalau tidak ada kamera dalam radius yang ditentukan.
	nearest_cctv?: CctvCamera | null;
}

export interface RouteData {
	origin: { lat: number; lng: number };
	destination: { lat: number; lng: number };
	threshold_m: number;
	recommended_route_index: number | null;
	routes: RouteInfo[];
}

interface ApiResponse<T> {
	success: boolean;
	message: string;
	data: T | null;
}

const BASE_URL =
	import.meta.env.VITE_VISION_AI_URL ??
	"https://semarangvision.chevalierlabsas.org";

/**
 * Registry kamera CCTV kota (mis. ATCS Dishub Semarang / open data kota).
 * TODO: isi dengan data kamera asli (nama, koordinat, stream_url).
 * Registry ini independen dari hasil deteksi model — jadi kamera tetap
 * bisa ditampilkan meskipun kondisi jalan "normal" menurut model.
 */
export const CCTV_REGISTRY: CctvCamera[] = [
	// { name: "CCTV Simpang Lima", lat: -6.9899, lng: 110.4229, stream_url: "https://..." },
	// { name: "CCTV Tugu Muda", lat: -6.9826, lng: 110.4091, stream_url: "https://..." },
	// { name: "CCTV Kalibanteng", lat: -6.9722, lng: 110.3838, stream_url: "https://..." },
];

/** Jarak Haversine antara dua koordinat, dalam meter. */
function getDistanceMeters(coord1: LatLon, coord2: LatLon): number {
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

/**
 * Cari kamera CCTV terdekat dari titik-titik rute, dalam radius tertentu (meter).
 * Berjalan independen dari status anomaly/flood, sehingga user tetap bisa
 * memantau kondisi jalan secara visual walau tidak ada alert dari model.
 */
function findNearestCctv(
	points: LatLon[],
	maxDistanceM = 300,
): CctvCamera | null {
	if (CCTV_REGISTRY.length === 0 || points.length === 0) return null;

	let best: CctvCamera | null = null;
	let bestDist = Infinity;

	for (const cam of CCTV_REGISTRY) {
		for (const pt of points) {
			const d = getDistanceMeters(pt, [cam.lat, cam.lng]);
			if (d < bestDist && d <= maxDistanceM) {
				bestDist = d;
				best = cam;
			}
		}
	}

	return best;
}

/**
 * Memproses dan melakukan normalisasi data rute agar siap digunakan oleh UI React.
 */
function normalizeRouteData(data: RouteData): RouteData {
	const routes = data.routes.map((route, idx) => {
		// Toleransi jika backend mengirim 'anomalies' atau 'floods'
		const anomalyList = route.anomalies || [];
		const floodList = route.floods || [];
		const totalIssues = anomalyList.length + floodList.length;

		// 1. Ekstrak CCTV anomaly jika ada
		const activeCctvStream =
			anomalyList.find((a) => a.stream_url)?.stream_url ||
			floodList.find((f) => f.stream_url)?.stream_url;

		const cctv: CctvInfo | null = activeCctvStream
			? { name: `CCTV Rute ${idx + 1}`, url: activeCctvStream }
			: route.cctv || null;

		// 2. Tentukan nama rute (Summary Name)
		const mainStreet = route.guidance?.find((g) => g.street)?.street;
		const summaryName =
			route.summary_name || (mainStreet ? `Via ${mainStreet}` : `Rute ${idx + 1}`);

		// 3. Tentukan Tingkat Risiko & Keamanan Rute
		const isSafe = totalIssues === 0;
		const floodRisk: "safe" | "warning" | "danger" = isSafe
			? "safe"
			: totalIssues > 2
				? "danger"
				: "warning";

		// 4. Sinkronkan petunjuk navigasi
		const rawGuidance = route.guidance || route.instructions || [];
		const guidance: GuidanceInstruction[] = rawGuidance.map((g) => ({
			...g,
			instruction: g.message || g.instruction || "Lanjutkan perjalanan",
		}));

		// Backwards compatibility untuk array floods
		const normalizedFloods =
			floodList.length > 0
				? floodList
				: anomalyList.map((a) => ({
						name: a.label || a.name,
						stream_url: a.stream_url || undefined,
					}));

		// 5. CCTV terdekat di sepanjang rute ini (ada/tidak ada anomaly).
		// Ini fallback agar user tetap bisa lihat kondisi jalan secara visual.
		const nearestCctv = route.points?.length
			? findNearestCctv(route.points)
			: null;

		return {
			...route,
			summary_name: summaryName,
			is_safe: isSafe,
			flood_risk: floodRisk,
			cctv,
			guidance,
			floods: normalizedFloods,
			nearest_cctv: nearestCctv,
		};
	});

	return {
		...data,
		routes,
	};
}

export async function getFloodAwareRoutes(
	origin: LatLon,
	destination: LatLon,
): Promise<RouteData> {
	const res = await fetch(`${BASE_URL}/api/routes`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			origin: { lat: origin[0], lng: origin[1] },
			destination: { lat: destination[0], lng: destination[1] },
		}),
	});

	const json: ApiResponse<RouteData> = await res.json();

	if (!res.ok || !json.success || !json.data) {
		throw new Error(json.message || "Gagal mengambil rute");
	}

	return normalizeRouteData(json.data);
}
