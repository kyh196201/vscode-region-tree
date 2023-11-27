interface Markers {
	[key: string]: {
		startRegex: string;
		endRegex: string;
		start: string;
		end: string;
	};
}

export default {
	javascript: {
		startRegex: '^\\s*//\\s*#?region\\b(?<name>.*)',
		endRegex: '^\\s*//\\s*#?endregion\\b',
		start: '// #region [NAME]',
		end: '// #endregion',
	},

	typescript: {
		startRegex: '^\\s*//\\s*#?region\\b(?<name>.*)',
		endRegex: '^\\s*//\\s*#?endregion\\b',
		start: '// #region [NAME]',
		end: '// #endregion',
	},

	html: {
		startRegex: '^\\s*<!--\\s*#region\\b(?<name>.*)-->',
		endRegex: '^\\s*<!--\\s*#endregion\\b.*-->',
		start: '<!-- #region [NAME] -->',
		end: '<!-- #endregion -->',
	},

	scss: {
		startRegex:
			'^\\s*(\\/\\*\\s*#region\\b(?<name>.*)\\s*\\*\\/|//\\s*#region\\b(?<nameAlt>.*))',
		endRegex: '^\\s*(\\/\\*\\s*#endregion\\b.*\\*\\/|//\\s*#endregion\\b)',
		start: '/* #region [NAME] */',
		end: '/* #endregion */',
	},

	css: {
		startRegex: '^\\s*\\/\\*\\s*#region\\b(?<name>.*)\\s*\\*\\/',
		endRegex: '^\\s*\\/\\*\\s*#endregion\\b.*\\*\\/',
		start: '/* #region [NAME] */',
		end: '/* #endregion */',
	},

	vue: {
		startRegex:
			'^\\s*//\\s*#?region\\b(?<name>.*)|\\s*<!--\\s*#region\\b(?<nameAlt>.*)-->',
		endRegex: '^\\s*//\\s*#?endregion\\b|\\s*<!--\\s*#endregion\\b.*-->',
		start: '<!-- #region [NAME] -->',
		end: '<!-- #endregion -->',
	},

	markdown: {
		startRegex: '^\\s*<!--\\s*#?region\\b(?<name>.*)-->',
		endRegex: '^\\s*<!--\\s*#?endregion\\b.*-->',
		start: '<!-- #region [NAME] -->',
		end: '<!-- #endregion -->',
	},

	php: {
		startRegex: '^\\s*(#|//)region\\b(?<name>.*)',
		endRegex: '^\\s*(#|//)endregion\\b',
		start: '/* #region [NAME] */',
		end: '/* #endregion */',
	},
} as Markers;
