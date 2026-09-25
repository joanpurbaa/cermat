export type LatLon = [number, number];

export interface Coordinate {
	lat: number;
	lng: number;
}

export interface AnomalyEvent {
	name: string;
	latitude: number;
	longitude: number;
	anomaly_type: string;
	label: string;
	confidence: number;
	count: number;
	stream_url: string | null;
}

export interface GuidanceInstruction {
	type?: string;
	maneuver?: string;
	message: string;
	street?: string | null;
	road_numbers?: string[] | null;
	point?: Coordinate | null;
	route_offset_in_meters?: number;
	travel_time_in_seconds?: number;
	roundabout_exit_number?: number | null;
	turn_angle_in_decimal_degrees?: number | null;
}

export interface RouteInfo {
	index: number;
	length_in_meters: number;
	travel_time_in_seconds: number;
	traffic_delay_in_seconds: number;
	points: LatLon[];
	guidance: GuidanceInstruction[];
	anomalies: AnomalyEvent[];
	score: number;
	recommended: boolean;
}

export interface RouteData {
	origin: Coordinate;
	destination: Coordinate;
	threshold_m: number;
	recommended_route_index: number | null;
	routes: RouteInfo[];
}

export type RouteRisk = "safe" | "caution" | "risk";

export type RouteTag = "Teraman" | "Tercepat" | "Seimbang";

export interface RouteCctv {
	name: string;
	label: string;
	url: string;
	confidence: number;
	count: number;
}

export interface RouteView extends RouteInfo {
	summary: string;
	anomaly_count: number;
	anomaly_summary: string;
	risk: RouteRisk;
	tags: RouteTag[];
	cctv: RouteCctv | null;
}

export interface SafeRoutes {
	origin: Coordinate;
	destination: Coordinate;
	threshold_m: number;
	recommended_route_index: number | null;
	routes: RouteView[];
}

export interface VisionHealth {
	online: boolean;
	message: string;
}

export type VisionApiErrorCode =
	| "validation"
	| "unauthorized"
	| "upstream"
	| "network"
	| "timeout"
	| "server"
	| "unknown";

interface SuccessEnvelope<T> {
	success: true;
	message: string;
	data: T;
}

interface FailureEnvelope {
	success: false;
	message: string;
	data: null;
}

type Envelope<T> = SuccessEnvelope<T> | FailureEnvelope;

export class VisionApiError extends Error {
	status: number;
	code: VisionApiErrorCode;
	serverMessage: string | null;

	constructor(
		status: number,
		code: VisionApiErrorCode,
		message: string,
		serverMessage: string | null = null,
	) {
		super(message);
		this.name = "VisionApiError";
		this.status = status;
		this.code = code;
		this.serverMessage = serverMessage;
	}
}

const FALLBACK_BASE_URL = "https://semarangvision.chevalierlabsas.org";
const ROUTE_TIMEOUT_MS = 120_000;
const HEALTH_TIMEOUT_MS = 10_000;

function resolveBaseUrl(): string {
	const env = (import.meta as { env?: Record<string, string | undefined> }).env;
	const configured = env?.VITE_VISION_AI_URL;
	const base =
		typeof configured === "string" && configured.trim().length > 0
			? configured.trim()
			: FALLBACK_BASE_URL;
	return base.replace(/\/+$/, "");
}

function toVisionApiError(
	status: number,
	envelope: Envelope<unknown> | null,
): VisionApiError {
	const serverMessage =
		envelope && envelope.success === false ? envelope.message : null;

	if (status === 401) {
		return new VisionApiError(
			status,
			"unauthorized",
			"Layanan rute belum dikonfigurasi di server (TOM_API_KEY belum diatur).",
			serverMessage,
		);
	}
	if (status === 422) {
		return new VisionApiError(
			status,
			"validation",
			"Permintaan ditolak server. Pastikan koordinat asal dan tujuan valid.",
			serverMessage,
		);
	}
	if (status === 502) {
		return new VisionApiError(
			status,
			"upstream",
			"Layanan rute di server sedang bermasalah. Coba lagi sebentar.",
			serverMessage,
		);
	}
	if (status >= 500) {
		return new VisionApiError(
			status,
			"server",
			`Server Vision AI bermasalah (HTTP ${status}). Coba lagi nanti.`,
			serverMessage,
		);
	}
	return new VisionApiError(
		status,
		"unknown",
		"Gagal mengambil data dari Semarang Vision AI.",
		serverMessage,
	);
}

async function fetchEnvelope<T>(
	path: string,
	init: RequestInit,
	timeoutMs: number,
): Promise<T> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	let res: Response;
	try {
		res = await fetch(`${resolveBaseUrl()}${path}`, {
			...init,
			signal: controller.signal,
			headers: { Accept: "application/json", ...init.headers },
		});
	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") {
			throw new VisionApiError(
				0,
				"timeout",
				"Perhitungan rute melebihi batas waktu. Coba lagi.",
			);
		}
		throw new VisionApiError(
			0,
			"network",
			"Tidak bisa menghubungi Semarang Vision AI. Periksa koneksi internet.",
		);
	} finally {
		clearTimeout(timer);
	}

	let envelope: Envelope<T> | null;
	try {
		envelope = (await res.json()) as Envelope<T>;
	} catch {
		envelope = null;
	}

	if (res.ok && envelope && envelope.success === true && envelope.data != null) {
		return envelope.data;
	}

	throw toVisionApiError(res.status, envelope);
}

