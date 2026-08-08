import "./index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import Navigation from "./pages/Navigation";
import Home from "./pages/Home";

export default function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/navigasi" element={<Navigation />} />
			</Routes>
		</BrowserRouter>
	);
}
