/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				primary: {
					DEFAULT: '#007bff',
					dark: '#0056b3',
					light: '#e8f4fd'
				},
				success: {
					DEFAULT: '#28a745',
					dark: '#218838',
					light: '#e8f5e9'
				},
				danger: {
					DEFAULT: '#dc3545',
					dark: '#c82333'
				},
				warning: '#ffc107',
				navy: {
					DEFAULT: '#1a2332',
					light: '#243447'
				}
			},
			fontFamily: {
				sans: [
					'-apple-system',
					'BlinkMacSystemFont',
					'"Segoe UI"',
					'Roboto',
					'"Helvetica Neue"',
					'Arial',
					'sans-serif'
				]
			}
		}
	},
	plugins: []
};