export async function getVisionApiHealth(): Promise<VisionHealth> {
	try {
		const data = await fetchEnvelope<{ message?: string } | string>(
			"/api/health",
			{ method: "GET" },
			HEALTH_TIMEOUT_MS,
		);
		const message =
			typeof data === "string" && data.trim().length > 0
				? data
				: typeof data === "object" && data?.message
					? data.message
					: "API is running";
		return { online: true, message };
	} catch (error) {
		return {
			online: false,
			message:
				error instanceof Error ? error.message : "Server tidak merespons.",
		};
	}
}

function assertValidCoordinate(coord: LatLon, field: string): void {
	const [lat, lng] = coord;
	if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
		throw new VisionApiError(
			422,
			"validation",
			`Titik ${field} tidak valid: latitude harus di antara -90 dan 90.`,
		);
	}
	if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
		throw new VisionApiError(
			422,
			"validation",
			`Titik ${field} tidak valid: longitude harus di antara -180 dan 180.`,
		);
	}
}

function summarizeAnomalies(anomalies: AnomalyEvent[]): string {
	if (anomalies.length === 0) return "Bebas anomali";
	const labels: string[] = [];
	for (const anomaly of anomalies) {
		if (anomaly.label && !labels.includes(anomaly.label)) {
			labels.push(anomaly.label);
		}
	}
	return labels.join(", ");
}

function buildSummary(route: RouteInfo, position: number): string {
	const steps = [...route.guidance].sort(
		(a, b) => (a.route_offset_in_meters ?? 0) - (b.route_offset_in_meters ?? 0),
	);
	const spans = new Map<string, number>();
	let previousOffset = 0;

	for (const step of steps) {
		const offset = step.route_offset_in_meters ?? 0;
		const street = step.street?.trim();
		if (street) {
			spans.set(
				street,
				(spans.get(street) ?? 0) + Math.max(0, offset - previousOffset),
			);
		}
		previousOffset = Math.max(previousOffset, offset);
	}

	const top = [...spans.entries()].sort((a, b) => b[1] - a[1])[0];
	return top ? `Via ${top[0]}` : `Alternatif ${position + 1}`;
}

function toRouteView(route: RouteInfo, position: number): RouteView {
	const anomalies = Array.isArray(route.anomalies) ? route.anomalies : [];
	const streamAnomaly = anomalies.find(
		(a) => typeof a.stream_url === "string" && a.stream_url.length > 0,
	);
	const streamUrl = streamAnomaly?.stream_url ?? "";

	return {
		...route,
		points: Array.isArray(route.points) ? route.points : [],
		guidance: Array.isArray(route.guidance) ? route.guidance : [],
		anomalies,
		anomaly_count: anomalies.length,
		anomaly_summary: summarizeAnomalies(anomalies),
		risk:
			anomalies.length === 0
				? "safe"
				: route.score >= 80
					? "caution"
					: "risk",
		summary: buildSummary(route, position),
		tags: [],
		cctv: streamAnomaly
			? {
					name: streamAnomaly.name,
					label: streamAnomaly.label,
					url: streamUrl,
					confidence: streamAnomaly.confidence,
					count: streamAnomaly.count,
				}
			: null,
	};
}

function pickSafestIndex(routes: RouteView[]): number | null {
	if (routes.length === 0) return null;
	return routes.reduce((best, route) => (route.score > best.score ? route : best))
		.index;
}

function applyRouteTags(routes: RouteView[], safestIndex: number | null): void {
	if (routes.length === 0) return;
	const fastestIndex = routes.reduce((best, route) =>
		route.travel_time_in_seconds < best.travel_time_in_seconds ? route : best,
	).index;

	routes.forEach((route) => {
		const tags: RouteTag[] = [];
		if (route.index === fastestIndex) tags.push("Tercepat");
		if (route.index === safestIndex) tags.push("Teraman");
		if (tags.length === 0 && routes.length >= 3) tags.push("Seimbang");
		route.tags = tags;
	});
}

function toSafeRoutes(data: RouteData): SafeRoutes {
	const routes = (data.routes ?? []).map(toRouteView);
	const recommendedIndex =
		data.recommended_route_index ?? pickSafestIndex(routes);
	applyRouteTags(routes, recommendedIndex);

	return {
		origin: data.origin,
		destination: data.destination,
		threshold_m: data.threshold_m ?? 0,
		recommended_route_index: recommendedIndex,
		routes,
	};
}

export async function getSafeRoutes(
	origin: LatLon,
	destination: LatLon,
): Promise<SafeRoutes> {
	assertValidCoordinate(origin, "asal");
	assertValidCoordinate(destination, "tujuan");

	const data = await fetchEnvelope<RouteData>(
		"/api/routes",
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				origin: { lat: origin[0], lng: origin[1] },
				destination: { lat: destination[0], lng: destination[1] },
			}),
		},
		ROUTE_TIMEOUT_MS,
	);

	return toSafeRoutes(data);
}
