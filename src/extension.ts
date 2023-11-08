import * as vscode from 'vscode';
import markers from './markers';

class TreeNode extends vscode.TreeItem {
	children?: TreeNode[];
	line?: number;

	constructor(
		public readonly label: string,
		line?: number,
	) {
		super(label, vscode.TreeItemCollapsibleState.None);
		this.tooltip = this.label;
		this.line = line;

		// line이 있을 경우 command 등록
		// command를 실행하기 위해서 context.subscriptions에 push하고,
		// package.json에 해당 command를 등록해야함
		// ref: https://github.com/berabue/vscode-region-viewer/blob/master/src/regionTreeDataProvider.ts#L139
		if (line) {
			this.command = {
				title: '',
				command: 'vscode-region-toc.reveal',
				arguments: [line],
			};
		}
	}

	addChildren(...children: TreeNode[]): void {
		if (!this.children) {
			this.children = [];
		}

		this.children.push(...children);
	}

	getChildren(): TreeNode[] | undefined {
		return this.children;
	}
}

const getEditorContent = (): string => {
	const editor = vscode.window.activeTextEditor;

	if (!editor) {
		return '';
	}

	return editor.document.getText();
};

// region의 시작 개수와 끝의 개수가 일치하지 않을 경우
const checkRegionMatching = (
	content: string,
): { isValid: boolean; line?: number } => {
	const lines = content.split(/\r?\n/);
	const stack: number[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		const regionMatch = line.match(/#region\s+(.*?)(\s*\*\/|\s*-->|\s*)$/i);
		const endregionMatch = line.match(/#endregion/);

		if (regionMatch) {
			stack.push(i);
		} else if (endregionMatch) {
			// 1. #endregion이 더 많을 경우
			if (!stack.length) {
				return { isValid: false, line: i };
			}

			stack.pop();
		}
	}

	// 2. #region이 더 많을 경우
	if (stack.length) {
		const line = stack.pop();
		return { isValid: false, line };
	}

	return { isValid: true };
};

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

class TreeDataProvider implements vscode.TreeDataProvider<TreeNode> {
	private _onDidChangeTreeData: vscode.EventEmitter<
		TreeNode | undefined | void
	> = new vscode.EventEmitter<TreeNode | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<TreeNode | undefined | void> =
		this._onDidChangeTreeData.event;
	private data: TreeNode[] = [];

	constructor() {
		this.findRegions();
	}

	private getEmptyTreeData() {
		return [new TreeNode('No regions detected')];
	}

	private getLabel(input: string, match: RegExpExecArray | null): string {
		if (match && match.groups) {
			const groupIDs = ['name', 'nameAlt'];

			// Look into capture groups
			for (const groupID of groupIDs) {
				if (
					groupID in match.groups &&
					match.groups[groupID] !== undefined
				) {
					const name = match.groups[groupID].trim();
					if (name.length > 0) return name;
				}
			}

			// Empty region name
			return '# region';
		} else {
			// Regex error or no groups found
			return input;
		}
	}

	// ref: https://github.com/JunTaeHahm/region-tree-view/blob/main/extension.js#LL87C27-L87C27
	getTreeData(content: string): TreeNode[] {
		const document = vscode.window.activeTextEditor?.document;
		if (!document) {
			return this.getEmptyTreeData();
		}

		const { languageId } = document;

		if (languageId in markers) {
			const treeData: TreeNode[] = [];
			const stack: { node: TreeNode; counter: number }[] = [];
			const lines = content.split(/\r?\n/);
			let globalCounter = 0; // 최상위 region 카운팅 용

			const marker = markers[languageId];
			const startRegExp = new RegExp(marker.start);
			const endRegExp = new RegExp(marker.end);
			const isRegionStart = (t: string) => startRegExp.test(t);
			const isRegionEnd = (t: string) => endRegExp.test(t);

			lines.forEach((line, lineIndex) => {
				if (isRegionStart(line)) {
					const regexResult = startRegExp.exec(line);
					const label = this.getLabel(line, regexResult);

					// region 넘버링
					const labelWithNumber =
						stack.length === 0
							? `${++globalCounter}. ${label}`
							: `${
									stack[stack.length - 1].node.label.split(
										'.',
									)[0]
							  }-${++stack[stack.length - 1].counter}. ${label}`;

					const treeNode = new TreeNode(labelWithNumber, lineIndex);

					// If we have a parent, register as their child
					if (stack.length > 0) {
						const parent = stack[stack.length - 1].node;
						parent.addChildren(treeNode);

						// 자식 노드가 생길 경우 collapsibleState 업데이트 (Expanded로 변경)
						parent.collapsibleState =
							vscode.TreeItemCollapsibleState.Expanded;
					}

					stack.push({ node: treeNode, counter: 0 });
				} else if (isRegionEnd(line)) {
					// If we just ended a root region, add it to treeRoot
					if (stack.length === 1) {
						treeData.push(stack[0].node);
					}

					stack.pop();
				}
			});

			// If the region stack isn't empty, we didn't properly close all regions
			if (stack.length > 0) {
				treeData.push(stack[0].node);
			}

			return treeData.length ? treeData : this.getEmptyTreeData();
		}

		return this.getEmptyTreeData();
	}

	findRegions() {
		const content = getEditorContent();
		this.data = this.getTreeData(content);
	}

	getTreeItem(element: TreeNode): vscode.TreeItem {
		return element;
	}

	getChildren(element?: TreeNode): vscode.ProviderResult<TreeNode[]> {
		if (element) {
			return element.getChildren();
		}

		// 저장된 this.data를 반환
		return this.data;
	}

	async refresh(): Promise<void> {
		this.findRegions();
		this._onDidChangeTreeData.fire();
	}
}

export function activate(context: vscode.ExtensionContext) {
	const treeDataProvider = new TreeDataProvider();

	vscode.window.createTreeView('regionsToc', {
		treeDataProvider,
		showCollapseAll: true,
	});

	vscode.window.onDidChangeActiveTextEditor(() => {
		treeDataProvider.refresh();
	});

	vscode.workspace.onWillSaveTextDocument(event => {
		const documentContent = event.document.getText();

		const { isValid, line } = checkRegionMatching(documentContent);

		if (!isValid && line !== undefined) {
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
					line,
				);
			}

			setTimeout(() => {
				vscode.window.showErrorMessage('');
			}, 3000);
		}
	});

	vscode.workspace.onDidChangeTextDocument(event => {
		if (event.document === vscode.window.activeTextEditor?.document) {
			treeDataProvider.refresh();
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
