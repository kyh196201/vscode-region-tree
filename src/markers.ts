interface Markers {
	[key: string]: {
		start: string;
		end: string;
	};
}

export default {
	javascript: {
		start: '^\\s*//\\s*#?region\\b(?<name>.*)',
		end: '^\\s*//\\s*#?endregion\\b',
	},

	typescript: {
		start: '^\\s*//\\s*#?region\\b(?<name>.*)',
		end: '^\\s*//\\s*#?endregion\\b',
	},

	html: {
		start: '^\\s*<!--\\s*#region\\b(?<name>.*)-->',
		end: '^\\s*<!--\\s*#endregion\\b.*-->',
	},

	scss: {
		start: '^\\s*\\/\\*\\s*#region\\b(?<name>.*)\\s*\\*\\/',
		end: '^\\s*\\/\\*\\s*#endregion\\b.*\\*\\/',
	},

	css: {
		start: '^\\s*\\/\\*\\s*#region\\b(?<name>.*)\\s*\\*\\/',
		end: '^\\s*\\/\\*\\s*#endregion\\b.*\\*\\/',
	},

	markdown: {
		start: '^\\s*<!--\\s*#?region\\b(?<name>.*)-->',
		end: '^\\s*<!--\\s*#?endregion\\b.*-->',
	},
	php: {
		start: '^\\s*(#|//)region\\b(?<name>.*)',
		end: '^\\s*(#|//)endregion\\b',
	},
} as Markers;
