<script lang="ts">
	type IconDefinition = {
		viewBox: string;
		paths: string[];
		filled?: string[];
	};

	const icons: Record<string, IconDefinition> = {
		menu: {
			viewBox: '0 0 24 24',
			paths: [ 'M4 7h16', 'M4 12h16', 'M4 17h16' ],
		},
		elements: {
			viewBox: '0 0 24 24',
			paths: [ 'M4 5h7v6H4z', 'M13 5h7v6h-7z', 'M4 13h7v6H4z', 'M13 13h7v6h-7z' ],
		},
		editor: {
			viewBox: '0 0 24 24',
			paths: [ 'M5 6h10', 'M5 12h14', 'M5 18h9', 'M16 5l3 3-5.5 5.5-3 .5.5-3z' ],
		},
		styleTab: {
			viewBox: '0 0 24 24',
			paths: [ 'M5 18l4.5-12.5l4.5 12.5', 'M8.3 11.2h6.1', 'M17.5 6.5h2', 'M18.5 5.5v2' ],
		},
		advancedTab: {
			viewBox: '0 0 24 24',
			paths: [
				'M12 8.4a3.6 3.6 0 1 0 0 7.2a3.6 3.6 0 0 0 0-7.2z',
				'M19 12a6.7 6.7 0 0 0-.1-1l1.9-1.5-1.8-3.1-2.3.9a6.8 6.8 0 0 0-1.6-.9l-.3-2.4h-3.6l-.3 2.4a6.8 6.8 0 0 0-1.6.9l-2.3-.9L3.2 9.5L5 11a6.7 6.7 0 0 0 0 2l-1.8 1.5l1.8 3.1l2.3-.9c.5.38 1.03.68 1.6.9l.3 2.4h3.6l.3-2.4c.57-.22 1.1-.52 1.6-.9l2.3.9l1.8-3.1l-1.9-1.5c.07-.33.1-.67.1-1z',
			],
		},
		settings: {
			viewBox: '0 0 24 24',
			paths: [
				'M12 8.2a3.8 3.8 0 1 0 0 7.6a3.8 3.8 0 0 0 0-7.6z',
				'M19 12a7 7 0 0 0-.1-1.1l2-1.6-2-3.5-2.5 1a7.9 7.9 0 0 0-1.9-1.1l-.3-2.7h-4l-.3 2.7a7.9 7.9 0 0 0-1.9 1.1l-2.5-1-2 3.5 2 1.6A7 7 0 0 0 5 12c0 .4 0 .7.1 1.1l-2 1.6 2 3.5 2.5-1a7.9 7.9 0 0 0 1.9 1.1l.3 2.7h4l.3-2.7a7.9 7.9 0 0 0 1.9-1.1l2.5 1 2-3.5-2-1.6c.1-.4.1-.7.1-1.1z',
			],
		},
		history: {
			viewBox: '0 0 24 24',
			paths: [ 'M12 7.5v4.5l3 1.5', 'M5 12a7 7 0 1 0 2.1-5', 'M5 5v4h4' ],
		},
		responsive: {
			viewBox: '0 0 24 24',
			paths: [ 'M4 6h16v10H4z', 'M9 20h6', 'M12 16v4' ],
		},
		navigator: {
			viewBox: '0 0 24 24',
			paths: [ 'M5 6h6', 'M9 10h10', 'M13 14h6', 'M9 18h10', 'M5 4v16' ],
		},
		preview: {
			viewBox: '0 0 24 24',
			paths: [ 'M2.5 12s3.6-6 9.5-6s9.5 6 9.5 6-3.6 6-9.5 6-9.5-6-9.5-6z', 'M12 9a3 3 0 1 0 0 6a3 3 0 0 0 0-6z' ],
		},
		search: {
			viewBox: '0 0 24 24',
			paths: [ 'M11 18a7 7 0 1 0 0-14a7 7 0 0 0 0 14z', 'M16 16l4 4' ],
		},
		help: {
			viewBox: '0 0 24 24',
			paths: [ 'M9.2 9a2.8 2.8 0 1 1 4.7 2.1c-.9.8-1.9 1.4-1.9 2.9', 'M12 17.3h.1', 'M12 3.8a8.2 8.2 0 1 0 0 16.4a8.2 8.2 0 0 0 0-16.4z' ],
		},
		close: {
			viewBox: '0 0 24 24',
			paths: [ 'M6 6l12 12', 'M18 6l-12 12' ],
		},
		copy: {
			viewBox: '0 0 24 24',
			paths: [ 'M8 8h11v11H8z', 'M5 16V5h11' ],
		},
		trash: {
			viewBox: '0 0 24 24',
			paths: [ 'M5 7h14', 'M10 11v5', 'M14 11v5', 'M8 7l1-2h6l1 2', 'M7 7l1 13h8l1-13' ],
		},
		expand: {
			viewBox: '0 0 24 24',
			paths: [ 'M8 5H5v3', 'M16 5h3v3', 'M5 16v3h3', 'M19 16v3h-3', 'M5 8l4-4', 'M19 8l-4-4', 'M5 16l4 4', 'M19 16l-4 4' ],
		},
		chevronLeft: {
			viewBox: '0 0 24 24',
			paths: [ 'M14.5 5.5L8 12l6.5 6.5' ],
		},
		chevronRight: {
			viewBox: '0 0 24 24',
			paths: [ 'M9.5 5.5L16 12l-6.5 6.5' ],
		},
		dots: {
			viewBox: '0 0 24 24',
			filled: [ 'M6 12a1.8 1.8 0 1 0 0-3.6a1.8 1.8 0 0 0 0 3.6z', 'M12 12a1.8 1.8 0 1 0 0-3.6a1.8 1.8 0 0 0 0 3.6z', 'M18 12a1.8 1.8 0 1 0 0-3.6a1.8 1.8 0 0 0 0 3.6z' ],
			paths: [],
		},
		desktop: {
			viewBox: '0 0 24 24',
			paths: [ 'M4 6h16v10H4z', 'M9 18h6', 'M12 16v2' ],
		},
		tablet: {
			viewBox: '0 0 24 24',
			paths: [ 'M7 4.5h10a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 18V6A1.5 1.5 0 0 1 7 4.5z', 'M11 17h2' ],
		},
		mobile: {
			viewBox: '0 0 24 24',
			paths: [ 'M8 3.8h8A1.8 1.8 0 0 1 17.8 5.6v12.8A1.8 1.8 0 0 1 16 20.2H8A1.8 1.8 0 0 1 6.2 18.4V5.6A1.8 1.8 0 0 1 8 3.8z', 'M10.5 17.2h3' ],
		},
		component: {
			viewBox: '0 0 24 24',
			paths: [ 'M12 4.5l4 4-4 4-4-4 4-4z', 'M6 11.5l4 4-4 4-4-4 4-4z', 'M18 11.5l4 4-4 4-4-4 4-4z' ],
		},
		assignment: {
			viewBox: '0 0 24 24',
			paths: [ 'M5 6.5h6.5', 'M5 12h14', 'M12.5 17.5H19', 'M4 4h16v16H4z', 'M15 6.5l2 2-2 2' ],
		},
		'document-browser': {
			viewBox: '0 0 24 24',
			paths: [ 'M4 5h16v14H4z', 'M4 8.5h16', 'M7 12h4', 'M7 15h8' ],
		},
		'page-settings': {
			viewBox: '0 0 24 24',
			paths: [ 'M5 4h10l4 4v12H5z', 'M15 4v4h4', 'M8 12h8', 'M8 16h8' ],
		},
		globals: {
			viewBox: '0 0 24 24',
			paths: [ 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16z', 'M4 12h16', 'M12 4c2.5 2.2 4 5.1 4 8s-1.5 5.8-4 8c-2.5-2.2-4-5.1-4-8s1.5-5.8 4-8z' ],
		},
		revision: {
			viewBox: '0 0 24 24',
			paths: [ 'M12 7.5v5l3 1.5', 'M5 12a7 7 0 1 0 2.1-5', 'M5 5v4h4' ],
		},
		'align-left': {
			viewBox: '0 0 24 24',
			paths: [ 'M5 7h14', 'M5 11h10', 'M5 15h14', 'M5 19h9' ],
		},
		'align-center': {
			viewBox: '0 0 24 24',
			paths: [ 'M5 7h14', 'M7 11h10', 'M5 15h14', 'M8 19h8' ],
		},
		'align-right': {
			viewBox: '0 0 24 24',
			paths: [ 'M5 7h14', 'M9 11h10', 'M5 15h14', 'M10 19h9' ],
		},
		'align-justify': {
			viewBox: '0 0 24 24',
			paths: [ 'M5 7h14', 'M5 11h14', 'M5 15h14', 'M5 19h14' ],
		},
		'justify-start': {
			viewBox: '0 0 24 24',
			paths: [ 'M5.5 7v10', 'M18.5 7v10' ],
			filled: [ 'M7 10h2.25v4H7z', 'M10 10h2.25v4H10z', 'M13 10h2.25v4H13z' ],
		},
		'justify-center': {
			viewBox: '0 0 24 24',
			paths: [ 'M5.5 7v10', 'M18.5 7v10' ],
			filled: [ 'M8.5 10h2.25v4H8.5z', 'M11.5 10h2.25v4H11.5z', 'M14.5 10h2.25v4h-2.25z' ],
		},
		'justify-end': {
			viewBox: '0 0 24 24',
			paths: [ 'M5.5 7v10', 'M18.5 7v10' ],
			filled: [ 'M10.5 10h2.25v4H10.5z', 'M13.5 10h2.25v4H13.5z', 'M16.5 10h1.5v4h-1.5z' ],
		},
		'space-between': {
			viewBox: '0 0 24 24',
			paths: [ 'M5.5 7v10', 'M18.5 7v10' ],
			filled: [ 'M6.75 10h2.25v4H6.75z', 'M11 10h2.25v4H11z', 'M15.75 10H18v4h-2.25z' ],
		},
		'space-around': {
			viewBox: '0 0 24 24',
			paths: [ 'M4.75 7v10', 'M19.25 7v10' ],
			filled: [ 'M7 10h2.25v4H7z', 'M11.5 10h2.25v4H11.5z', 'M16 10h2.25v4H16z' ],
		},
		'space-evenly': {
			viewBox: '0 0 24 24',
			paths: [ 'M3.75 7v10', 'M20.25 7v10' ],
			filled: [ 'M6.25 10h2.25v4H6.25z', 'M11.25 10h2.25v4h-2.25z', 'M16.25 10h2.25v4h-2.25z' ],
		},
		'justify-start-horizontal': {
			viewBox: '0 0 24 24',
			paths: [ 'M5.5 7v10', 'M18.5 7v10' ],
			filled: [ 'M7 10h2.25v4H7z', 'M10 10h2.25v4H10z', 'M13 10h2.25v4H13z' ],
		},
		'justify-center-horizontal': {
			viewBox: '0 0 24 24',
			paths: [ 'M5.5 7v10', 'M18.5 7v10' ],
			filled: [ 'M8.5 10h2.25v4H8.5z', 'M11.5 10h2.25v4H11.5z', 'M14.5 10h2.25v4h-2.25z' ],
		},
		'justify-end-horizontal': {
			viewBox: '0 0 24 24',
			paths: [ 'M5.5 7v10', 'M18.5 7v10' ],
			filled: [ 'M10.5 10h2.25v4H10.5z', 'M13.5 10h2.25v4H13.5z', 'M16.5 10h1.5v4h-1.5z' ],
		},
		'space-between-horizontal': {
			viewBox: '0 0 24 24',
			paths: [ 'M5.5 7v10', 'M18.5 7v10' ],
			filled: [ 'M6.75 10h2.25v4H6.75z', 'M11 10h2.25v4H11z', 'M15.75 10H18v4h-2.25z' ],
		},
		'space-around-horizontal': {
			viewBox: '0 0 24 24',
			paths: [ 'M4.75 7v10', 'M19.25 7v10' ],
			filled: [ 'M7 10h2.25v4H7z', 'M11.5 10h2.25v4H11.5z', 'M16 10h2.25v4H16z' ],
		},
		'space-evenly-horizontal': {
			viewBox: '0 0 24 24',
			paths: [ 'M3.75 7v10', 'M20.25 7v10' ],
			filled: [ 'M6.25 10h2.25v4H6.25z', 'M11.25 10h2.25v4h-2.25z', 'M16.25 10h2.25v4h-2.25z' ],
		},
		'justify-start-vertical': {
			viewBox: '0 0 24 24',
			paths: [ 'M7 5.5h10', 'M7 18.5h10' ],
			filled: [ 'M10 7h4v2.25h-4z', 'M10 10h4v2.25h-4z', 'M10 13h4v2.25h-4z' ],
		},
		'justify-center-vertical': {
			viewBox: '0 0 24 24',
			paths: [ 'M7 5.5h10', 'M7 18.5h10' ],
			filled: [ 'M10 8.5h4v2.25h-4z', 'M10 11.5h4v2.25h-4z', 'M10 14.5h4v2.25h-4z' ],
		},
		'justify-end-vertical': {
			viewBox: '0 0 24 24',
			paths: [ 'M7 5.5h10', 'M7 18.5h10' ],
			filled: [ 'M10 10.5h4v2.25h-4z', 'M10 13.5h4v2.25h-4z', 'M10 16.5h4v1.5h-4z' ],
		},
		'space-between-vertical': {
			viewBox: '0 0 24 24',
			paths: [ 'M7 5.5h10', 'M7 18.5h10' ],
			filled: [ 'M10 6.75h4V9h-4z', 'M10 11h4v2.25h-4z', 'M10 15.75h4V18h-4z' ],
		},
		'space-around-vertical': {
			viewBox: '0 0 24 24',
			paths: [ 'M7 4.75h10', 'M7 19.25h10' ],
			filled: [ 'M10 7h4v2.25h-4z', 'M10 11.5h4v2.25h-4z', 'M10 16h4v2.25h-4z' ],
		},
		'space-evenly-vertical': {
			viewBox: '0 0 24 24',
			paths: [ 'M7 3.75h10', 'M7 20.25h10' ],
			filled: [ 'M10 6.25h4v2.25h-4z', 'M10 11.25h4v2.25h-4z', 'M10 16.25h4v2.25h-4z' ],
		},
		'align-top': {
			viewBox: '0 0 24 24',
			paths: [ 'M6 6h12', 'M7 18h10' ],
			filled: [ 'M7 7.5h3v3H7z', 'M10.5 7.5h3v3h-3z', 'M14 7.5h3v3h-3z' ],
		},
		'align-middle': {
			viewBox: '0 0 24 24',
			paths: [ 'M6 6h12', 'M6 12h12', 'M6 18h12' ],
			filled: [ 'M7 10.5h3v3H7z', 'M10.5 10.5h3v3h-3z', 'M14 10.5h3v3h-3z' ],
		},
		'align-bottom': {
			viewBox: '0 0 24 24',
			paths: [ 'M6 6h12', 'M6 18h12' ],
			filled: [ 'M7 13.5h3v3H7z', 'M10.5 13.5h3v3h-3z', 'M14 13.5h3v3h-3z' ],
		},
		'align-stretch': {
			viewBox: '0 0 24 24',
			paths: [ 'M6 6h12', 'M6 18h12' ],
			filled: [ 'M7 7.5h3v9H7z', 'M10.5 7.5h3v9h-3z', 'M14 7.5h3v9h-3z' ],
		},
		'items-start': {
			viewBox: '0 0 24 24',
			paths: [ 'M6 6h12', 'M6 18h12' ],
			filled: [ 'M7 7.5h3v3H7z', 'M10.5 7.5h3v3h-3z', 'M14 7.5h3v3h-3z' ],
		},
		'items-center': {
			viewBox: '0 0 24 24',
			paths: [ 'M6 6h12', 'M6 12h12', 'M6 18h12' ],
			filled: [ 'M7 10.5h3v3H7z', 'M10.5 10.5h3v3h-3z', 'M14 10.5h3v3h-3z' ],
		},
		'items-end': {
			viewBox: '0 0 24 24',
			paths: [ 'M6 6h12', 'M6 18h12' ],
			filled: [ 'M7 13.5h3v3H7z', 'M10.5 13.5h3v3h-3z', 'M14 13.5h3v3h-3z' ],
		},
		'items-stretch': {
			viewBox: '0 0 24 24',
			paths: [ 'M6 6h12', 'M6 18h12' ],
			filled: [ 'M7 7.5h3v9H7z', 'M10.5 7.5h3v9h-3z', 'M14 7.5h3v9h-3z' ],
		},
		'items-start-horizontal': {
			viewBox: '0 0 24 24',
			paths: [ 'M6 6v12', 'M18 6v12' ],
			filled: [ 'M7.5 7h3v3h-3z', 'M7.5 10.5h3v3h-3z', 'M7.5 14h3v3h-3z' ],
		},
		'items-center-horizontal': {
			viewBox: '0 0 24 24',
			paths: [ 'M6 6v12', 'M12 6v12', 'M18 6v12' ],
			filled: [ 'M10.5 7h3v3h-3z', 'M10.5 10.5h3v3h-3z', 'M10.5 14h3v3h-3z' ],
		},
		'items-end-horizontal': {
			viewBox: '0 0 24 24',
			paths: [ 'M6 6v12', 'M18 6v12' ],
			filled: [ 'M13.5 7h3v3h-3z', 'M13.5 10.5h3v3h-3z', 'M13.5 14h3v3h-3z' ],
		},
		'items-stretch-horizontal': {
			viewBox: '0 0 24 24',
			paths: [ 'M6 6v12', 'M18 6v12' ],
			filled: [ 'M7.5 7h9v3h-9z', 'M7.5 10.5h9v3h-9z', 'M7.5 14h9v3h-9z' ],
		},
		'items-start-vertical': {
			viewBox: '0 0 24 24',
			paths: [ 'M6 6h12', 'M6 18h12' ],
			filled: [ 'M7 7.5h3v3H7z', 'M10.5 7.5h3v3h-3z', 'M14 7.5h3v3h-3z' ],
		},
		'items-center-vertical': {
			viewBox: '0 0 24 24',
			paths: [ 'M6 6h12', 'M6 12h12', 'M6 18h12' ],
			filled: [ 'M7 10.5h3v3H7z', 'M10.5 10.5h3v3h-3z', 'M14 10.5h3v3h-3z' ],
		},
		'items-end-vertical': {
			viewBox: '0 0 24 24',
			paths: [ 'M6 6h12', 'M6 18h12' ],
			filled: [ 'M7 13.5h3v3H7z', 'M10.5 13.5h3v3h-3z', 'M14 13.5h3v3h-3z' ],
		},
		'items-stretch-vertical': {
			viewBox: '0 0 24 24',
			paths: [ 'M6 6h12', 'M6 18h12' ],
			filled: [ 'M7 7.5h3v9H7z', 'M10.5 7.5h3v9h-3z', 'M14 7.5h3v9h-3z' ],
		},
		'arrow-up': {
			viewBox: '0 0 24 24',
			paths: [ 'M12 18V6', 'M7 11l5-5l5 5' ],
		},
		'arrow-down': {
			viewBox: '0 0 24 24',
			paths: [ 'M12 6v12', 'M7 13l5 5l5-5' ],
		},
		block: {
			viewBox: '0 0 24 24',
			paths: [ 'M5 7h14v10H5z' ],
		},
		flex: {
			viewBox: '0 0 24 24',
			paths: [ 'M5 7.5h14', 'M5 16.5h14' ],
			filled: [ 'M7 9h3v6H7z', 'M11 9h3v6h-3z', 'M15 9h3v6h-3z' ],
		},
		grid: {
			viewBox: '0 0 24 24',
			paths: [ 'M5 5.5h14v13H5z', 'M12 5.5v13', 'M5 12h14' ],
			filled: [],
		},
		'flex-row': {
			viewBox: '0 0 24 24',
			paths: [ 'M5 12h11', 'M13 9l3 3-3 3' ],
			filled: [ 'M6 8.5h2.5v2.5H6z', 'M9.5 8.5H12v2.5H9.5z', 'M13 8.5h2.5v2.5H13z' ],
		},
		'flex-row-reverse': {
			viewBox: '0 0 24 24',
			paths: [ 'M19 12H8', 'M11 9l-3 3 3 3' ],
			filled: [ 'M15.5 8.5H18v2.5h-2.5z', 'M12 8.5h2.5v2.5H12z', 'M8.5 8.5H11v2.5H8.5z' ],
		},
		'flex-column': {
			viewBox: '0 0 24 24',
			paths: [ 'M12 5v11', 'M9 13l3 3 3-3' ],
			filled: [ 'M8.5 6h2.5v2.5H8.5z', 'M8.5 9.5h2.5V12H8.5z', 'M8.5 13h2.5v2.5H8.5z' ],
		},
		'flex-column-reverse': {
			viewBox: '0 0 24 24',
			paths: [ 'M12 19V8', 'M9 11l3-3 3 3' ],
			filled: [ 'M8.5 15.5h2.5V18H8.5z', 'M8.5 12h2.5v2.5H8.5z', 'M8.5 8.5h2.5V11H8.5z' ],
		},
		wrap: {
			viewBox: '0 0 24 24',
			paths: [ 'M5 8h10', 'M15 8l3 3-3 3', 'M5 16h6', 'M11 16l3-3-3-3' ],
		},
		'wrap-reverse': {
			viewBox: '0 0 24 24',
			paths: [ 'M5 8h6', 'M11 8l3-3', 'M11 8l3 3', 'M5 16h10', 'M15 16l3 3-3 3' ],
		},
		nowrap: {
			viewBox: '0 0 24 24',
			paths: [ 'M5 12h14', 'M16 9l3 3-3 3' ],
		},
	};

	export let name: string = 'elements';
	export let size = 16;
	export let title: string | undefined = undefined;

	$: icon = icons[ name ] ?? icons.elements;
</script>

<svg
	width={size}
	height={size}
	viewBox={icon.viewBox}
	fill="none"
	stroke="currentColor"
	stroke-width="1.7"
	stroke-linecap="round"
	stroke-linejoin="round"
	role={title ? 'img' : 'presentation'}
	aria-hidden={title ? undefined : 'true'}
>
	{#if title}
		<title>{title}</title>
	{/if}

	{#each icon.filled ?? [] as path (path)}
		<path d={path} fill="currentColor" stroke="none" />
	{/each}

	{#each icon.paths as path (path)}
		<path d={path} />
	{/each}
</svg>
