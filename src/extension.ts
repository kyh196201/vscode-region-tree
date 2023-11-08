import * as vscode from 'vscode';
import TreeDataProvider from './treeDataProvider';

/**
 * vscodeRegionToc 설정에서 주어진 키에 대한 설정값을 가져옵니다.
 *
 * @param key 설정의 키 값입니다.
 * @param defaultValue 설정값이 없을 경우 반환될 기본 값입니다.
 * @returns 설정값을 반환합니다.
 */
const getConfigurationValue = <T>(key: string, defaultValue: T): T => {
	const config = vscode.workspace.getConfiguration('vscodeRegionToc');
	return config.get<T>(key, defaultValue);
};

export function activate(context: vscode.ExtensionContext) {
	const treeDataProvider = new TreeDataProvider();

	vscode.window.createTreeView('regionsToc', {
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
					'vscode-region-toc.reveal',
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
		'vscode-region-toc.refresh',
		() => {
			treeDataProvider.refresh();
		},
	);

	// reveal 커맨드 등록
	const revealCommand = vscode.commands.registerCommand(
		'vscode-region-toc.reveal',
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

	context.subscriptions.push(refreshCommand, revealCommand);

	vscode.window.showInformationMessage(
		'🎉 Vscode Region Toc 확장이 준비되었습니다. 🎉',
	);
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() {}
