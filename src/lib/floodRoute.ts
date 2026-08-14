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
 * Memproses dan melakukan normalisasi data rute agar siap digunakan oleh UI React.
 */
function normalizeRouteData(data: RouteData): RouteData {
	const routes = data.routes.map((route, idx) => {
		// Toleransi jika backend mengirim 'anomalies' atau 'floods'
		const anomalyList = route.anomalies || [];
		const floodList = route.floods || [];
		const totalIssues = anomalyList.length + floodList.length;

		// 1. Ekstrak CCTV jika ada
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

		return {
			...route,
			summary_name: summaryName,
			is_safe: isSafe,
			flood_risk: floodRisk,
			cctv,
			guidance,
			floods: normalizedFloods,
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
