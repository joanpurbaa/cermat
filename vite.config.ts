import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const reactRoot = fileURLToPath(new URL("./node_modules/react", import.meta.url));
const reactDomRoot = fileURLToPath(new URL("./node_modules/react-dom", import.meta.url));

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			react: reactRoot,
			"react/jsx-runtime": `${reactRoot}/jsx-runtime.js`,
			"react/jsx-dev-runtime": `${reactRoot}/jsx-dev-runtime.js`,
			"react-dom": reactDomRoot,
			"react-dom/client": `${reactDomRoot}/client.js`,
			"react-dom/test-utils": `${reactDomRoot}/test-utils.js`,
		},
		dedupe: ["react", "react-dom"],
	},
	optimizeDeps: {
		include: ["react", "react-dom", "react/jsx-runtime", "react-dom/client"],
		force: true,
	},
});
