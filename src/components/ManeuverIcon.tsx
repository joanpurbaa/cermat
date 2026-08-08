import {
	ArrowUp,
	CornerUpLeft,
	CornerUpRight,
	RotateCcw,
	MapPin,
	Compass,
	ArrowUpLeft,
	ArrowUpRight,
	ArrowLeft,
	ArrowRight,
	HelpCircle,
} from "lucide-react";

interface ManeuverIconProps {
	maneuver: string;
	className?: string;
	size?: number;
}

export default function ManeuverIcon({
	maneuver,
	className = "text-slate-700",
	size = 20,
}: ManeuverIconProps) {
	switch (maneuver) {
		case "DEPART":
		case "WAYPOINT_AHEAD":
			return <Compass size={size} className={className} />;

		case "STRAIGHT":
			return <ArrowUp size={size} className={className} />;

		case "TURN_LEFT":
		case "SHARP_LEFT":
			return <CornerUpLeft size={size} className={className} />;

		case "SLIGHT_LEFT":
		case "KEEP_LEFT":
			return <ArrowUpLeft size={size} className={className} />;

		case "TURN_RIGHT":
		case "SHARP_RIGHT":
			return <CornerUpRight size={size} className={className} />;

		case "SLIGHT_RIGHT":
		case "KEEP_RIGHT":
			return <ArrowUpRight size={size} className={className} />;

		case "MAKE_UTURN":
		case "ROUNDABOUT_BACK":
			return <RotateCcw size={size} className={className} />;

		case "ROUNDABOUT_STRAIGHT":
			return <ArrowUp size={size} className={className} />;

		case "ROUNDABOUT_LEFT":
		case "ROUNDABOUT_SHARP_LEFT":
		case "ROUNDABOUT_SLIGHT_LEFT":
			return <CornerUpLeft size={size} className={className} />;

		case "ROUNDABOUT_RIGHT":
		case "ROUNDABOUT_SHARP_RIGHT":
		case "ROUNDABOUT_SLIGHT_RIGHT":
		case "EXIT_ROUNDABOUT":
			return <CornerUpRight size={size} className={className} />;

		case "ARRIVE":
		case "ARRIVE_LEFT":
		case "ARRIVE_RIGHT":
		case "ARRIVE_AHEAD":
		case "WAYPOINT_REACHED":
			return <MapPin size={size} className="text-red-500" />;

		case "MERGE_LEFT_LANE":
		case "EXIT_MOTORWAY_LEFT":
			return <ArrowLeft size={size} className={className} />;

		case "MERGE_RIGHT_LANE":
		case "EXIT_MOTORWAY_RIGHT":
			return <ArrowRight size={size} className={className} />;

		default:
			return <HelpCircle size={size} className={className} />;
	}
}
