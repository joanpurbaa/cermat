import "./index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import MainLayout from "./components/MainLayout";
import Navigation from "./pages/Navigation";
import Home from "./pages/Home";
import Profile from "./pages/Profile";

export default function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route element={<MainLayout />}>
					<Route path="/" element={<Home />} />
					<Route path="/navigasi" element={<Navigation />} />
					<Route path="/profil" element={<Profile />} />{" "}
				</Route>
			</Routes>
		</BrowserRouter>
	);
}
