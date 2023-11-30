import * as vscode from 'vscode';
import TreeDataProvider from './treeDataProvider';
import markers from './markers';

/**
 * vscodeRegionTree 설정에서 주어진 키에 대한 설정값을 가져옵니다.
 *
 * @param key 설정의 키 값입니다.
 * @param defaultValue 설정값이 없을 경우 반환될 기본 값입니다.
 * @returns 설정값을 반환합니다.
 */
const getConfigurationValue = <T>(key: string, defaultValue: T): T => {
	const config = vscode.workspace.getConfiguration('vscodeRegionTree');
	return config.get<T>(key, defaultValue);
};

export function activate(context: vscode.ExtensionContext) {
	const treeDataProvider = new TreeDataProvider();

	vscode.window.createTreeView('regionTree', {
		treeDataProvider,
		showCollapseAll: true,
	});

	vscode.window.onDidChangeActiveTextEditor(() => {
		treeDataProvider.refresh();
	});

	vscode.workspace.onDidChangeTextDocument(event => {
		if (event.document === vscode.window.activeTextEditor?.document) {
			treeDataProvider.refresh();
		}
	});

	vscode.workspace.onWillSaveTextDocument(event => {
		const documentContent = event.document.getText();

		const lines = treeDataProvider.findMismatchedRegions(documentContent);

		if (lines.length) {
			const jumpToMismatchedRegionEnabled =
				getConfigurationValue<boolean>(
					'enableJumpToMismatchedRegion',
					false,
				);

			let message = '⚠️ Region의 시작과 끝의 개수가 일치하지 않습니다.';
			if (jumpToMismatchedRegionEnabled) {
				message +=
					'\n해당 라인의 region 또는 endregion을 제거해주세요.';
			}

			vscode.window.showErrorMessage(message);

			if (jumpToMismatchedRegionEnabled) {
				vscode.commands.executeCommand(
					'vscode-region-tree.reveal',
					lines[0],
				);
			}

			setTimeout(() => {
				vscode.window.showErrorMessage('');
			}, 3000);
		}
	});

	// 최초 포커스된 편집기가 있을 경우
	const activeEditor = vscode.window.activeTextEditor;
	if (activeEditor) {
		treeDataProvider.refresh();
	}

	// refresh 커맨드 등록
	const refreshCommand = vscode.commands.registerCommand(
		'vscode-region-tree.refresh',
		() => {
			treeDataProvider.refresh();
		},
	);

	// reveal 커맨드 등록
	const revealCommand = vscode.commands.registerCommand(
		'vscode-region-tree.reveal',
		(line: number) => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				return;
			}

			const pos = new vscode.Position(line, 0);

			editor.selection = new vscode.Selection(pos, pos);

			editor.revealRange(
				editor.selection,
				vscode.TextEditorRevealType.InCenter,
			);
		},
	);

	const regionCommand = vscode.commands.registerCommand(
		'vscode-region-tree.wrapWithRegion',
		() => {
			// https://github.com/maptz/maptz.vscode.extensions.customfolding/blob/master/src/engine/RegionWrapper.ts#L19
			const ate = vscode.window.activeTextEditor;
			if (!ate) {
				return;
			}

			const document = ate.document;
			if (!document) {
				return;
			}

			const { languageId } = document;
			if (!languageId) {
				return;
			}

			if (ate.selections.length > 1 || ate.selections.length < 1) {
				return;
			}

			const sel = ate.selection;
			if (sel.isEmpty) {
				return;
			}

			const linePrefix = ate.document.getText(
				new vscode.Range(
					new vscode.Position(sel.start.line, 0),
					sel.start,
				),
			);

			const getEOLStr = (eol: vscode.EndOfLine) => {
				if (eol === vscode.EndOfLine.CRLF) {
					return '\r\n';
				}

				return '\n';
			};

			let addPrefix = '';
			if (/^\s+$/.test(linePrefix)) {
				addPrefix = linePrefix;
			}
			const eol = getEOLStr(ate.document.eol);
			const currentLanguageConfig = markers[languageId];

			const regionStartTemplate = currentLanguageConfig.start;
			const idx = regionStartTemplate.indexOf('[NAME]');
			const nameInsertionIndex =
				idx < 0
					? 0
					: regionStartTemplate.length - '[NAME]'.length - idx;
			const regionStartText = regionStartTemplate.replace('[NAME]', '');

			ate.edit(edit => {
				edit.insert(
					sel.end,
					eol + addPrefix + currentLanguageConfig.end,
				);
				edit.insert(sel.start, regionStartText + eol + addPrefix);
			}).then(() => {
				if (!ate) {
					return;
				}

				const sel = ate.selection;
				const newLine = sel.start.line - 1;
				const newChar =
					ate.document.lineAt(newLine).text.length -
					nameInsertionIndex;
				const newStart = sel.start.translate(
					newLine - sel.start.line,
					newChar - sel.start.character,
				);
				const newSelection = new vscode.Selection(newStart, newStart);
				ate.selections = [newSelection];

				vscode.commands.executeCommand(
					'editor.action.formatDocument',
					'editorHasDocumentFormattingProvider && editorTextFocus',
					true,
				);
			});
		},
	);

	context.subscriptions.push(refreshCommand, revealCommand, regionCommand);

	vscode.window.showInformationMessage(
		'🎉 Vscode Region Tree 확장이 준비되었습니다. 🎉',
	);
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() {}
